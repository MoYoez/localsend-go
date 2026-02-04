package tool

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"time"
)

var (
	DefaultTimeout       = 30 * time.Second
	ConnectionHttpClient *http.Client
	DetectHttpClient     *http.Client
)

func init() {
	ConnectionHttpClient = NewHTTPClient()
	DetectHttpClient = NewHTTPClient()
}

// NewHTTPClient creates an HTTP client, skipping self-signed certificate verification in HTTPS mode.
func NewHTTPClient() *http.Client {
	return newHTTPClientWithBindAddr(nil)
}

// newHTTPClientWithBindAddr creates an HTTP client. When bindAddr is non-nil, outgoing connections
// are bound to that local address (e.g. to force use of a specific network interface).
func newHTTPClientWithBindAddr(bindAddr *net.TCPAddr) *http.Client {
	transport := &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     300 * time.Millisecond,
		DisableKeepAlives:   false,
	}
	if bindAddr != nil {
		dialer := &net.Dialer{
			LocalAddr: bindAddr,
			Timeout:   DefaultTimeout,
			KeepAlive: 30 * time.Second,
		}
		transport.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
			return dialer.DialContext(ctx, network, addr)
		}
	}
	return &http.Client{
		Timeout:   DefaultTimeout,
		Transport: transport,
	}
}

// InitHTTPClients (re)initializes the HTTP clients with optional bind address.
// Call this after boardcast.SetReferNetworkInterface. When bindAddr is nil (e.g. useReferNetworkInterface is "*"),
// clients use the default transport without interface binding.
func InitHTTPClients(bindAddr *net.TCPAddr) {
	ConnectionHttpClient = newHTTPClientWithBindAddr(bindAddr)
	DetectHttpClient = newHTTPClientWithBindAddr(bindAddr)
}

func GetHttpClient() *http.Client {
	return ConnectionHttpClient
}
