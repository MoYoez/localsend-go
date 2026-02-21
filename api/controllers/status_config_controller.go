package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-go/api/models"
	"github.com/moyoez/localsend-go/notify"
	"github.com/moyoez/localsend-go/tool"
	"github.com/moyoez/localsend-go/types"
)

// UserStatus returns server status for the web UI (running, notify_ws_enabled).
// GET /api/self/v1/status
func UserStatus(c *gin.Context) {
	// notify_ws_enabled: single source from notify package
	c.JSON(http.StatusOK, gin.H{
		"running":           true,
		"notify_ws_enabled": notify.NotifyWSEnabled(),
	})
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

	resp := types.ConfigResponse{
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
	var body types.ConfigPatchRequest
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
