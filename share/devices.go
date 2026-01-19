package share

import (
	"time"

	ttlworker "github.com/FloatTech/ttl"
	"github.com/charmbracelet/log"
)

// ttl

const (
	DefaultTTL = 30 * time.Second
)

var (
	UserScanCurrent = ttlworker.NewCache[string, any](DefaultTTL)
)

func SetUserScanCurrent(sessionId string, data any) {
	UserScanCurrent.Set(sessionId, data)
	log.Debugf("Set user scan current: %s", sessionId)
}

func GetUserScanCurrent(sessionId string) (any, bool) {
	data := UserScanCurrent.Get(sessionId)
	return data, data != nil
}

func ListUserScanCurrent() []string {
	keys := make([]string, 0)
	err := UserScanCurrent.Range(func(k string, v any) error {
		keys = append(keys, k)
		return nil
	})
	if err != nil {
		return nil
	}
	return keys
}
