<div align="center">

# Localsend-base-protocol-golang

**Language / 语言:** English | [简体中文](README-zh-CN.md)

</div>

---

### Overview

This is a server-client implementation of the [LocalSend Protocol](https://github.com/localsend/protocol) written in Go.

This implementation provides a Go-based server and client that follows the LocalSend Protocol v2.1 specification.

Actually it used for [decky-localsend](https://github.com/moyoez/decky-localsend)

### Features

- ✅ Full implementation of LocalSend Protocol v2.1
- ✅ HTTP/HTTPS server support
- ✅ UDP multicast discovery
- ✅ File upload/download capabilities
- ✅ Device registration and discovery
- ✅ Session management
- ✅ TLS/SSL support with self-signed certificates

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

### TODO

1. **Manual confirmation as receiver** - Implement manual confirmation mechanism for receiving files
2. **API parameter modifications** - Review and update API parameters as needed
3. **Bug fixes and performance improvements** - Address potential bugs and optimize performance

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
