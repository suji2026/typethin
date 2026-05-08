const { app, Tray, Menu, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const { startServer, getLocalIP } = require('./server');

let tray = null;
let qrWindow = null;
let serverInfo = null;
let connected = false;
let statusInterval = null;

function createTrayIcon() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = 7.5, cy = 7.5, r = 6;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r) {
        buf[i] = 0xe9;
        buf[i + 1] = 0x45;
        buf[i + 2] = 0x60;
        buf[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function updateMenu() {
  const menu = Menu.buildFromTemplate([
    { label: '显示二维码', click: showQRWindow },
    { type: 'separator' },
    { label: connected ? '状态: 已连接' : '状态: 等待连接', enabled: false },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
      }
    },
    { type: 'separator' },
    { label: '退出', click: () => { app.quit(); } }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip(connected ? '语音输入 - 已连接' : '语音输入 - 等待连接');
}

function showQRWindow() {
  if (!serverInfo) return;
  if (qrWindow) {
    qrWindow.show();
    qrWindow.focus();
    return;
  }

  qrWindow = new BrowserWindow({
    width: 340,
    height: 420,
    title: '扫码连接',
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false }
  });

  qrWindow.loadURL(`http://localhost:${serverInfo.port}/qr.html`);

  qrWindow.on('close', (e) => {
    e.preventDefault();
    qrWindow.hide();
  });
}

app.whenReady().then(() => {
  serverInfo = startServer(9527);

  serverInfo.server.on('error', (err) => {
    console.error('Server error:', err);
  });

  serverInfo.server.on('listening', () => {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    updateMenu();
    showQRWindow();

    statusInterval = setInterval(() => {
      const wasConnected = connected;
      const wss = serverInfo.wss;
      const clientCount = wss ? [...wss.clients].filter(c => c.readyState === 1).length : 0;
      connected = clientCount > 0;
      if (connected !== wasConnected) {
        updateMenu();
      }
    }, 1000);
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  if (statusInterval) clearInterval(statusInterval);
  if (serverInfo && serverInfo.server) {
    serverInfo.server.close();
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
