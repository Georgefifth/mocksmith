import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { SchemaParser } from '../src/engine/schema-parser.js';
import { RelationalStore } from '../src/engine/store.js';

describe('SchemaParser', () => {
  it('should generate demo schema with users, products, and orders', () => {
    const store = new RelationalStore();
    const result = SchemaParser.generateDemo(store);

    expect(result.routes.length).toBeGreaterThan(5);
    expect(result.initialData.users).toBeDefined();
    expect(result.initialData.products).toBeDefined();
    expect(result.initialData.orders).toBeDefined();

    // Verify relations in store
    const userList = store.list('users');
    expect(userList.total).toBe(5);
  });

  it('should parse OpenAPI YAML petstore specification', () => {
    const store = new RelationalStore();
    const petstorePath = path.resolve('examples/petstore.yaml');
    const result = SchemaParser.parseFile(petstorePath, store);

    expect(result.title).toContain('Petstore');
    const petRoutes = result.routes.filter((r) => r.resource === 'pets');
    expect(petRoutes.length).toBeGreaterThanOrEqual(4);

    const petsInStore = store.list('pets');
    expect(petsInStore.total).toBe(5);
  });

  it('should parse raw JSON database model', () => {
    const store = new RelationalStore();
    const dbPath = path.resolve('examples/db.json');
    const result = SchemaParser.parseFile(dbPath, store);

    expect(result.initialData.tasks).toBeDefined();
    expect(result.initialData.categories).toBeDefined();

    const tasks = store.list('tasks');
    expect(tasks.total).toBe(3);
  });
});
