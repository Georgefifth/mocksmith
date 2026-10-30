import fs from 'node:fs';
import path from 'node:path';

export interface RecordedRoute {
  method: string;
  path: string;
  requestSchema?: Record<string, any>;
  responseSchema?: Record<string, any>;
  sampleResponse?: any;
  hitCount: number;
  lastStatusCode: number;
}

export class TrafficRecorder {
  private routes: Map<string, RecordedRoute> = new Map();
  private isRecording: boolean = true;
  private outputPath?: string;

  constructor(options: { active?: boolean; outputPath?: string } = {}) {
    this.isRecording = options.active ?? true;
    this.outputPath = options.outputPath;
  }

  public enable(): void {
    this.isRecording = true;
  }

  public disable(): void {
    this.isRecording = false;
  }

  public getStatus(): boolean {
    return this.isRecording;
  }

  public record(
    method: string,
    rawPath: string,
    requestBody: any,
    responseBody: any,
    statusCode: number
  ): void {
    if (!this.isRecording) return;

    // Normalize path parameter segments: /api/users/123 -> /api/users/{id}
    const normalizedPath = this.normalizePath(rawPath);
    const key = `${method.toUpperCase()} ${normalizedPath}`;

    let route = this.routes.get(key);
    if (!route) {
      route = {
        method: method.toUpperCase(),
        path: normalizedPath,
        hitCount: 0,
        lastStatusCode: statusCode
      };
      this.routes.set(key, route);
    }

    route.hitCount++;
    route.lastStatusCode = statusCode;

    // Infer request body schema
    if (requestBody && typeof requestBody === 'object') {
      route.requestSchema = this.mergeSchemas(route.requestSchema, this.inferSchema(requestBody));
    }

    // Infer response body schema
    if (responseBody && typeof responseBody === 'object') {
      route.responseSchema = this.mergeSchemas(route.responseSchema, this.inferSchema(responseBody));
      route.sampleResponse = responseBody;
    }

    this.maybeSave();
  }

  public getRecordedRoutes(): RecordedRoute[] {
    return Array.from(this.routes.values());
  }

  public generateOpenApiSpec(title = 'Synthesized API Contract', version = '1.0.0'): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const r of this.routes.values()) {
      if (!paths[r.path]) {
        paths[r.path] = {};
      }

      const methodLower = r.method.toLowerCase();
      const op: Record<string, any> = {
        summary: `Synthesized from live traffic: ${r.method} ${r.path}`,
        description: `Observed ${r.hitCount} requests in live recording.`,
        responses: {
          [String(r.lastStatusCode || 200)]: {
            description: 'Observed response',
            content: {
              'application/json': {
                schema: r.responseSchema || { type: 'object' }
              }
            }
          }
        }
      };

      if (['post', 'put', 'patch'].includes(methodLower) && r.requestSchema) {
        op.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: r.requestSchema
            }
          }
        };
      }

      paths[r.path][methodLower] = op;
    }

    return {
      openapi: '3.0.3',
      info: {
        title,
        version,
        description: 'Auto-synthesized OpenAPI 3.0 contract reverse-engineered from live HTTP traffic by MockSmith.'
      },
      paths
    };
  }

  public inferSchema(data: any): Record<string, any> {
    if (data === null || data === undefined) {
      return { type: 'string', nullable: true };
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { type: 'array', items: { type: 'string' } };
      }
      return {
        type: 'array',
        items: this.inferSchema(data[0])
      };
    }

    if (typeof data === 'number') {
      return Number.isInteger(data) ? { type: 'integer' } : { type: 'number' };
    }

    if (typeof data === 'boolean') {
      return { type: 'boolean' };
    }

    if (typeof data === 'string') {
      // Check for formats
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
        return { type: 'string', format: 'date-time' };
      }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
        return { type: 'string', format: 'email' };
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
        return { type: 'string', format: 'uuid' };
      }
      return { type: 'string' };
    }

    if (typeof data === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, val] of Object.entries(data)) {
        properties[key] = this.inferSchema(val);
        required.push(key);
      }

      return {
        type: 'object',
        required,
        properties
      };
    }

    return { type: 'string' };
  }

  private mergeSchemas(existing?: Record<string, any>, incoming?: Record<string, any>): Record<string, any> {
    if (!existing) return incoming || { type: 'object' };
    if (!incoming) return existing;

    if (existing.type === 'object' && incoming.type === 'object') {
      const mergedProps = { ...existing.properties };
      for (const [k, v] of Object.entries(incoming.properties || {})) {
        if (!mergedProps[k]) {
          mergedProps[k] = v;
        }
      }
      return {
        type: 'object',
        properties: mergedProps
      };
    }

    return incoming;
  }

  private normalizePath(rawPath: string): string {
    const clean = rawPath.split('?')[0].replace(/\/+$/, '') || '/';
    const segments = clean.split('/').filter(Boolean);

    // Replace UUIDs or numeric IDs with parameter placeholders
    const normalizedSegments = segments.map((seg, idx) => {
      if (/^\d+$/.test(seg)) {
        const prev = segments[idx - 1] || 'item';
        return `{${prev.replace(/s$/, '')}Id}`;
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
        return '{id}';
      }
      return seg;
    });

    return '/' + normalizedSegments.join('/');
  }

  private maybeSave(): void {
    if (this.outputPath) {
      const dir = path.dirname(this.outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.outputPath, JSON.stringify(this.generateOpenApiSpec(), null, 2), 'utf-8');
    }
  }
}
