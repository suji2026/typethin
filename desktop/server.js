const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { typeText } = require('./keyboard');
const QRCode = require('qrcode');

function getLocalIP() {
  try {
    // 通过默认路由获取实际在用的网卡 IP
    const output = execSync('route print 0.0.0.0', { encoding: 'utf8' });
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\S+)\s+(\S+)\s+(\d+)/);
      if (match && match[1] !== 'On-link') {
        // match[2] 就是默认路由对应的本地 IP
        return match[2];
      }
    }
  } catch {
    // 回退到简单方式
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function startServer(port = 9527) {
  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/qr', async (_req, res) => {
    try {
      const ip = getLocalIP();
      const url = `http://${ip}:${port}`;
      const dataUrl = await QRCode.toDataURL(url);
      res.json({ url, dataUrl });
    } catch {
      res.status(500).json({ error: 'QR generation failed' });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  server._wss = wss;

  wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'text' && msg.payload != null) {
          await typeText(msg.payload);
          ws.send(JSON.stringify({ type: 'ack', payload: 'ok' }));
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    });
  });

  server.listen(port, () => {
    const ip = getLocalIP();
    console.log(`Server: http://${ip}:${port}`);
  });

  return { server, wss, port };
}

module.exports = { startServer, getLocalIP };
