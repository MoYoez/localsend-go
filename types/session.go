package types

// SessionUploadStats tracks upload statistics for a session
type SessionUploadStats struct {
	TotalFiles    int
	SuccessFiles  int
	FailedFiles   int
	FailedFileIds []string
}
