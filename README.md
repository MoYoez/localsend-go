<div align="center">

# Localsend-Go

**Language / 语言:** English | [简体中文](README-zh-CN.md)

</div>

---

### Overview

This is a server-client implementation of the [LocalSend Protocol](https://github.com/localsend/protocol) written in Go.

This implementation provides a Go-based server and client that follows the LocalSend Protocol v2.1 specification.

Actually it used for [decky-localsend](https://github.com/moyoez/decky-localsend)

### Project Structure

```
.
├── api/              # API server implementation
│   ├── controllers/  # Request handlers
│   ├── models/       # Data models
│   └── middlewares/  # HTTP middlewares
├── boardcast/        # Multicast discovery
├── transfer/         # File transfer logic
├── share/            # Shared utilities
├── tool/             # Helper tools
└── types/            # Type definitions
```

### Command-Line Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-log` | string | `prod` | Log mode: `dev`, `prod`, or `none` |
| `-useMultcastAddress` | string | (empty) | Override the default multicast address |
| `-useMultcastPort` | int | 0 | Override the default multicast port |
| `-useConfigPath` | string | `config.yaml` | Config file path |
| `-useDefaultUploadFolder` | string | `uploads` | Default folder for received uploads |
| `-useReferNetworkInterface` | string | `*` | Network interface (e.g. `en0`, `eth0`) or `*` for all |
| `-usePin` | string | (empty) | PIN for upload (only for incoming upload request) |
| `-useAutoSave` | bool | false | If false, user must confirm before receiving files |
| `-useAutoSaveFromFavorites` | bool | false | If true and useAutoSave is false, auto-accept from favorite devices only |
| `-useAlias` | string | (empty) | Device alias shown on the network |
| `-skipNotify` | bool | false | If true, skip notify mode |
| `-notifyUsingWebsocket` | bool | false | If true, broadcast notifications over WebSocket for web UI |
| `-noDeckyMode` | bool | false | If true, do not use Unix socket for notify (only WebSocket when notifyUsingWebsocket) |
| `-useHttp` | bool | false | If true, use HTTP; if false, use HTTPS (alias for protocol) |
| `-scanTimeout` | int | 500 | Scan timeout in seconds; 0 to disable |
| `-useDownload` | bool | false | If true, enable download API (prepare-download, download, download page) |
| `-useWebOutPath` | string | (empty) | Path to Next.js static export for download page |
| `-doNotMakeSessionFolder` | bool | false | If true, do not create session subfolder; same-name files saved as name-2.ext, name-3.ext, ... |

> Default scan mode is mixed (UDP + HTTP). If the app cannot see other devices after a long time, try triggering "Scan" on the other LocalSend client.

### TODO

None Currently.

### Known BUGS

- Cannot use web localsend (Due to localsend use v3 but not explained in protocol document.)
- In some cases (e.g. localsend in backend too long time (I guess), being scanned machine cannot detected the service, restart service is helpful. )

### Getting Started

```bash
# Build the project
go build -o localsend-server

# Run the server
./localsend-server
```

### Configuration

The server can be configured through command-line flags or configuration files. See the code for available options.

### License

This project implements the LocalSend Protocol. Please refer to the [LocalSend Protocol repository](https://github.com/localsend/protocol) for protocol specifications.
