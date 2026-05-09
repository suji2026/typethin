const { app, Tray, Menu, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const { startServer, getLocalIP } = require('./server');

let tray = null;
let qrWindow = null;
let serverInfo = null;
let connected = false;
let statusInterval = null;
let currentIconColor = null;

function createTrayIcon(r, g, b) {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let isPixelSet = false;
      
      // 两个 T 并排，顶部横杠连接，横杠加长
      // 顶部横杠（连接两个 T）- 加长到两端
      if (y >= 3 && y <= 5 && x >= 2 && x <= 13) {
        isPixelSet = true;
      }
      // 左侧 T 的竖杠
      if (x >= 4 && x <= 6 && y >= 3 && y <= 12) {
        isPixelSet = true;
      }
      // 右侧 T 的竖杠
      if (x >= 9 && x <= 11 && y >= 3 && y <= 12) {
        isPixelSet = true;
      }
      
      if (isPixelSet) {
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function updateTrayIcon() {
  if (!tray) return;
  const iconColor = connected ? { r: 0x4a, g: 0xde, b: 0x80 } : { r: 0x80, g: 0x80, b: 0x80 };
  if (currentIconColor !== `${iconColor.r},${iconColor.g},${iconColor.b}`) {
    currentIconColor = `${iconColor.r},${iconColor.g},${iconColor.b}`;
    const icon = createTrayIcon(iconColor.r, iconColor.g, iconColor.b);
    tray.setImage(icon);
  }
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
  tray.setToolTip(connected ? 'TypeThin - 已连接' : 'TypeThin - 等待连接');
}

function showQRWindow() {
  if (!serverInfo) return;
  if (qrWindow) {
    qrWindow.show();
    qrWindow.focus();
    return;
  }

  const windowIcon = createTrayIcon(0x00, 0x00, 0x00);

  qrWindow = new BrowserWindow({
    width: 340,
    height: 420,
    title: 'TypeThin',
    icon: windowIcon,
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
    connected = false;
    const icon = createTrayIcon(0x80, 0x80, 0x80);
    currentIconColor = '128,128,128';
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
        updateTrayIcon();
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
