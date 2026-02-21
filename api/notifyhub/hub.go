package notifyhub

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/moyoez/localsend-go/types"
)

// Hub holds WebSocket connections and broadcasts notifications to all clients.
type Hub struct {
	mu    sync.RWMutex
	conns map[*websocket.Conn]struct{}
}

// New creates a new notify hub.
func New() *Hub {
	return &Hub{
		conns: make(map[*websocket.Conn]struct{}),
	}
}

// Register adds a WebSocket connection to the hub.
func (h *Hub) Register(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.conns[conn] = struct{}{}
}

// Unregister removes a WebSocket connection from the hub.
func (h *Hub) Unregister(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns, conn)
}

// Broadcast sends the notification as JSON to all registered connections.
// Implements notify.NotifyHub.
func (h *Hub) Broadcast(notification *types.Notification) {
	if notification == nil {
		return
	}
	payload, err := json.Marshal(notification)
	if err != nil {
		return
	}

	h.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(h.conns))
	for c := range h.conns {
		conns = append(conns, c)
	}
	h.mu.RUnlock()

	for _, conn := range conns {
		_ = conn.WriteMessage(websocket.TextMessage, payload)
	}
}
