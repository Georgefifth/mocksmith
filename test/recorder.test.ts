import { describe, it, expect } from 'vitest';
import { TrafficRecorder } from '../src/engine/recorder.js';

describe('TrafficRecorder', () => {
  it('should infer schema types from primitive values and objects', () => {
    const recorder = new TrafficRecorder();
    const schema = recorder.inferSchema({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Alice Cooper',
      email: 'alice@rock.com',
      age: 48,
      rating: 4.85,
      isActive: true,
      createdAt: '2026-10-30T12:00:00Z',
      tags: ['singer', 'legend'],
      meta: { verified: true }
    });

    expect(schema.type).toBe('object');
    expect(schema.properties.id.format).toBe('uuid');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.email.format).toBe('email');
    expect(schema.properties.age.type).toBe('integer');
    expect(schema.properties.rating.type).toBe('number');
    expect(schema.properties.isActive.type).toBe('boolean');
    expect(schema.properties.createdAt.format).toBe('date-time');
    expect(schema.properties.tags.type).toBe('array');
    expect(schema.properties.meta.type).toBe('object');
  });

  it('should record live requests and synthesize OpenAPI 3.0 specification', () => {
    const recorder = new TrafficRecorder();

    // Record GET
    recorder.record('GET', '/api/users/1', null, { id: 1, name: 'Alice' }, 200);

    // Record POST
    recorder.record(
      'POST',
      '/api/users',
      { name: 'Bob', email: 'bob@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      201
    );

    const spec = recorder.generateOpenApiSpec('Live API', '1.0.0');
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Live API');

    // Verify normalized path /api/users/{userId}
    expect(spec.paths['/api/users/{userId}']).toBeDefined();
    expect(spec.paths['/api/users/{userId}']['get']).toBeDefined();

    // Verify /api/users POST has requestBody and response
    expect(spec.paths['/api/users']).toBeDefined();
    expect(spec.paths['/api/users']['post'].requestBody).toBeDefined();
    expect(spec.paths['/api/users']['post'].responses['201']).toBeDefined();
  });
});
