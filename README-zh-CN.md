# Localsend-base-protocol-golang

**语言:** [English](../README.md) | 简体中文

---

## 概述

这是基于 [LocalSend 协议](https://github.com/localsend/protocol) 的服务器客户端实现，使用 Go 语言编写。

本实现提供了一个基于 Go 的服务器和客户端，遵循 LocalSend 协议 v2.1 规范。

实际上这是为 [decky-plugin-localsend](https://github.com/moyoez/decky-plugin-localsend) 编写的工具

## 功能特性

- ✅ 完整实现 LocalSend 协议 v2.1
- ✅ HTTP/HTTPS 服务器支持
- ✅ UDP 组播发现
- ✅ 文件上传/下载功能
- ✅ 设备注册和发现
- ✅ 会话管理
- ✅ TLS/SSL 支持（自签名证书）

## 项目结构

```
.
├── api/              # API 服务器实现
│   ├── controllers/  # 请求处理器
│   ├── models/       # 数据模型
│   └── middlewares/  # HTTP 中间件
├── boardcast/        # 组播发现
├── transfer/         # 文件传输逻辑
├── share/            # 共享工具
├── tool/             # 辅助工具
└── types/            # 类型定义
```

## TODO

1. **作为收方手动确认** - 实现接收文件时的手动确认机制
2. **接口修改参数** - 审查并根据需要更新 API 参数
3. **可能存在的 bug，性能问题** - 修复潜在的 bug 并优化性能

## 快速开始

```bash
# 构建项目
go build -o localsend-server

# 运行服务器
./localsend-server
```

## 配置

服务器可以通过命令行参数或配置文件进行配置。请查看代码了解可用选项。

## 许可证

本项目实现了 LocalSend 协议。有关协议规范，请参考 [LocalSend 协议仓库](https://github.com/localsend/protocol)。
