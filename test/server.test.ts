import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RelationalStore } from '../src/engine/store.js';
import { ChaosEngine } from '../src/engine/chaos.js';
import { SchemaParser } from '../src/engine/schema-parser.js';
import { MockSmithServer } from '../src/server.js';

describe('MockSmithServer HTTP End-to-End', () => {
  let server: MockSmithServer;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    const store = new RelationalStore();
    const chaos = new ChaosEngine();
    const demo = SchemaParser.generateDemo(store);

    server = new MockSmithServer(store, chaos, demo.routes, { port: 0 }); // 0 picks free port
    server.setInitialSeed(demo.initialData);
    port = await server.listen();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.close();
  });

  it('should serve embedded dashboard UI at /_mocksmith', async () => {
    const res = await fetch(`${baseUrl}/_mocksmith`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('MockSmith Studio');
    expect(html).toContain('Live Traffic & Console');
  });

  it('should list users via GET /api/users', async () => {
    const res = await fetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(5);
  });

  it('should create a new user via POST /api/users with 201 Created and state persistence', async () => {
    const createRes = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Grace Hopper',
        email: 'grace@navy.mil',
        status: 'active'
      })
    });

    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Grace Hopper');

    // Verify it now exists in subsequent GET
    const getRes = await fetch(`${baseUrl}/api/users/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.email).toBe('grace@navy.mil');

    // Delete it
    const delRes = await fetch(`${baseUrl}/api/users/${created.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);

    const getAfterDel = await fetch(`${baseUrl}/api/users/${created.id}`);
    expect(getAfterDel.status).toBe(404);
  });

  it('should return CORS headers on all responses', async () => {
    const res = await fetch(`${baseUrl}/api/users`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('should reject invalid payload when schema validation fails with 400 Bad Request', async () => {
    // Demo User schema requires valid object and properties
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'not_a_valid_status_enum'
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation Error');
    expect(body.details).toBeDefined();
  });

  it('should export OpenAPI and Bruno collections via dashboard endpoints', async () => {
    const oasRes = await fetch(`${baseUrl}/_mocksmith/api/export/openapi`);
    expect(oasRes.status).toBe(200);
    const oas = await oasRes.json();
    expect(oas.openapi).toBe('3.0.3');

    const brunoRes = await fetch(`${baseUrl}/_mocksmith/api/export/bruno`);
    expect(brunoRes.status).toBe(200);
    const bruno = await brunoRes.json();
    expect(bruno.name).toBe('MockSmith Collection');
  });

  it('should register, list, and delete webhooks via dashboard API', async () => {
    // 1. Register webhook
    const regRes = await fetch(`${baseUrl}/_mocksmith/api/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'users.created',
        targetUrl: 'http://localhost:9999/webhook',
        secret: 'test-secret'
      })
    });
    expect(regRes.status).toBe(201);
    const sub = await regRes.json();
    expect(sub.id).toBeDefined();

    // 2. List webhooks
    const listRes = await fetch(`${baseUrl}/_mocksmith/api/webhooks`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.length).toBeGreaterThanOrEqual(1);

    // 3. Delete webhook
    const delRes = await fetch(`${baseUrl}/_mocksmith/api/webhooks/${sub.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);
  });

  it('should support snapshot listing, saving, and restoring', async () => {
    // 1. List initial snapshots
    const listRes = await fetch(`${baseUrl}/_mocksmith/api/snapshots`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.some((s: any) => s.name === 'initial-seed')).toBe(true);
    expect(list.some((s: any) => s.name === 'empty-state')).toBe(true);

    // 2. Save custom snapshot
    const saveRes = await fetch(`${baseUrl}/_mocksmith/api/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-backup' })
    });
    expect(saveRes.status).toBe(201);

    // 3. Restore empty-state
    const restoreRes = await fetch(`${baseUrl}/_mocksmith/api/snapshots/empty-state/restore`, {
      method: 'POST'
    });
    expect(restoreRes.status).toBe(200);

    // Verify database is now empty
    const checkRes = await fetch(`${baseUrl}/api/users`);
    const users = await checkRes.json();
    expect(users.length).toBe(0);

    // 4. Restore initial-seed
    await fetch(`${baseUrl}/_mocksmith/api/snapshots/initial-seed/restore`, { method: 'POST' });
    const checkRestored = await fetch(`${baseUrl}/api/users`);
    const restoredUsers = await checkRestored.json();
    expect(restoredUsers.length).toBe(5);
  });

  it('should return auto-synthesized OpenAPI spec from recorded traffic', async () => {
    const specRes = await fetch(`${baseUrl}/_mocksmith/api/recorder/spec`);
    expect(specRes.status).toBe(200);
    const spec = await specRes.json();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.paths['/api/users']).toBeDefined();
  });
});
