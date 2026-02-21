package tool

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/moyoez/localsend-go/types"
)

var (
	ConfigPath           = "config.yaml" // be aware that it can be changed, default to ./config.yaml
	CurrentConfig        types.AppConfig
	ProgramCurrentConfig types.ProgramConfig
	// flagOverrides holds CLI flag overrides for the config API (set by main after SetFlags).
	flagOverrides *types.Config
)

// SetFlagOverrides stores the current CLI flag config for the config API to merge.
func SetFlagOverrides(c *types.Config) {
	flagOverrides = c
}

// GetFlagOverrides returns a copy of flag overrides, or nil if not set.
func GetFlagOverrides() types.Config {
	if flagOverrides == nil {
		return types.Config{}
	}
	return *flagOverrides
}

func init() {
	ProgramCurrentConfig = DefaultProgramConfig()
}

func SetProgramConfigStatus(pin string, autoSave bool, autoSaveFromFavorites bool) {
	ProgramCurrentConfig.Pin = pin
	ProgramCurrentConfig.AutoSave = autoSave
	ProgramCurrentConfig.AutoSaveFromFavorites = autoSaveFromFavorites
}

func GetProgramConfigStatus() types.ProgramConfig {
	return ProgramCurrentConfig
}

// this save to memory , no file provided.
func DefaultProgramConfig() types.ProgramConfig {
	return types.ProgramConfig{
		Pin:                   "",
		AutoSave:              true,
		AutoSaveFromFavorites: false,
	}
}

func defaultConfig() types.AppConfig {
	return types.AppConfig{
		Alias:                 NameGenerator(), // so I change it, use official name generator. :Ciallo~
		Version:               "2.0",           // Protocol Version: maybe(
		DeviceModel:           "steamdeck",     // you can change it if you prefer.
		DeviceType:            "headless",      // maybe you can change it, I promise it will not burn others machine:(
		Fingerprint:           "",              // will be set based on protocol
		Port:                  53317,           // default , in normal cases you dont need to change it.
		Protocol:              "https",         // ENCRYPTION is very important, I dont mind you to switch to http if you are in your home or safe network.
		Download:              false,           // document said that  default is false, i dont know how to use it, so make it default.
		Announce:              true,
		AutoSaveFromFavorites: false,
		FavoriteDevices:       []types.FavoriteDeviceEntry{}, // I dont like yaml btw
	}
}

// generateRandomFingerprint generates a random 32-character fingerprint
func generateRandomFingerprintForConfig() string {
	return strings.ReplaceAll(GenerateRandomUUID(), "-", "")
}

func LoadConfig(path string) (types.AppConfig, error) {
	var configChanged bool
	if path == "" {
		path = ConfigPath
	}
	// Update DefaultConfigPath so it can be used for saving favorites later
	ConfigPath = path

	cfg := defaultConfig()

	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Config file doesn't exist, create with default values
			// Default protocol is https, so generate fingerprint from TLS certificate
			cfg.Fingerprint = GetOrCreateFingerprintFromConfig(&cfg)
			if writeErr := writeDefaultConfig(path, cfg); writeErr != nil {
				return cfg, fmt.Errorf("config file not found, and failed to generate default config: %v", writeErr)
			}
			DefaultLogger.Infof("Created new config file with fingerprint and certificate")
			CurrentConfig = cfg
			ProgramCurrentConfig.AutoSaveFromFavorites = cfg.AutoSaveFromFavorites
			return cfg, nil
		}
		return cfg, fmt.Errorf("failed to read config file: %v", err)
	}
	if info.IsDir() {
		return cfg, fmt.Errorf("config file path is a directory: %s", path)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return cfg, fmt.Errorf("failed to read config file: %v", err)
	}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return cfg, fmt.Errorf("failed to parse config file: %v", err)
	}

	// Handle fingerprint based on protocol
	if cfg.Protocol == "https" {
		// HTTPS mode: fingerprint should match TLS certificate
		oldFingerprint := cfg.Fingerprint
		tlsFingerprint := GetOrCreateFingerprintFromConfig(&cfg)
		if oldFingerprint != tlsFingerprint {
			DefaultLogger.Infof("Updating fingerprint to match TLS certificate: %s -> %s", oldFingerprint, tlsFingerprint)
			cfg.Fingerprint = tlsFingerprint
			configChanged = true
		}
	} else {
		// HTTP mode: use random fingerprint if not set
		if cfg.Fingerprint == "" {
			cfg.Fingerprint = generateRandomFingerprintForConfig()
			DefaultLogger.Infof("HTTP mode: generated random fingerprint")
			configChanged = true
		}
		DefaultLogger.Debugf("HTTP mode: no TLS certificate needed (certificate preserved for HTTPS)")
	}

	// Save config if changed
	if configChanged {
		if writeErr := writeDefaultConfig(path, cfg); writeErr != nil {
			DefaultLogger.Warnf("Failed to update config file: %v", writeErr)
		}
	}

	CurrentConfig = cfg
	ProgramCurrentConfig.AutoSaveFromFavorites = cfg.AutoSaveFromFavorites
	return cfg, nil
}

func writeDefaultConfig(path string, cfg types.AppConfig) error {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func GetCurrentConfig() *types.AppConfig {
	return &CurrentConfig
}

// UpdateCurrentConfigAndPersist updates in-memory config and program config and writes to the config file.
func UpdateCurrentConfigAndPersist(cfg *types.AppConfig, prog types.ProgramConfig) {
	if cfg != nil {
		CurrentConfig = *cfg
	}
	ProgramCurrentConfig = prog
	if err := writeDefaultConfig(ConfigPath, CurrentConfig); err != nil {
		DefaultLogger.Warnf("Failed to persist config: %v", err)
	}
}

// PersistAppConfig updates in-memory AppConfig and writes config.yaml only (settings API: config file only).
func PersistAppConfig(cfg *types.AppConfig) {
	if cfg == nil {
		return
	}
	CurrentConfig = *cfg
	ProgramCurrentConfig.AutoSaveFromFavorites = cfg.AutoSaveFromFavorites
	if err := writeDefaultConfig(ConfigPath, CurrentConfig); err != nil {
		DefaultLogger.Warnf("Failed to persist config: %v", err)
	}
}
