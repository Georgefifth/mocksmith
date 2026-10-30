import { describe, it, expect } from 'vitest';
import { CollectionExporter } from '../src/engine/exporter.js';
import { RelationalStore } from '../src/engine/store.js';
import type { RouteDefinition } from '../src/types.js';

describe('CollectionExporter', () => {
  const sampleRoutes: RouteDefinition[] = [
    {
      method: 'GET',
      path: '/api/users',
      resource: 'users',
      isCollection: true,
      summary: 'List users'
    },
    {
      method: 'POST',
      path: '/api/users',
      resource: 'users',
      isCollection: true,
      summary: 'Create user',
      schema: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } }
      }
    },
    {
      method: 'GET',
      path: '/api/users/:id',
      resource: 'users',
      isCollection: false,
      paramName: 'id',
      summary: 'Get user by ID'
    }
  ];

  it('should export valid OpenAPI 3.0.3 specification JSON', () => {
    const store = new RelationalStore();
    const doc = CollectionExporter.toOpenApiJson(sampleRoutes, store, 'Test API', '1.0.0');

    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info.title).toBe('Test API');
    expect(doc.paths['/api/users']).toBeDefined();
    expect(doc.paths['/api/users']['get']).toBeDefined();
    expect(doc.paths['/api/users']['post']).toBeDefined();
    expect(doc.paths['/api/users/{id}']).toBeDefined();
    expect(doc.components.schemas.User).toBeDefined();
  });

  it('should export Bruno collection JSON format', () => {
    const brunoCol = CollectionExporter.toBrunoCollection(sampleRoutes);

    expect(brunoCol.name).toBe('MockSmith Collection');
    expect(brunoCol.items.length).toBe(3);
    expect(brunoCol.items[0].request.method).toBe('GET');
    expect(brunoCol.items[0].request.url).toContain('/api/users');
  });
});
