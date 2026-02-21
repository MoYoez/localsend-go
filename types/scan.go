package types

// ScanMode defines the scanning mode
type ScanMode int

const (
	ScanModeUDP   ScanMode = iota // UDP multicast only
	ScanModeHTTP                  // HTTP scanning only (legacy mode)
	ScanModeMixed                 // Both UDP and HTTP scanning
)

// ScanConfig holds the current scan configuration for scan-now API
type ScanConfig struct {
	Mode        ScanMode
	SelfMessage *VersionMessage
	SelfHTTP    *VersionMessageHTTP
	Timeout     int // UDP timeout in seconds (from config, default 500). 0 means no timeout
	HTTPTimeout int // HTTP timeout in seconds, 60. 0 means use Timeout for backward compat
}

// HTTPScanOptions configures concurrency and ICMP rate limit for HTTP scan.
// Concurrency: max concurrent scan goroutines; 0 or large value = effectively unlimited (e.g. scan-now).
// RateLimitPPS: ICMP probe rate limit (packets per second); 0 = no limit.
type HTTPScanOptions struct {
	Concurrency  int // max concurrent workers
	RateLimitPPS int // 0 = no rate limit
}
