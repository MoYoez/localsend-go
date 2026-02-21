package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/moyoez/localsend-go/api/models"
	"github.com/moyoez/localsend-go/tool"
)

var notifyWSUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // OnlyAllowLocal middleware already restricts to localhost
	},
}

// HandleNotifyWS upgrades the request to WebSocket and registers the connection with the hub.
// Call only when the hub is set and notify WS is enabled.
func HandleNotifyWS(hub *models.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := notifyWSUpgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}
		defer func() {
			if err := conn.Close(); err != nil {
				tool.DefaultLogger.Errorf("Failed to close WebSocket connection: %v", err)
			}
		}()

		hub.Register(conn)
		defer hub.Unregister(conn)

		// Read loop to detect client close and keep connection alive
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}
}
