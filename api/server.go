package api

import (
	"crypto/tls"
	"encoding/pem"
	"fmt"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"
	"sync"

	"github.com/charmbracelet/log"
	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-go/api/controllers"
	"github.com/moyoez/localsend-go/api/middlewares"
	"github.com/moyoez/localsend-go/api/models"
	"github.com/moyoez/localsend-go/notify"
	"github.com/moyoez/localsend-go/tool"
	"github.com/moyoez/localsend-go/types"
)

// Server represents the HTTP API server for receiving TCP API requests
type Server struct {
	port       int
	protocol   string
	engine     *gin.Engine
	server     *http.Server
	configPath string // path to config file for TLS cert storage
	mu         sync.RWMutex
}

var (
	DefaultConfigPath = "config.yaml"
	WebOutPath        = "web/out"
	// embeddedWebFS is set by main when web/out is embedded at build time
	embeddedWebFS fs.FS
)

// SetDoNotMakeSessionFolder sets whether to skip session subfolder and use numbered filenames when same name exists.
func SetDoNotMakeSessionFolder(v bool) {
	models.SetDoNotMakeSessionFolder(v)
}

// SetDefaultWebOutPath sets the default web out path for both api and models packages
func SetDefaultWebOutPath(path string) {
	if path != "" {
		WebOutPath = path
	}
}

// SetEmbeddedWebFS sets the embedded FS for web UI (root = content of web/out). Used when building with embed.
func SetEmbeddedWebFS(f fs.FS) {
	embeddedWebFS = f
}

// embeddedPathExists returns true if name exists as file or as dir (with index.html) in the FS.
func embeddedPathExists(f fs.FS, name string) bool {
	if name == "" || name == "." {
		_, err := fs.Stat(f, "index.html")
		return err == nil
	}
	name = strings.TrimPrefix(name, "/")
	_, err := fs.Stat(f, name)
	if err == nil {
		return true
	}
	_, err = fs.Stat(f, name+"/index.html")
	return err == nil
}

// SetSelfDevice sets the local device info used for user-side scanning.
func SetSelfDevice(device *types.VersionMessage) {
	models.SetSelfDevice(device)
}

// SetDefaultUploadFolder sets the default upload folder (used by main for flag override).
func SetDefaultUploadFolder(folder string) {
	models.SetDefaultUploadFolder(folder)
}

// NewServerWithConfig creates a new API server instance with custom config path
func NewServerWithConfig(port int, protocol string, configPath string) *Server {
	if configPath == "" {
		configPath = DefaultConfigPath
	}
	return &Server{
		port:       port,
		protocol:   protocol,
		configPath: configPath,
	}
}

func (s *Server) setupRoutes() *gin.Engine {
	if tool.DefaultLogger.GetLevel() == log.DebugLevel {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}
	engine := gin.Default()
	engine.Use(middlewares.AllowAllCORS())
	engine.Use(gin.Recovery())

	// Initialize controllers
	registerCtrl := controllers.NewRegisterController()
	uploadCtrl := controllers.NewUploadController()
	cancelCtrl := controllers.NewCancelController()

	// Register API endpoints first so /api takes precedence
	v2 := engine.Group("/api/localsend/v2")
	{
		v2.GET("/info", controllers.HandleLocalsendV2InfoGet)
		v2.POST("/register", registerCtrl.HandleRegister)
		v2.POST("/prepare-upload", uploadCtrl.HandlePrepareUpload)
		v2.POST("/upload", uploadCtrl.HandleUpload)
		v2.POST("/cancel", cancelCtrl.HandleCancel)
		// Download API (LocalSend protocol Section 5)
		if selfDevice := models.GetSelfDevice(); selfDevice != nil && selfDevice.Download {
			v2.GET("/prepare-download", controllers.HandlePrepareDownload)
			v2.GET("/download", controllers.HandleDownload)
		}
	}
	// V1 Is Deprecated, but due to some reasons, I support to this ONLY ACCEPT REQUESTS.
	v1 := engine.Group("/api/localsend/v1")
	{
		// no register, register use v2 pls.
		v1.GET("/info", controllers.HandleLocalsendV1InfoGet)
		// DO NOT use PIN, it will be rejected when no pin provided.
		v1.POST("/send-request", uploadCtrl.HandlePrepareV1Upload)
		v1.POST("/send", uploadCtrl.HandleUploadV1Upload)
		v1.POST("/cancel", cancelCtrl.HandleCancelV1Cancel)
	}
	self := engine.Group("/api/self/v1", middlewares.OnlyAllowLocal)
	{
		self.GET("/get-network-info", controllers.UserGetNetworkInfo)           // Get local network info with IP and segment number
		self.GET("/scan-current", controllers.UserScanCurrent)                  // Get current scanned devices
		self.GET("/scan-now", controllers.UserScanNow)                          // Trigger immediate scan based on current config
		self.POST("/prepare-upload", controllers.UserPrepareUpload)             // Prepare upload endpoint
		self.POST("/upload", controllers.UserUpload)                            // Actual upload endpoint
		self.POST("/upload-batch", controllers.UserUploadBatch)                 // Batch upload endpoint (supports file:/// protocol)
		self.GET("/confirm-recv", controllers.UserConfirmRecv)                  // Confirm recv endpoint
		self.GET("/text-received-dismiss", controllers.UserTextReceivedDismiss) // Text received modal dismiss
		self.GET("/confirm-download", controllers.UserConfirmDownload)          // Confirm download endpoint
		self.POST("/cancel", controllers.UserCancelUpload)                      // Cancel upload endpoint (sender side)
		self.GET("/get-image", controllers.UserGetImage)
		self.GET("/favorites", controllers.UserFavoritesList)                     // List favorite devices
		self.POST("/favorites", controllers.UserFavoritesAdd)                     // Add a favorite device
		self.DELETE("/favorites/:fingerprint", controllers.UserFavoritesDelete)   // Remove a favorite device
		self.GET("/get-network-interfaces", controllers.UserGetNetworkInterfaces) // Get network interfaces,used same as usergetNetwork Info
		self.POST("/create-share-session", controllers.UserCreateShareSession)    // Create share session for download API
		self.DELETE("/close-share-session", controllers.UserCloseShareSession)    // Close share session
		self.GET("/create-qr-code", controllers.GenerateQRCode)                   // QR code PNG (same params as api.qrserver.com)
		self.GET("/get-user-screenshot", controllers.GetUserScreenShot)           // made screenshot in frontend.
		self.GET("/status", controllers.UserStatus)                               // Running and notify_ws_enabled for web UI
		if hub := models.GetNotifyHub(); notify.NotifyWSEnabled() && hub != nil {
			self.GET("/notify-ws", controllers.HandleNotifyWS(hub))
		}
		self.GET("/config", controllers.UserConfigGet)
		self.PATCH("/config", controllers.UserConfigPatch)
	}

	// Serve embedded Next.js static export. For app routes (/manage, /manage/settings, etc.) serve index.html
	// directly so no 301 redirect happens when opening the link directly.
	if selfDevice := models.GetSelfDevice(); selfDevice != nil && selfDevice.Download && embeddedWebFS != nil {
		fileServer := http.FileServer(http.FS(embeddedWebFS))
		engine.NoRoute(gin.WrapF(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/")

			// Clean the path
			if path == "" {
				path = "index.html"
			}

			// Check if it's a static file (has extension like .js, .css, .png, etc.)
			// Static assets should be served directly if they exist
			if ext := filepath.Ext(path); ext != "" && ext != ".html" {
				if embeddedPathExists(embeddedWebFS, path) {
					fileServer.ServeHTTP(w, r)
					return
				}
				// Static asset not found
				http.NotFound(w, r)
				return
			}

			// For HTML routes (/manage, /manage/settings, etc.), always serve index.html
			// Let the Next.js SPA handle client-side routing
			data, err := fs.ReadFile(embeddedWebFS, "index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(data)
		}))
		tool.DefaultLogger.Infof("[Server] Serving download page from embedded files")
	}

	return engine
}

// Start starts the HTTP server
func (s *Server) Start() error {
	engine := s.setupRoutes()

	s.mu.Lock()
	s.engine = engine
	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: engine,
	}
	s.mu.Unlock()

	address := fmt.Sprintf("%s://0.0.0.0:%d", s.protocol, s.port)
	tool.DefaultLogger.Infof("Starting API server on %s", address)

	if s.protocol == "https" {
		// Get or create TLS certificate from config
		cfg := tool.GetCurrentConfig()
		certBytes, keyBytes, err := tool.GetOrCreateTLSCertFromConfig(cfg)
		if err != nil {
			return fmt.Errorf("failed to get TLS certificate: %v", err)
		}

		// Convert DER format to PEM format
		certPEM := pem.EncodeToMemory(&pem.Block{
			Type:  "CERTIFICATE",
			Bytes: certBytes,
		})

		keyPEM := pem.EncodeToMemory(&pem.Block{
			Type:  "EC PRIVATE KEY",
			Bytes: keyBytes,
		})

		// Load certificate and key for TLS
		cert, err := tls.X509KeyPair(certPEM, keyPEM)
		if err != nil {
			return fmt.Errorf("failed to load TLS certificate: %v", err)
		}

		// Configure TLS
		s.mu.Lock()
		s.server.TLSConfig = &tls.Config{
			Certificates: []tls.Certificate{cert},
		}
		s.mu.Unlock()

		tool.DefaultLogger.Infof("TLS certificate configured for HTTPS")
		return s.server.ListenAndServeTLS("", "")
	}

	return s.server.ListenAndServe()
}
