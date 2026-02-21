package types

// ConfigResponse is the JSON shape for GET /api/self/v1/config (full config.yaml).
type ConfigResponse struct {
	Alias                 string                `json:"alias"`
	Version               string                `json:"version"`
	DeviceModel           string                `json:"device_model"`
	DeviceType            string                `json:"device_type"`
	Fingerprint           string                `json:"fingerprint"`
	Port                  int                   `json:"port"`
	Protocol              string                `json:"protocol"`
	Download              bool                  `json:"download"`
	Announce              bool                  `json:"announce"`
	CertPEM               string                `json:"cert_pem"`
	KeyPEM                string                `json:"key_pem"`
	AutoSaveFromFavorites bool                  `json:"auto_save_from_favorites"`
	FavoriteDevices       []FavoriteDeviceEntry `json:"favorite_devices"`
}

// ConfigPatchRequest is the JSON body for PATCH /api/self/v1/config (all optional, merge into config.yaml).
type ConfigPatchRequest struct {
	Alias                 *string               `json:"alias"`
	Version               *string               `json:"version"`
	DeviceModel           *string               `json:"device_model"`
	DeviceType            *string               `json:"device_type"`
	Fingerprint           *string               `json:"fingerprint"`
	Port                  *int                  `json:"port"`
	Protocol              *string               `json:"protocol"`
	Download              *bool                 `json:"download"`
	Announce              *bool                 `json:"announce"`
	CertPEM               *string               `json:"cert_pem"`
	KeyPEM                *string               `json:"key_pem"`
	AutoSaveFromFavorites *bool                 `json:"auto_save_from_favorites"`
	FavoriteDevices       *[]FavoriteDeviceEntry `json:"favorite_devices"`
}
