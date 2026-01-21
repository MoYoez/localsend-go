package tool

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"net/url"
	"os"
	"path/filepath"

	"github.com/moyoez/localsend-base-protocol-golang/types"
)

// processFileInput processes a FileInput and fills missing information from fileUrl if provided
func ProcessFileInput(fileInput *types.FileInput) error {
	// If fileUrl is provided, auto-fill missing information
	if fileInput.FileUrl != "" {
		parsedUrl, err := url.Parse(fileInput.FileUrl)
		if err != nil {
			return fmt.Errorf("invalid fileUrl: %v", err)
		}

		if parsedUrl.Scheme != "file" {
			return fmt.Errorf("only file:// protocol is supported for fileUrl")
		}

		filePath := parsedUrl.Path
		DefaultLogger.Infof("Reading file info from: %s", filePath)

		// Determine if we need to calculate SHA256
		calculateSHA := fileInput.SHA256 == ""

		// Get file information
		fileName, fileSize, fileType, sha256Hash, err := GetFileInfoFromPath(filePath, calculateSHA)
		if err != nil {
			return err
		}

		// Fill missing fields
		if fileInput.FileName == "" {
			fileInput.FileName = fileName
			DefaultLogger.Debugf("Auto-detected fileName: %s", fileName)
		}
		if fileInput.Size == 0 {
			fileInput.Size = fileSize
			DefaultLogger.Debugf("Auto-detected size: %d bytes", fileSize)
		}
		if fileInput.FileType == "" {
			fileInput.FileType = fileType
			DefaultLogger.Debugf("Auto-detected fileType: %s", fileType)
		}
		if fileInput.SHA256 == "" && sha256Hash != "" {
			fileInput.SHA256 = sha256Hash
			DefaultLogger.Debugf("Auto-calculated SHA256: %s", sha256Hash)
		}
	}

	// Validate required fields
	if fileInput.FileName == "" {
		return fmt.Errorf("fileName is required")
	}
	if fileInput.Size == 0 {
		return fmt.Errorf("size is required or must be > 0")
	}
	if fileInput.FileType == "" {
		return fmt.Errorf("fileType is required")
	}

	return nil
}

// getFileInfoFromPath reads file information from local filesystem
// Returns fileName, size, fileType, sha256, error
func GetFileInfoFromPath(filePath string, calculateSHA bool) (string, int64, string, string, error) {
	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return "", 0, "", "", fmt.Errorf("failed to stat file: %v", err)
	}

	// Check if it's a file (not directory)
	if fileInfo.IsDir() {
		return "", 0, "", "", fmt.Errorf("path is a directory, not a file")
	}

	// Get file name
	fileName := filepath.Base(filePath)

	// Get file size
	fileSize := fileInfo.Size()

	// Detect file type (MIME type) from extension
	fileType := mime.TypeByExtension(filepath.Ext(filePath))
	if fileType == "" {
		fileType = "application/octet-stream" // Default MIME type
	}

	// Calculate SHA256 if requested
	var sha256Hash string
	if calculateSHA {
		file, err := os.Open(filePath)
		if err != nil {
			return fileName, fileSize, fileType, "", fmt.Errorf("failed to open file for hashing: %v", err)
		}
		defer file.Close()

		hasher := sha256.New()
		if _, err := io.Copy(hasher, file); err != nil {
			return fileName, fileSize, fileType, "", fmt.Errorf("failed to calculate SHA256: %v", err)
		}
		sha256Hash = hex.EncodeToString(hasher.Sum(nil))
	}

	return fileName, fileSize, fileType, sha256Hash, nil
}
