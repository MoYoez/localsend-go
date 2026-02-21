package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
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

// UserConfigGet returns full config from config.yaml.
// GET /api/self/v1/config
func UserConfigGet(c *gin.Context) {
	cfg := tool.GetCurrentConfig()
	fav := cfg.FavoriteDevices
	if fav == nil {
		fav = []types.FavoriteDeviceEntry{}
	}
	resp := types.ConfigResponse{
		Alias:                 cfg.Alias,
		Version:               cfg.Version,
		DeviceModel:           cfg.DeviceModel,
		DeviceType:            cfg.DeviceType,
		Fingerprint:           cfg.Fingerprint,
		Port:                  cfg.Port,
		Protocol:              cfg.Protocol,
		Download:              cfg.Download,
		Announce:              cfg.Announce,
		CertPEM:               cfg.CertPEM,
		KeyPEM:                cfg.KeyPEM,
		AutoSaveFromFavorites: cfg.AutoSaveFromFavorites,
		FavoriteDevices:       fav,
	}
	c.JSON(http.StatusOK, resp)
}

// UserConfigPatch accepts full or partial config and persists to config.yaml.
// PATCH /api/self/v1/config
func UserConfigPatch(c *gin.Context) {
	var body types.ConfigPatchRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg := *tool.GetCurrentConfig()

	if body.Alias != nil {
		cfg.Alias = *body.Alias
	}
	if body.Version != nil {
		cfg.Version = *body.Version
	}
	if body.DeviceModel != nil {
		cfg.DeviceModel = *body.DeviceModel
	}
	if body.DeviceType != nil {
		cfg.DeviceType = *body.DeviceType
	}
	if body.Fingerprint != nil {
		cfg.Fingerprint = *body.Fingerprint
	}
	if body.Port != nil {
		cfg.Port = *body.Port
	}
	if body.Protocol != nil {
		cfg.Protocol = *body.Protocol
	}
	if body.Download != nil {
		cfg.Download = *body.Download
	}
	if body.Announce != nil {
		cfg.Announce = *body.Announce
	}
	if body.CertPEM != nil {
		cfg.CertPEM = *body.CertPEM
	}
	if body.KeyPEM != nil {
		cfg.KeyPEM = *body.KeyPEM
	}
	if body.AutoSaveFromFavorites != nil {
		cfg.AutoSaveFromFavorites = *body.AutoSaveFromFavorites
	}
	if body.FavoriteDevices != nil {
		cfg.FavoriteDevices = *body.FavoriteDevices
	}

	tool.PersistAppConfig(&cfg)
	c.JSON(http.StatusOK, gin.H{"success": true})
}
