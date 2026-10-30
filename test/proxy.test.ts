import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RelationalStore } from '../src/engine/store.js';
import { ChaosEngine } from '../src/engine/chaos.js';
import { MockSmithServer } from '../src/server.js';

describe('Proxy Passthrough Mode', () => {
  let upstreamServer: http.Server;
  let upstreamPort: number;
  let mockServer: MockSmithServer;
  let mockPort: number;

  beforeAll(async () => {
    // 1. Upstream real server
    upstreamServer = http.createServer((req, res) => {
      if (req.url?.startsWith('/api/legacy-payment')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ proxied: true, provider: 'StripeLive' }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream 404' }));
    });

    await new Promise<void>((resolve) => {
      upstreamServer.listen(0, () => {
        const addr = upstreamServer.address() as any;
        upstreamPort = addr.port;
        resolve();
      });
    });

    // 2. MockSmith server with proxyUrl
    const store = new RelationalStore();
    const chaos = new ChaosEngine();
    mockServer = new MockSmithServer(
      store,
      chaos,
      [{ method: 'GET', path: '/api/local', resource: 'local', isCollection: true }],
      { port: 0, proxyUrl: `http://localhost:${upstreamPort}` }
    );
    mockPort = await mockServer.listen();
  });

  afterAll(async () => {
    await mockServer.close();
    await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));
  });

  it('should forward unmocked routes to the upstream proxy target', async () => {
    const res = await fetch(`http://localhost:${mockPort}/api/legacy-payment`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-mocksmith-proxy')).toBe('true');
    const data = await res.json();
    expect(data.proxied).toBe(true);
    expect(data.provider).toBe('StripeLive');
  });
});
