# Voice Input Design Spec

## 概述

台式机无麦克风，使用手机作为语音输入源。手机端利用豆包等成熟输入法完成语音转文字，本项目只做文字传输和桌面输入。

**核心流程**：手机说话 → 豆包语音转文字 → WebSocket 传输 → 桌面模拟键盘输入

## 架构

```
📱 手机浏览器          🔗 WebSocket           🖥️ 桌面 Electron
┌─────────────┐         ┌──────────┐         ┌──────────────────┐
│ textarea    │ ──────▶ │  JSON    │ ──────▶ │ ws server        │
│ + 输入法填充 │         │  message │         │ keyboard sim     │
│             │ ◀────── │          │ ◀────── │ http server      │
│ 状态指示    │         │          │         │ qr generator     │
└─────────────┘         └──────────┘         │ system tray      │
                                              └──────────────────┘
```

### 组件职责

| 组件 | 职责 | 技术 |
|------|------|------|
| 手机网页 | 文本框接收输入法文字，WebSocket 发送 | 纯 HTML/CSS/JS |
| WebSocket Server | 接收文字，返回确认 | ws |
| 键盘模拟 | 将文字模拟为键盘输入 | nut-js |
| HTTP Server | 提供手机端网页和 API | Express |
| QR 码生成 | 生成扫码连接 URL | qrcode |
| 系统托盘 | 后台常驻，托盘图标+菜单 | Electron |

## 数据传输协议

### WebSocket 消息格式

```json
// 手机 → 桌面：发送文字
{ "type": "text", "payload": "你好世界" }

// 桌面 → 手机：确认收到
{ "type": "ack", "payload": "ok" }

// 心跳
{ "type": "ping" }
{ "type": "pong" }
```

### 发送策略

实时发送 + 300ms 防抖。监听 textarea 的 `input` 事件，300ms 无新输入后自动发送。豆包填入文字的间隙不会被误发。

## 连接流程

1. 桌面启动 Electron 应用，服务端（HTTP + WebSocket）在本地启动
2. 获取本机局域网 IP，生成二维码（指向 `http://<本机IP>:<端口>`）
3. 手机扫码，浏览器打开网页
4. 页面自动建立 WebSocket 连接
5. 连接成功，状态指示变绿，文字开始实时传输

## 异常处理

| 场景 | 处理 |
|------|------|
| WebSocket 断开 | 手机端自动重连，指数退避，最多 10 次 |
| 电脑休眠/重启 | 服务自启动（Electron 开机启动），手机自动重连 |
| 发送失败 | toast 提示，文字保留在输入框不丢失 |
| 切到其他 App | 文字保留在 textarea，切回继续 |

## 桌面托盘菜单

- 显示二维码
- 连接状态（已连接/等待连接/连接设备名）
- 开机自启（复选框）
- 退出

## 项目结构

```
voice-input/
├── phone/
│   └── index.html          # 手机端网页（单文件）
├── desktop/
│   ├── package.json
│   ├── main.js             # Electron 主进程 + 托盘
│   ├── server.js           # HTTP + WebSocket 服务
│   ├── keyboard.js         # 键盘模拟模块
│   └── public/             # 静态资源（手机网页也放这里）
│       └── index.html
└── README.md
```

## 平台支持

- **主目标**：Windows 桌面 + iPhone 手机
- **扩展性**：nut-js 支持 macOS/Linux 键盘模拟，手机网页天然跨平台
- 后期可扩展 macOS 桌面端（仅需适配托盘和开机启动）

## 不做的

- 不自行实现语音转文字（依赖豆包等输入法）
- 不做云端中转（仅局域网直连）
- 不支持多手机同时连接
- 不做 HTTPS（局域网场景无必要）
- 不做 App Store / Play Store 分发

## 依赖

- Node.js >= 18
- npm 包：electron, ws, express, nut-js, qrcode
- 手机端：现代浏览器，无额外依赖
