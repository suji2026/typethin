const http = require('http');
const { WebSocket } = require('ws');

// We'll test against a running server instance
// Mock keyboard to avoid actual typing during tests
jest.mock('../keyboard', () => ({ typeText: jest.fn() }));

const { startServer, getLocalIP } = require('../server');

let serverInfo;

beforeAll((done) => {
  serverInfo = startServer(19527); // use non-default port for tests
  serverInfo.server.on('listening', done);
});

afterAll((done) => {
  serverInfo.server.close(done);
});

describe('HTTP server', () => {
  it('serves static files from public/', (done) => {
    http.get(`http://localhost:${serverInfo.port}/`, (res) => {
      expect(res.statusCode).toBe(200);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        expect(data).toContain('<!DOCTYPE html>');
        done();
      });
    });
  });

  it('returns 404 for non-existent files', (done) => {
    http.get(`http://localhost:${serverInfo.port}/nonexistent`, (res) => {
      expect(res.statusCode).toBe(404);
      done();
    });
  });
});

describe('WebSocket server', () => {
  it('accepts text messages and responds with ack', (done) => {
    const ws = new WebSocket(`ws://localhost:${serverInfo.port}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'text', payload: 'hello' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg).toEqual({ type: 'ack', payload: 'ok' });
      ws.close();
      done();
    });
  });

  it('responds to ping with pong', (done) => {
    const ws = new WebSocket(`ws://localhost:${serverInfo.port}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg).toEqual({ type: 'pong' });
      ws.close();
      done();
    });
  });

  it('ignores invalid JSON', (done) => {
    const ws = new WebSocket(`ws://localhost:${serverInfo.port}`);

    ws.on('open', () => {
      ws.send('not json');
      // If no crash and no response, test passes
      setTimeout(() => {
        ws.close();
        done();
      }, 200);
    });
  });
});

describe('getLocalIP', () => {
  it('returns a non-empty string', () => {
    const ip = getLocalIP();
    expect(typeof ip).toBe('string');
    expect(ip.length).toBeGreaterThan(0);
  });
});
