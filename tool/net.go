package tool

import "net"

// UDP4 unsupport multicast
func RejectUnsupportNetworkInterface(iface *net.Interface) bool {
	if iface.Flags&net.FlagUp == 0 {
		return true
	}
	if iface.Flags&net.FlagLoopback != 0 {
		return true
	}
	if iface.Flags&net.FlagPointToPoint != 0 {
		return true // utun / tun / vpn
	}
	if iface.Flags&net.FlagMulticast == 0 {
		return true
	}
	// reject no v4 ipaddress.
	ips, err := iface.Addrs()
	if err != nil {
		return true
	}
	for _, ip := range ips {
		if ipnet, ok := ip.(*net.IPNet); ok && ipnet.IP.To4() != nil && !ipnet.IP.IsLoopback() {
			return false
		}
	}
	return true
}

func GetLocalIPv4Set() map[string]struct{} {
	result := make(map[string]struct{})

	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return result
	}

	for _, addr := range addrs {
		ipnet, ok := addr.(*net.IPNet)
		if !ok {
			continue
		}

		ip := ipnet.IP
		if ip == nil || ip.IsLoopback() {
			continue
		}

		ipv4 := ip.To4()
		if ipv4 == nil {
			continue
		}

		result[ipv4.String()] = struct{}{}
	}

	return result
}
