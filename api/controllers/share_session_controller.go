package controllers

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/moyoez/localsend-go/api/models"
	"github.com/moyoez/localsend-go/share"
	"github.com/moyoez/localsend-go/tool"
	"github.com/moyoez/localsend-go/types"
)

// shareSessionSkipSHASingleFileThreshold: when single-file count exceeds this, skip SHA256 for single files (same as folders).
const shareSessionSkipSHASingleFileThreshold = 50

const shareUploadsDir = "share-uploads"

// UserCreateShareSession creates a share session for the download API.
// POST /api/self/v1/create-share-session
// Supports: application/json (body with files as fileUrl map) or multipart/form-data (uploaded files; fields: pin, autoAccept; file parts keyed by fileId).
func UserCreateShareSession(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		handleCreateShareSessionMultipart(c)
		return
	}

	// JSON body
	var request types.CreateShareSessionRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Invalid request body: "+err.Error()))
		return
	}
	if len(request.Files) == 0 {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("files is required and must not be empty"))
		return
	}
	sessionId, downloadUrl, err := createShareSessionFromFiles(request.Files, request.Pin, request.AutoAccept, "")
	if err != nil {
		c.JSON(http.StatusBadRequest, tool.FastReturnError(err.Error()))
		return
	}
	c.JSON(http.StatusOK, tool.FastReturnSuccessWithData(types.CreateShareSessionResponse{
		SessionId:   sessionId,
		DownloadUrl: downloadUrl,
	}))
}

func handleCreateShareSessionMultipart(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Invalid multipart form: "+err.Error()))
		return
	}
	pin := strings.TrimSpace(c.PostForm("pin"))
	autoAccept := c.PostForm("autoAccept") == "true" || c.PostForm("autoAccept") == "1"

	// Collect all file parts: form.File is map[string][]*FileHeader; key is fileId from frontend
	if len(form.File) == 0 {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("files is required and must not be empty"))
		return
	}

	sessionId := tool.GenerateShortSessionID()
	baseDir := filepath.Join(shareUploadsDir, sessionId)
	if err := os.MkdirAll(baseDir, 0o750); err != nil {
		c.JSON(http.StatusInternalServerError, tool.FastReturnError("Failed to create upload dir: "+err.Error()))
		return
	}
	models.RegisterShareSessionTempDir(sessionId, baseDir)

	filesMap := make(map[string]types.FileInput)
	for fileId, headers := range form.File {
		if fileId == "" || len(headers) == 0 {
			continue
		}
		header := headers[0]
		safeName := filepath.Base(header.Filename)
		if safeName == "" || safeName == "." {
			safeName = fileId
		}
		destPath := tool.NextAvailablePath(baseDir, safeName)
		if err := c.SaveUploadedFile(header, destPath); err != nil {
			_ = os.RemoveAll(baseDir)
			models.RemoveShareSession(sessionId)
			c.JSON(http.StatusInternalServerError, tool.FastReturnError("Failed to save file: "+err.Error()))
			return
		}
		absPath, _ := filepath.Abs(destPath)
		filesMap[fileId] = types.FileInput{
			FileUrl: "file://" + absPath,
		}
	}
	if len(filesMap) == 0 {
		_ = os.RemoveAll(baseDir)
		c.JSON(http.StatusBadRequest, tool.FastReturnError("files is required and must not be empty"))
		return
	}

	sid, downloadUrl, err := createShareSessionFromFiles(filesMap, pin, autoAccept, sessionId)
	if err != nil {
		_ = os.RemoveAll(baseDir)
		c.JSON(http.StatusBadRequest, tool.FastReturnError(err.Error()))
		return
	}
	c.JSON(http.StatusOK, tool.FastReturnSuccessWithData(types.CreateShareSessionResponse{
		SessionId:   sid,
		DownloadUrl: downloadUrl,
	}))
}

// createShareSessionFromFiles builds ShareFileEntry map from FileInput map, caches session, returns sessionId and downloadUrl.
// If existingSessionId is non-empty, it is used; otherwise a new one is generated.
func createShareSessionFromFiles(filesInput map[string]types.FileInput, pin string, autoAccept bool, existingSessionId string) (sessionId string, downloadUrl string, err error) {
	if len(filesInput) == 0 {
		return "", "", fmt.Errorf("files is required and must not be empty")
	}

	singleFileCount := 0
	for _, fileInput := range filesInput {
		if fileInput.FileUrl == "" {
			continue
		}
		parsed, err := url.Parse(fileInput.FileUrl)
		if err != nil || parsed.Scheme != "file" {
			continue
		}
		info, err := os.Stat(parsed.Path)
		if err != nil {
			continue
		}
		if !info.IsDir() {
			singleFileCount++
		}
	}
	skipSHAForSingleFiles := singleFileCount > shareSessionSkipSHASingleFileThreshold

	files := make(map[string]types.ShareFileEntry)
	for fileId, fileInput := range filesInput {
		input := fileInput
		if input.FileUrl == "" {
			return "", "", fmt.Errorf("fileUrl is required for %s", fileId)
		}
		parsedUrl, err := url.Parse(input.FileUrl)
		if err != nil || parsedUrl.Scheme != "file" {
			return "", "", fmt.Errorf("invalid fileUrl for %s: must be file:// path", fileId)
		}
		localPath := parsedUrl.Path

		info, err := os.Stat(localPath)
		if err != nil {
			if os.IsNotExist(err) {
				return "", "", fmt.Errorf("file or folder not found: %s", localPath)
			}
			return "", "", fmt.Errorf("failed to access %s: %v", localPath, err)
		}

		if info.IsDir() {
			fileInputMap, pathMap, err := tool.ProcessPathInput(localPath, false)
			if err != nil {
				return "", "", fmt.Errorf("invalid folder %s: %v", fileId, err)
			}
			for id, inp := range fileInputMap {
				entryPath := pathMap[id]
				idVal := inp.ID
				if idVal == "" {
					idVal = id
				}
				files[id] = types.ShareFileEntry{
					FileInfo: types.FileInfo{
						ID:       idVal,
						FileName: inp.FileName,
						Size:     inp.Size,
						FileType: inp.FileType,
						SHA256:   inp.SHA256,
						Preview:  inp.Preview,
					},
					LocalPath: entryPath,
				}
			}
			continue
		}

		if err := tool.ProcessFileInput(&input, !skipSHAForSingleFiles); err != nil {
			return "", "", fmt.Errorf("invalid file %s: %v", fileId, err)
		}
		fileIdVal := input.ID
		if fileIdVal == "" {
			fileIdVal = fileId
		}
		files[fileId] = types.ShareFileEntry{
			FileInfo: types.FileInfo{
				ID:       fileIdVal,
				FileName: input.FileName,
				Size:     input.Size,
				FileType: input.FileType,
				SHA256:   input.SHA256,
				Preview:  input.Preview,
			},
			LocalPath: localPath,
		}
	}

	if existingSessionId != "" {
		sessionId = existingSessionId
	} else {
		sessionId = tool.GenerateShortSessionID()
	}
	session := &types.ShareSession{
		SessionId:  sessionId,
		Files:      files,
		CreatedAt:  time.Now(),
		Pin:        pin,
		AutoAccept: autoAccept,
	}
	models.CacheShareSession(session)

	selfDeviceInfo := models.GetSelfDevice()
	if selfDeviceInfo == nil {
		return "", "", fmt.Errorf("local device information not configured")
	}
	protocol := selfDeviceInfo.Protocol
	port := 53317
	host := "localhost"
	if infos := share.GetSelfNetworkInfos(); len(infos) > 0 {
		host = infos[0].IPAddress
	}
	downloadUrl = fmt.Sprintf("%s://%s:%d/?session=%s", protocol, host, port, sessionId)
	return sessionId, downloadUrl, nil
}

// UserCloseShareSession closes a share session
// DELETE /api/self/v1/close-share-session?sessionId=xxx
func UserCloseShareSession(c *gin.Context) {
	sessionId := strings.TrimSpace(c.Query("sessionId"))
	if sessionId == "" {
		c.JSON(http.StatusBadRequest, tool.FastReturnError("Missing required parameter: sessionId"))
		return
	}
	_, ok := models.GetShareSession(sessionId)
	if !ok {
		c.JSON(http.StatusNotFound, tool.FastReturnError("Session not found or expired"))
		return
	}
	models.RemoveShareSession(sessionId)
	c.JSON(http.StatusOK, tool.FastReturnSuccess())
}
