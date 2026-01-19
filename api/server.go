package api

import (
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/charmbracelet/log"
	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-base-protocol-golang/boardcast"
	"github.com/moyoez/localsend-base-protocol-golang/tool"
	"github.com/moyoez/localsend-base-protocol-golang/types"
)

// Server represents the HTTP API server for receiving TCP API requests
type Server struct {
	port     int
	protocol string
	handler  *Handler
	engine   *gin.Engine
	server   *http.Server
	mu       sync.RWMutex
}

// Handler contains callback functions for handling API requests
type Handler struct {
	OnRegister      func(remote *types.VersionMessage) error
	OnPrepareUpload func(request *types.PrepareUploadRequest, pin string) (*types.PrepareUploadResponse, error)
	OnUpload        func(sessionId, fileId, token string, data io.Reader, remoteAddr string) error
	OnCancel        func(sessionId string) error
}

var (
	uploadSessionMu     sync.RWMutex
	DefaultUploadFolder = "uploads"
	uploadSessions      = map[string]map[string]types.FileInfo{}
	uploadValidated     = map[string]bool{}

	selfDeviceMu sync.RWMutex
	selfDevice   *types.VersionMessage

	deviceCacheMu sync.RWMutex
	deviceCache   = map[string]discoveredDevice{}
)

type discoveredDevice struct {
	info     types.VersionMessage
	address  string
	lastSeen time.Time
}

func cacheUploadSession(sessionId string, files map[string]types.FileInfo) {
	uploadSessionMu.Lock()
	defer uploadSessionMu.Unlock()
	copied := make(map[string]types.FileInfo, len(files))
	for fileId, info := range files {
		copied[fileId] = info
	}
	uploadSessions[sessionId] = copied
}

func lookupFileInfo(sessionId, fileId string) (types.FileInfo, bool) {
	uploadSessionMu.RLock()
	defer uploadSessionMu.RUnlock()
	files, ok := uploadSessions[sessionId]
	if !ok {
		return types.FileInfo{}, false
	}
	info, exists := files[fileId]
	return info, exists
}

func removeUploadedFile(sessionId, fileId string) {
	uploadSessionMu.Lock()
	defer uploadSessionMu.Unlock()
	files, ok := uploadSessions[sessionId]
	if !ok {
		return
	}
	delete(files, fileId)
	if len(files) == 0 {
		delete(uploadSessions, sessionId)
	}
}

func removeUploadSession(sessionId string) {
	uploadSessionMu.Lock()
	defer uploadSessionMu.Unlock()
	delete(uploadSessions, sessionId)
	delete(uploadValidated, sessionId)
}

func isSessionValidated(sessionId string) bool {
	uploadSessionMu.RLock()
	defer uploadSessionMu.RUnlock()
	return uploadValidated[sessionId]
}

func markSessionValidated(sessionId string) {
	uploadSessionMu.Lock()
	defer uploadSessionMu.Unlock()
	uploadValidated[sessionId] = true
}

// SetSelfDevice sets the local device info used for user-side scanning.
func SetSelfDevice(device *types.VersionMessage) {
	selfDeviceMu.Lock()
	defer selfDeviceMu.Unlock()
	selfDevice = device
}

func getSelfDevice() *types.VersionMessage {
	selfDeviceMu.RLock()
	defer selfDeviceMu.RUnlock()
	if selfDevice == nil {
		return nil
	}
	copied := *selfDevice
	return &copied
}

func deviceCacheKey(info *types.VersionMessage, address string) string {
	if info == nil {
		return ""
	}
	if info.Fingerprint != "" {
		return info.Fingerprint
	}
	return fmt.Sprintf("%s|%s|%d", address, info.Alias, info.Port)
}

func cacheDiscoveredDevice(info *types.VersionMessage, address string) {
	if info == nil {
		return
	}
	key := deviceCacheKey(info, address)
	if key == "" {
		return
	}
	deviceCacheMu.Lock()
	defer deviceCacheMu.Unlock()
	deviceCache[key] = discoveredDevice{
		info:     *info,
		address:  address,
		lastSeen: time.Now(),
	}
}

func listRecentDevices(since time.Time) []discoveredDevice {
	deviceCacheMu.RLock()
	defer deviceCacheMu.RUnlock()
	devices := make([]discoveredDevice, 0, len(deviceCache))
	for _, device := range deviceCache {
		if device.lastSeen.After(since) || device.lastSeen.Equal(since) {
			devices = append(devices, device)
		}
	}
	return devices
}

// NewDefaultHandler returns a default Handler implementation.
func NewDefaultHandler() *Handler {
	return &Handler{
		OnRegister: func(remote *types.VersionMessage) error {
			log.Infof("Received device register request: %s (fingerprint: %s, port: %d)",
				remote.Alias, remote.Fingerprint, remote.Port)
			return nil
		},
		OnPrepareUpload: func(request *types.PrepareUploadRequest, pin string) (*types.PrepareUploadResponse, error) {
			log.Infof("Received file transfer prepare request: from %s, file count: %d, PIN: %s",
				request.Info.Alias, len(request.Files), pin)
			askSession := tool.GenerateRandomUUID()
			response := &types.PrepareUploadResponse{
				SessionId: askSession,
				Files:     make(map[string]string),
			}

			if err := tool.JoinSession(askSession); err != nil {
				return nil, err
			}

			for fileID := range request.Files {
				response.Files[fileID] = "accepted"
			}

			cacheUploadSession(askSession, request.Files)

			return response, nil
		},
		OnUpload: func(sessionId, fileId, token string, data io.Reader, remoteAddr string) error {
			info, ok := lookupFileInfo(sessionId, fileId)
			if !ok {
				return fmt.Errorf("file metadata not found")
			}

			if err := os.MkdirAll(filepath.Join(DefaultUploadFolder, sessionId), 0o755); err != nil {
				return fmt.Errorf("create upload dir failed: %w", err)
			}

			fileName := strings.TrimSpace(info.FileName)
			if fileName == "" {
				fileName = fileId
			}
			fileName = filepath.Base(fileName)
			targetPath := filepath.Join(DefaultUploadFolder, sessionId, fmt.Sprintf("%s_%s", fileId, fileName))

			file, err := os.Create(targetPath)
			if err != nil {
				return fmt.Errorf("create file failed: %w", err)
			}
			defer file.Close()

			hasher := sha256.New()
			writer := io.MultiWriter(file, hasher)
			written, err := io.Copy(writer, data)
			if err != nil {
				return fmt.Errorf("write file failed: %w", err)
			}

			if info.Size > 0 && written != info.Size {
				return fmt.Errorf("size mismatch")
			}

			if info.SHA256 != "" {
				actual := hex.EncodeToString(hasher.Sum(nil))
				if !strings.EqualFold(actual, info.SHA256) {
					return fmt.Errorf("hash mismatch")
				}
			}

			log.Infof("Upload saved: sessionId=%s, fileId=%s, path=%s", sessionId, fileId, targetPath)
			return nil
		},
		OnCancel: func(sessionId string) error {
			log.Infof("Received file transfer cancel request: sessionId=%s", sessionId)
			if !tool.QuerySessionIsValid(sessionId) {
				return fmt.Errorf("session %s not found", sessionId)
			}
			removeUploadSession(sessionId)
			log.Infof("Session %s canceled", sessionId)
			return nil
		},
	}
}

// NewServer creates a new API server instance
func NewServer(port int, protocol string, handler *Handler) *Server {
	if handler == nil {
		handler = &Handler{}
	}
	return &Server{
		port:     port,
		protocol: protocol,
		handler:  handler,
	}
}

// Handler returns the HTTP handler with all registered endpoints.
func (s *Server) Handler() http.Handler {
	return s.setupRoutes()
}

func (s *Server) setupRoutes() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery())

	// Register API endpoints
	v2 := engine.Group("/api/localsend/v2")
	{
		v2.POST("/register", s.handleRegister)
		v2.POST("/prepare-upload", s.handlePrepareUpload)
		v2.POST("/upload", s.handleUpload)
		v2.POST("/cancel", s.handleCancel)
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
	log.Infof("Starting API server on %s", address)

	if s.protocol == "https" {
		// Generate self-signed TLS certificate
		certBytes, keyBytes, err := tool.GenerateTLSCert()
		if err != nil {
			return fmt.Errorf("failed to generate TLS certificate: %v", err)
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

		log.Infof("TLS certificate generated and configured for HTTPS")
		return s.server.ListenAndServeTLS("", "")
	}

	return s.server.ListenAndServe()
}

// Stop stops the HTTP server
func (s *Server) Stop() error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.server != nil {
		return s.server.Close()
	}
	return nil
}

// handleRegister handles the /api/localsend/v2/register endpoint
func (s *Server) handleRegister(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Errorf("Failed to read register request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Reuse parsing function from boardcast package
	incoming, err := boardcast.ParseVersionMessageFromBody(body)
	if err != nil {
		log.Errorf("Failed to parse register request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	log.Debugf("Received register request from %s (fingerprint: %s)", incoming.Alias, incoming.Fingerprint)

	remoteHost, _, splitErr := net.SplitHostPort(c.ClientIP())
	if splitErr != nil || remoteHost == "" {
		remoteHost = c.ClientIP()
	}
	if self := getSelfDevice(); self == nil || self.Fingerprint != incoming.Fingerprint {
		cacheDiscoveredDevice(incoming, remoteHost)
	}

	// Call the registered callback if available
	if s.handler.OnRegister != nil {
		if err := s.handler.OnRegister(incoming); err != nil {
			log.Errorf("Register callback error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// handlePrepareUpload handles the /api/localsend/v2/prepare-upload endpoint
func (s *Server) handlePrepareUpload(c *gin.Context) {
	pin := c.Query("pin")

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Errorf("Failed to read prepare-upload request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Reuse parsing function from boardcast package
	request, err := boardcast.ParsePrepareUploadRequestFromBody(body)
	if err != nil {
		log.Errorf("Failed to parse prepare-upload request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	log.Debugf("Received prepare-upload request from %s (pin: %s)", request.Info.Alias, pin)

	// Call the registered callback if available
	var response *types.PrepareUploadResponse
	if s.handler.OnPrepareUpload != nil {
		var callbackErr error
		response, callbackErr = s.handler.OnPrepareUpload(request, pin)
		if callbackErr != nil {
			log.Errorf("Prepare-upload callback error: %v", callbackErr)
			errorMsg := callbackErr.Error()

			// Map common errors to HTTP status codes
			switch errorMsg {
			case "pin required", "invalid pin":
				c.JSON(http.StatusUnauthorized, gin.H{"error": errorMsg})
				return
			case "rejected":
				c.JSON(http.StatusForbidden, gin.H{"error": errorMsg})
				return
			case "blocked by another session":
				c.JSON(http.StatusConflict, gin.H{"error": errorMsg})
				return
			case "too many requests":
				c.JSON(http.StatusTooManyRequests, gin.H{"error": errorMsg})
				return
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": errorMsg})
				return
			}
		}
	} else {
		// Default response if no callback is registered
		response = &types.PrepareUploadResponse{
			SessionId: "default-session",
			Files:     make(map[string]string),
		}
		// Accept all files by default
		for fileID := range request.Files {
			response.Files[fileID] = "accepted"
		}
	}

	c.JSON(http.StatusOK, response)
}

// handleUpload handles the /api/localsend/v2/upload endpoint
func (s *Server) handleUpload(c *gin.Context) {
	sessionId := c.Query("sessionId")
	fileId := c.Query("fileId")
	token := c.Query("token")

	// Validate required parameters
	if sessionId == "" || fileId == "" || token == "" {
		log.Errorf("Missing required parameters: sessionId=%s, fileId=%s, token=%s", sessionId, fileId, token)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing parameters"})
		return
	}

	// Validate session availability
	if !isSessionValidated(sessionId) {
		if !tool.QuerySessionIsValid(sessionId) {
			log.Errorf("Invalid sessionId: %s", sessionId)
			c.JSON(http.StatusConflict, gin.H{"error": "Blocked by another session"})
			return
		}
		markSessionValidated(sessionId)
	}

	remoteAddr := c.ClientIP()

	log.Debugf("Received upload request: sessionId=%s, fileId=%s, token=%s, remoteAddr=%s", sessionId, fileId, token, remoteAddr)

	// Call the registered callback if available
	if s.handler.OnUpload != nil {
		if err := s.handler.OnUpload(sessionId, fileId, token, c.Request.Body, remoteAddr); err != nil {
			log.Errorf("Upload callback error: %v", err)
			errorMsg := err.Error()

			// Map errors to HTTP status codes
			switch errorMsg {
			case "Invalid token or IP address":
				c.JSON(http.StatusForbidden, gin.H{"error": errorMsg})
				return
			case "Blocked by another session":
				c.JSON(http.StatusConflict, gin.H{"error": errorMsg})
				return
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": errorMsg})
				return
			}
		}
	}

	c.Status(http.StatusOK)
}

// handleCancel handles the /api/localsend/v2/cancel endpoint
func (s *Server) handleCancel(c *gin.Context) {
	sessionId := c.Query("sessionId")

	// Validate required parameter
	if sessionId == "" {
		log.Errorf("Missing required parameter: sessionId")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing parameters"})
		return
	}

	log.Debugf("Received cancel request: sessionId=%s", sessionId)

	// Call the registered callback if available
	if s.handler.OnCancel != nil {
		if err := s.handler.OnCancel(sessionId); err != nil {
			log.Errorf("Cancel callback error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
	}

	removeUploadSession(sessionId)
	c.Status(http.StatusOK)
}
