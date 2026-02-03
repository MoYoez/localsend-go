package types

// Notification represents a notification message structure
type Notification struct {
	Type       string         `json:"type,omitempty"`       // Notification type, e.g. "upload_start", "upload_end", etc.
	Title      string         `json:"title,omitempty"`      // Notification title
	Message    string         `json:"message,omitempty"`    // Notification message/content
	Data       map[string]any `json:"data,omitempty"`       // Additional data fields
	IsTextOnly bool           `json:"isTextOnly,omitempty"` // Indicates if this is plain text content
}
