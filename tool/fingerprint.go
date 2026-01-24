package tool

func CheckFingerPrintIsSame(FromFingerprint string) bool {
	selfDevice := CurrentConfig.Fingerprint
	if selfDevice == "" {
		return false
	}
	return FromFingerprint == selfDevice
}
