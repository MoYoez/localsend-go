package models

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/moyoez/localsend-go/types"
)

var (
	notifyOptMu sync.RWMutex
	notifyOpt   types.NotifyOpt
)

// Hub holds WebSocket connections and broadcasts notifications to all clients.
// Implements types.NotifyHub.
type Hub struct {
	mu    sync.RWMutex
	conns map[*websocket.Conn]struct{}
}

// NewHub creates a new notify hub.
func NewHub() *Hub {
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

// SetNotifyHub sets the hub for WebSocket notification broadcast (used when NotifyUsingWebsocket is true).
func SetNotifyHub(h *Hub) {
	notifyOptMu.Lock()
	defer notifyOptMu.Unlock()
	notifyOpt.Hub = h
}

// GetNotifyOpt returns the current notify options (for route registration etc.).
func GetNotifyOpt() *types.NotifyOpt {
	notifyOptMu.RLock()
	defer notifyOptMu.RUnlock()
	return &types.NotifyOpt{Hub: notifyOpt.Hub}
}

// GetNotifyHub returns the notify WebSocket hub, or nil if not set.
func GetNotifyHub() *Hub {
	notifyOptMu.RLock()
	defer notifyOptMu.RUnlock()
	if notifyOpt.Hub == nil {
		return nil
	}
	h, _ := notifyOpt.Hub.(*Hub)
	return h
}
