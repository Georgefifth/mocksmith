import { describe, it, expect } from 'vitest';
import { ChaosEngine } from '../src/engine/chaos.js';

describe('ChaosEngine', () => {
  it('should pass through when chaos is disabled', async () => {
    const chaos = new ChaosEngine({ enabled: false });
    const result = await chaos.processRequest({});
    expect(result.shouldError).toBe(false);
    expect(result.delayedMs).toBe(0);
  });

  it('should inject latency when enabled', async () => {
    const chaos = new ChaosEngine({ enabled: true, latencyMs: 30, jitterMs: 0 });
    const start = Date.now();
    const result = await chaos.processRequest({});
    const duration = Date.now() - start;

    expect(result.delayedMs).toBeGreaterThanOrEqual(25);
    expect(duration).toBeGreaterThanOrEqual(25);
  });

  it('should reject unauthorized requests when requireAuth is true', async () => {
    const chaos = new ChaosEngine({
      enabled: true,
      requireAuth: true,
      authToken: 'secret-token'
    });

    // 1. Missing header
    const noHeader = await chaos.processRequest({});
    expect(noHeader.shouldError).toBe(true);
    expect(noHeader.statusCode).toBe(401);

    // 2. Wrong token
    const wrongHeader = await chaos.processRequest({ authorization: 'Bearer wrong-token' });
    expect(wrongHeader.shouldError).toBe(true);
    expect(wrongHeader.statusCode).toBe(403);

    // 3. Valid token
    const validHeader = await chaos.processRequest({ authorization: 'Bearer secret-token' });
    expect(validHeader.shouldError).toBe(false);
  });

  it('should inject 429 status and Retry-After header with 100% error rate', async () => {
    const chaos = new ChaosEngine({
      enabled: true,
      errorRate: 1.0,
      errorStatusCode: 429
    });

    const result = await chaos.processRequest({});
    expect(result.shouldError).toBe(true);
    expect(result.statusCode).toBe(429);
    expect(result.responseHeaders?.['Retry-After']).toBe('5');
  });
});
