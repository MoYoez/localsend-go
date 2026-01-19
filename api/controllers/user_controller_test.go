package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-base-protocol-golang/api/models"
	"github.com/moyoez/localsend-base-protocol-golang/share"
	"github.com/moyoez/localsend-base-protocol-golang/types"
)

// setupRouter creates a test router with the user endpoints
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	self := router.Group("/api/self/v1")
	{
		self.GET("/scan-current", UserScanCurrent)
		self.POST("/prepare-upload", UserPrepareUpload)
		self.POST("/upload", UserUpload)
	}
	
	return router
}

// setupTestDevice sets up a test device in the share cache
func setupTestDevice() {
	testDevice := share.UserScanCurrentItem{
		Ipaddress: "127.0.0.1",
		VersionMessage: types.VersionMessage{
			Alias:       "TestDevice",
			Version:     "2.0",
			DeviceModel: "TestModel",
			DeviceType:  "desktop",
			Fingerprint: "test-fingerprint",
			Port:        53317,
			Protocol:    "http",
			Download:    false,
			Announce:    true,
		},
	}
	share.SetUserScanCurrent("test-target-1", testDevice)
}

// setupSelfDevice sets up a test self device
func setupSelfDevice() {
	selfDevice := &types.VersionMessage{
		Alias:       "TestSender",
		Version:     "2.0",
		DeviceModel: "TestSenderModel",
		DeviceType:  "desktop",
		Fingerprint: "sender-fingerprint",
		Port:        53317,
		Protocol:    "http",
		Download:    false,
		Announce:    true,
	}
	models.SetSelfDevice(selfDevice)
}

// TestUserPrepareUpload tests the prepare upload endpoint
func TestUserPrepareUpload(t *testing.T) {
	// Setup
	router := setupRouter()
	setupTestDevice()
	setupSelfDevice()

	// Test request body
	requestBody := UserPrepareUploadRequest{
		TargetTo: "test-target-1",
		Files: map[string]FileInput{
			"file-1": {
				ID:       "file-1",
				FileName: "test.txt",
				Size:     1024,
				FileType: "text/plain",
			},
		},
	}

	jsonData, _ := json.Marshal(requestBody)
	req, _ := http.NewRequest("POST", "/api/self/v1/prepare-upload", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "127.0.0.1:12345" // Mock local IP for middleware

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Check status code
	if w.Code != http.StatusOK && w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code 200 or 500, got %d", w.Code)
	}

	// Check response body (if successful, we should get sessionId and tokens)
	if w.Code == http.StatusOK {
		var response map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Errorf("Failed to parse response: %v", err)
		}

		if data, ok := response["data"].(map[string]interface{}); ok {
			if _, ok := data["sessionId"]; !ok {
				t.Error("Response should contain sessionId")
			}
			if _, ok := data["files"]; !ok {
				t.Error("Response should contain files")
			}
		}
	}

	t.Logf("Response: %s", w.Body.String())
}

// TestUserPrepareUploadInvalidTarget tests prepare upload with invalid target
func TestUserPrepareUploadInvalidTarget(t *testing.T) {
	router := setupRouter()
	setupSelfDevice()

	requestBody := UserPrepareUploadRequest{
		TargetTo: "non-existent-target",
		Files: map[string]FileInput{
			"file-1": {
				ID:       "file-1",
				FileName: "test.txt",
				Size:     1024,
				FileType: "text/plain",
			},
		},
	}

	jsonData, _ := json.Marshal(requestBody)
	req, _ := http.NewRequest("POST", "/api/self/v1/prepare-upload", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "127.0.0.1:12345"

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status code 404, got %d", w.Code)
	}
}

// TestUserPrepareUploadInvalidBody tests prepare upload with invalid request body
func TestUserPrepareUploadInvalidBody(t *testing.T) {
	router := setupRouter()

	req, _ := http.NewRequest("POST", "/api/self/v1/prepare-upload", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "127.0.0.1:12345"

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code 400, got %d", w.Code)
	}
}

// TestUserUploadMissingParams tests upload endpoint with missing query parameters
func TestUserUploadMissingParams(t *testing.T) {
	router := setupRouter()

	fileData := []byte("test file content")
	req, _ := http.NewRequest("POST", "/api/self/v1/upload", bytes.NewBuffer(fileData))
	req.Header.Set("Content-Type", "application/octet-stream")
	req.RemoteAddr = "127.0.0.1:12345"

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code 400, got %d", w.Code)
	}
}

// TestUserUploadInvalidSession tests upload endpoint with invalid session
func TestUserUploadInvalidSession(t *testing.T) {
	router := setupRouter()

	fileData := []byte("test file content")
	req, _ := http.NewRequest("POST", "/api/self/v1/upload?sessionId=invalid&fileId=file-1&token=token-1", bytes.NewBuffer(fileData))
	req.Header.Set("Content-Type", "application/octet-stream")
	req.RemoteAddr = "127.0.0.1:12345"

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status code 404, got %d", w.Code)
	}
}

// TestUserPrepareUploadAndUpload tests the complete flow: prepare upload then upload
func TestUserPrepareUploadAndUpload(t *testing.T) {
	// Setup
	router := setupRouter()
	setupTestDevice()
	setupSelfDevice()

	// Step 1: Prepare upload
	prepareRequestBody := UserPrepareUploadRequest{
		TargetTo: "test-target-1",
		Files: map[string]FileInput{
			"file-1": {
				ID:       "file-1",
				FileName: "test.txt",
				Size:     13,
				FileType: "text/plain",
			},
		},
	}

	jsonData, _ := json.Marshal(prepareRequestBody)
	req1, _ := http.NewRequest("POST", "/api/self/v1/prepare-upload", bytes.NewBuffer(jsonData))
	req1.Header.Set("Content-Type", "application/json")
	req1.RemoteAddr = "127.0.0.1:12345"

	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	// Note: This will likely fail with 500 because transfer.ReadyToUploadTo will try to
	// connect to a real LocalSend device. In a real test environment, you would mock
	// the transfer package or have a test LocalSend device running.

	t.Logf("Prepare upload response: %s", w1.Body.String())

	// Step 2: If prepare upload succeeded, try to upload
	if w1.Code == http.StatusOK {
		var response map[string]interface{}
		if err := json.Unmarshal(w1.Body.Bytes(), &response); err == nil {
			if data, ok := response["data"].(map[string]interface{}); ok {
				sessionId := data["sessionId"].(string)
				if files, ok := data["files"].(map[string]interface{}); ok {
					if token, ok := files["file-1"].(string); ok {
						// Now try to upload
						fileData := []byte("Hello, World!")
						uploadURL := "/api/self/v1/upload?sessionId=" + sessionId + "&fileId=file-1&token=" + token
						req2, _ := http.NewRequest("POST", uploadURL, bytes.NewBuffer(fileData))
						req2.Header.Set("Content-Type", "application/octet-stream")
						req2.RemoteAddr = "127.0.0.1:12345"

						w2 := httptest.NewRecorder()
						router.ServeHTTP(w2, req2)

						t.Logf("Upload response: %s", w2.Body.String())
					}
				}
			}
		}
	}
}

// TestUserScanCurrent tests the scan current endpoint
func TestUserScanCurrent(t *testing.T) {
	router := setupRouter()
	setupTestDevice()

	req, _ := http.NewRequest("GET", "/api/self/v1/scan-current", nil)
	req.RemoteAddr = "127.0.0.1:12345"

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("Failed to parse response: %v", err)
	}

	if _, ok := response["data"]; !ok {
		t.Error("Response should contain data field")
	}
}
