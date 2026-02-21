# Localsend-Go

**语言:** [English](../README.md) | 简体中文

---

## 概述

这是基于 [LocalSend 协议](https://github.com/localsend/protocol) 的服务器客户端实现，使用 Go 语言编写。

本实现提供了一个基于 Go 的服务器和客户端，遵循 LocalSend 协议 v2.1 规范。

实际上这是为 [decky-localsend](https://github.com/moyoez/decky-localsend) 编写的工具

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

### 命令行参数（Flags）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `-log` | string | `prod` | 日志模式：`dev`、`prod` 或 `none` |
| `-useMultcastAddress` | string | (空) | 覆盖默认组播地址 |
| `-useMultcastPort` | int | 0 | 覆盖默认组播端口 |
| `-useConfigPath` | string | `config.yaml` | 配置文件路径 |
| `-useDefaultUploadFolder` | string | `uploads` | 接收文件默认保存目录 |
| `-useReferNetworkInterface` | string | `*` | 网络接口（如 `en0`、`eth0`）或 `*` 表示全部 |
| `-usePin` | string | (空) | 上传时要求的 PIN（仅对接收方生效） |
| `-useAutoSave` | bool | false | 若为 false，接收文件前需手动确认 |
| `-useAutoSaveFromFavorites` | bool | false | 若为 true 且 useAutoSave 为 false，仅对收藏设备自动接收 |
| `-useAlias` | string | (空) | 设备在网络上显示的别名 |
| `-skipNotify` | bool | false | 若为 true，关闭通知模式 |
| `-notifyUsingWebsocket` | bool | false | 若为 true，通过 WebSocket 向 Web 管理页推送通知 |
| `-noDeckyMode` | bool | false | 若为 true，不使用 Unix socket 通知（仅在 notifyUsingWebsocket 时用 WebSocket） |
| `-useHttp` | bool | false | 若为 true 使用 HTTP，否则使用 HTTPS（对应协议配置） |
| `-scanTimeout` | int | 500 | 扫描超时秒数；0 表示不超时 |
| `-useDownload` | bool | false | 若为 true，启用下载 API（prepare-download、download、下载页） |
| `-useWebOutPath` | string | (空) | Next.js 静态导出路径（用于下载页） |
| `-doNotMakeSessionFolder` | bool | false | 若为 true，不创建会话子目录；同名文件保存为 name-2.ext、name-3.ext 等 |

#### 小提示

> 默认使用混合扫描（UDP + HTTP）。若长时间后扫不到其他设备，可在对方 LocalSend 上手动点一次「扫描」。

## TODO

None Currently

## 已知 BUG

1. Web Localsend 用不了 （本来就用不了）
2. 在一些情况下，Localsend 其他客户端 因为省电策略或者别的乱七八糟的原因，可能会扫不到，需要重新开下(

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
