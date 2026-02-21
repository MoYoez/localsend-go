package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-go/api/models"
	"github.com/moyoez/localsend-go/api/notifyopts"
	"github.com/moyoez/localsend-go/tool"
)

// UserStatus returns server status for the web UI (running, notify_ws_enabled).
// GET /api/self/v1/status
func UserStatus(c *gin.Context) {
	// notify_ws_enabled is set by api package; we need to expose it.
	// Use a small helper in api package that returns it, or pass via context.
	// For simplicity we use a getter in api package.
	c.JSON(http.StatusOK, gin.H{
		"running":           true,
		"notify_ws_enabled": notifyopts.NotifyWSEnabled(),
	})
}

// ConfigResponse is the JSON shape for GET/PATCH /api/self/v1/config (Decky parity).
type ConfigResponse struct {
	Alias                  string `json:"alias"`
	DownloadFolder         string `json:"download_folder"`
	Pin                    string `json:"pin"`
	AutoSave               bool   `json:"auto_save"`
	AutoSaveFromFavorites  bool   `json:"auto_save_from_favorites"`
	SkipNotify             bool   `json:"skip_notify"`
	UseHttps               bool   `json:"use_https"`
	NetworkInterface       string `json:"network_interface"`
	ScanTimeout            int    `json:"scan_timeout"`
	UseDownload            bool   `json:"use_download"`
	DoNotMakeSessionFolder bool   `json:"do_not_make_session_folder"`
}

// UserConfigGet returns current effective config (config file + flag overrides).
// GET /api/self/v1/config
func UserConfigGet(c *gin.Context) {
	cfg := tool.GetCurrentConfig()
	prog := tool.GetProgramConfigStatus()
	flags := tool.GetFlagOverrides()

	downloadFolder := models.DefaultUploadFolder
	if flags.UseDefaultUploadFolder != "" {
		downloadFolder = flags.UseDefaultUploadFolder
	}

	useHttps := cfg.Protocol != "http"
	if flags.UseHttp {
		useHttps = false
	}

	alias := cfg.Alias
	if flags.UseAlias != "" {
		alias = flags.UseAlias
	}

	pin := prog.Pin
	if flags.UsePin != "" {
		pin = flags.UsePin
	}

	resp := ConfigResponse{
		Alias:                  alias,
		DownloadFolder:         downloadFolder,
		Pin:                    pin,
		AutoSave:               prog.AutoSave,
		AutoSaveFromFavorites:  prog.AutoSaveFromFavorites,
		SkipNotify:             flags.SkipNotify,
		UseHttps:               useHttps,
		NetworkInterface:       flags.UseReferNetworkInterface,
		ScanTimeout:            flags.ScanTimeout,
		UseDownload:            cfg.Download,
		DoNotMakeSessionFolder: flags.DoNotMakeSessionFolder,
	}
	if flags.UseDownload {
		resp.UseDownload = true
	}

	c.JSON(http.StatusOK, resp)
}

// UserConfigPatch accepts partial config and updates in-memory config and persists to file.
// PATCH /api/self/v1/config
func UserConfigPatch(c *gin.Context) {
	var body struct {
		Alias                  *string `json:"alias"`
		DownloadFolder         *string `json:"download_folder"`
		Pin                    *string `json:"pin"`
		AutoSave               *bool   `json:"auto_save"`
		AutoSaveFromFavorites  *bool   `json:"auto_save_from_favorites"`
		UseHttps               *bool   `json:"use_https"`
		NetworkInterface       *string `json:"network_interface"`
		ScanTimeout            *int    `json:"scan_timeout"`
		UseDownload            *bool   `json:"use_download"`
		DoNotMakeSessionFolder *bool   `json:"do_not_make_session_folder"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg := tool.GetCurrentConfig()
	prog := tool.GetProgramConfigStatus()

	if body.Alias != nil {
		cfg.Alias = *body.Alias
	}
	if body.DownloadFolder != nil {
		models.SetDefaultUploadFolder(*body.DownloadFolder)
	}
	if body.Pin != nil {
		prog.Pin = *body.Pin
	}
	if body.AutoSave != nil {
		prog.AutoSave = *body.AutoSave
	}
	if body.AutoSaveFromFavorites != nil {
		prog.AutoSaveFromFavorites = *body.AutoSaveFromFavorites
	}
	tool.SetProgramConfigStatus(prog.Pin, prog.AutoSave, prog.AutoSaveFromFavorites)

	if body.UseHttps != nil {
		if *body.UseHttps {
			cfg.Protocol = "https"
		} else {
			cfg.Protocol = "http"
		}
	}
	if body.UseDownload != nil {
		cfg.Download = *body.UseDownload
	}
	if body.DoNotMakeSessionFolder != nil {
		models.SetDoNotMakeSessionFolder(*body.DoNotMakeSessionFolder)
	}

	// Persist AppConfig to config file; ProgramCurrentConfig is updated in memory
	tool.UpdateCurrentConfigAndPersist(cfg, prog)

	c.JSON(http.StatusOK, gin.H{"success": true})
}
