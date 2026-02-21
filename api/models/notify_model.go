package models

import (
	"sync"

	"github.com/moyoez/localsend-go/api/notifyhub"
	"github.com/moyoez/localsend-go/types"
)

var (
	notifyOptMu sync.RWMutex
	notifyOpt   types.NotifyOpt
)

// SetNotifyHub sets the hub for WebSocket notification broadcast (used when NotifyUsingWebsocket is true).
func SetNotifyHub(h *notifyhub.Hub) {
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
func GetNotifyHub() *notifyhub.Hub {
	notifyOptMu.RLock()
	defer notifyOptMu.RUnlock()
	if notifyOpt.Hub == nil {
		return nil
	}
	h, _ := notifyOpt.Hub.(*notifyhub.Hub)
	return h
}
