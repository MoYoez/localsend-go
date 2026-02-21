package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/moyoez/localsend-go/api/notifyhub"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // OnlyAllowLocal middleware already restricts to localhost
	},
}

// HandleNotifyWS upgrades the request to WebSocket and registers the connection with the hub.
// Call this only when notifyHub is set and notifyWSEnabled is true.
func HandleNotifyWS(hub *notifyhub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}
		defer conn.Close()

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
