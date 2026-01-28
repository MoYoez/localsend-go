package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-base-protocol-golang/api/models"
	"github.com/moyoez/localsend-base-protocol-golang/tool"
	"github.com/moyoez/localsend-base-protocol-golang/types"
)

type CancelController struct {
	handler types.HandlerInterface
}

func NewCancelController(handler types.HandlerInterface) *CancelController {
	return &CancelController{
		handler: handler,
	}
}

func (ctrl *CancelController) HandleCancel(c *gin.Context) {
	sessionId := c.Query("sessionId")

	if sessionId == "" {
		tool.DefaultLogger.Errorf("Missing required parameter: sessionId")
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing parameters"))
		return
	}

	tool.DefaultLogger.Infof("[Cancel] Received cancel request: sessionId=%s", sessionId)

	if ctrl.handler != nil {
		tool.DefaultLogger.Infof("[Cancel] Processing cancel callback for session: %s", sessionId)
		if err := ctrl.handler.OnCancel(sessionId); err != nil {
			tool.DefaultLogger.Errorf("[Cancel] Cancel callback error: %v", err)
			c.JSON(http.StatusInternalServerError, tool.FastReturnError("Internal server error"))
			return
		}
		tool.DefaultLogger.Infof("[Cancel] Successfully cancelled session: %s", sessionId)
	}

	models.RemoveUploadSession(sessionId)
	tool.DefaultLogger.Infof("[Cancel] Removed upload session: %s", sessionId)
	c.Status(http.StatusOK)
}

// HandleCancelV1Cancel handles V1 cancel request
// POST /api/localsend/v1/cancel
// V1 differs from V2: no sessionId parameter, uses IP address to determine session
func (ctrl *CancelController) HandleCancelV1Cancel(c *gin.Context) {
	remoteAddr := c.ClientIP()
	tool.DefaultLogger.Infof("[V1 Cancel] Received cancel request from IP: %s", remoteAddr)

	// V1 uses IP address to determine session
	sessionId := models.GetV1Session(remoteAddr)
	if sessionId == "" {
		tool.DefaultLogger.Warnf("[V1 Cancel] No active session found for IP: %s, but returning OK", remoteAddr)
		// Still return OK even if no session found (graceful handling)
		c.Status(http.StatusOK)
		return
	}

	tool.DefaultLogger.Infof("[V1 Cancel] Found session %s for IP: %s", sessionId, remoteAddr)

	if ctrl.handler != nil {
		tool.DefaultLogger.Infof("[V1 Cancel] Processing cancel callback for session: %s", sessionId)
		if err := ctrl.handler.OnCancel(sessionId); err != nil {
			tool.DefaultLogger.Errorf("[V1 Cancel] Cancel callback error: %v", err)
			// V1 spec says no body, so just return status
			c.Status(http.StatusInternalServerError)
			return
		}
		tool.DefaultLogger.Infof("[V1 Cancel] Successfully cancelled session: %s", sessionId)
	}

	// Clean up both the session and the IP mapping
	models.RemoveUploadSession(sessionId)
	models.RemoveV1Session(remoteAddr)
	tool.DefaultLogger.Infof("[V1 Cancel] Removed upload session: %s and IP mapping for: %s", sessionId, remoteAddr)

	c.Status(http.StatusOK)
}
