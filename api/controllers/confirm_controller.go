package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-go/api/models"
	"github.com/moyoez/localsend-go/tool"
	"github.com/moyoez/localsend-go/types"
)

// UserConfirmRecv handles confirm receive request
// GET /api/self/v1/confirm-recv
func UserConfirmRecv(c *gin.Context) {
	sessionId := strings.TrimSpace(c.Query("sessionId"))
	confirmedRaw := strings.TrimSpace(c.Query("confirmed"))
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: sessionId"))
		return
	}
	if confirmedRaw == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: confirmed"))
		return
	}

	confirmed, err := strconv.ParseBool(confirmedRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Invalid parameter: confirmed"))
		return
	}

	confirmCh, ok := models.GetConfirmRecvChannel(sessionId)
	if !ok {
		c.JSON(http.StatusNotFound, tool.FastReturnError("Session not found or expired"))
		return
	}

	select {
	case confirmCh <- types.ConfirmResult{Confirmed: confirmed}:
		models.DeleteConfirmRecvChannel(sessionId)
		c.JSON(http.StatusOK, tool.FastReturnSuccess())
	default:
		c.JSON(http.StatusConflict, tool.FastReturnError("Confirm channel busy"))
	}
}

// UserTextReceivedDismiss handles text-received modal dismiss (user closed or copied).
// GET /api/self/v1/text-received-dismiss
func UserTextReceivedDismiss(c *gin.Context) {
	sessionId := strings.TrimSpace(c.Query("sessionId"))
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: sessionId"))
		return
	}
	dismissCh, ok := models.GetTextReceivedDismissChannel(sessionId)
	if !ok {
		c.JSON(http.StatusNotFound, tool.FastReturnError("Session not found or expired"))
		return
	}
	select {
	case dismissCh <- struct{}{}:
		models.DeleteTextReceivedDismissChannel(sessionId)
		c.JSON(http.StatusOK, tool.FastReturnSuccess())
	default:
		c.JSON(http.StatusConflict, tool.FastReturnError("Dismiss channel busy"))
	}
}

// UserConfirmDownload handles confirm download request
// GET /api/self/v1/confirm-download?sessionId=xxx&clientKey=yyy&confirmed=true
func UserConfirmDownload(c *gin.Context) {
	sessionId := strings.TrimSpace(c.Query("sessionId"))
	clientKey := strings.TrimSpace(c.Query("clientKey"))
	confirmedRaw := strings.TrimSpace(c.Query("confirmed"))
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: sessionId"))
		return
	}
	if clientKey == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: clientKey"))
		return
	}
	if confirmedRaw == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: confirmed"))
		return
	}

	confirmed, err := strconv.ParseBool(confirmedRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Invalid parameter: confirmed"))
		return
	}

	confirmCh, ok := models.GetConfirmDownloadChannel(sessionId, clientKey)
	if !ok {
		c.JSON(http.StatusNotFound, tool.FastReturnError("Session not found or expired"))
		return
	}

	select {
	case confirmCh <- types.ConfirmResult{Confirmed: confirmed}:
		models.DeleteConfirmDownloadChannel(sessionId, clientKey)
		// goroutine in download_controller will call MarkDownloadConfirmed on accept
		c.JSON(http.StatusOK, tool.FastReturnSuccess())
	default:
		c.JSON(http.StatusConflict, tool.FastReturnError("Confirm channel busy"))
	}
}
