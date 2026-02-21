package types

// ConfigResponse is the JSON shape for GET/PATCH /api/self/v1/config (Decky parity).
type ConfigResponse struct {
	Alias                  string `json:"alias"`
	DownloadFolder         string `json:"download_folder"`
	Pin                    string `json:"pin"`
	AutoSave               bool   `json:"auto_save"`
	AutoSaveFromFavorites  bool   `json:"auto_save_from_favorites"`
	SkipNotify             bool   `json:"skip_notify"`
	UseHttps               bool   `json:"use_https"`
	NetworkInterface       string `json:"network_interface"`
	ScanTimeout            int    `json:"scan_timeout"`
	UseDownload            bool   `json:"use_download"`
	DoNotMakeSessionFolder bool   `json:"do_not_make_session_folder"`
}

// ConfigPatchRequest is the JSON body for PATCH /api/self/v1/config (partial update, all fields optional).
type ConfigPatchRequest struct {
	Alias                  *string `json:"alias"`
	DownloadFolder         *string `json:"download_folder"`
	Pin                    *string `json:"pin"`
	AutoSave               *bool   `json:"auto_save"`
	AutoSaveFromFavorites  *bool   `json:"auto_save_from_favorites"`
	UseHttps               *bool   `json:"use_https"`
	NetworkInterface       *string `json:"network_interface"`
	ScanTimeout            *int    `json:"scan_timeout"`
	UseDownload            *bool   `json:"use_download"`
	DoNotMakeSessionFolder *bool   `json:"do_not_make_session_folder"`
}
