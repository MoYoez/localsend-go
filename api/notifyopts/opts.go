package notifyopts

var notifyWSEnabled bool

func SetNotifyWSEnabled(v bool) { notifyWSEnabled = v }
func NotifyWSEnabled() bool     { return notifyWSEnabled }
