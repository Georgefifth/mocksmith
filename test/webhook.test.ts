import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebhookEngine } from '../src/engine/webhook.js';

describe('WebhookEngine', () => {
  let receiverServer: http.Server;
  let receiverPort: number;
  let receivedRequests: Array<{ headers: http.IncomingHttpHeaders; body: any }> = [];

  beforeAll(async () => {
    receivedRequests = [];
    receiverServer = http.createServer((req, res) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        receivedRequests.push({
          headers: req.headers,
          body: JSON.parse(data)
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      });
    });

    await new Promise<void>((resolve) => {
      receiverServer.listen(0, () => {
        const addr = receiverServer.address() as any;
        receiverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => receiverServer.close(() => resolve()));
  });

  it('should match event wildcard patterns', () => {
    expect(WebhookEngine.matchesEvent('*', 'users.created')).toBe(true);
    expect(WebhookEngine.matchesEvent('users.*', 'users.created')).toBe(true);
    expect(WebhookEngine.matchesEvent('users.*', 'users.deleted')).toBe(true);
    expect(WebhookEngine.matchesEvent('users.*', 'orders.created')).toBe(false);
    expect(WebhookEngine.matchesEvent('orders.created', 'orders.created')).toBe(true);
    expect(WebhookEngine.matchesEvent('orders.created', 'orders.deleted')).toBe(false);
  });

  it('should register subscription and dispatch signed webhook event', async () => {
    const engine = new WebhookEngine();
    const sub = engine.register({
      event: 'users.*',
      targetUrl: `http://localhost:${receiverPort}/webhook-endpoint`,
      secret: 'my-test-secret',
      delayMs: 0,
      active: true
    });

    expect(sub.id).toBeDefined();
    expect(engine.list().length).toBe(1);

    const payload = { userId: '123', name: 'John Doe' };
    const deliveries = await engine.dispatch('users.created', payload);

    expect(deliveries.length).toBe(1);
    expect(deliveries[0].status).toBe(200);
    expect(deliveries[0].signature).toContain('sha256=');

    // Verify receiver got request and HMAC signature
    expect(receivedRequests.length).toBeGreaterThanOrEqual(1);
    const lastReq = receivedRequests[receivedRequests.length - 1];
    expect(lastReq.headers['x-mocksmith-event']).toBe('users.created');
    expect(lastReq.headers['x-mocksmith-signature']).toBe(deliveries[0].signature);
    expect(lastReq.body.data).toEqual(payload);
  });
});
