import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { generateEntityFromSchema } from './faker-lite.js';
import type { RouteDefinition, HttpMethod } from '../types.js';
import type { RelationalStore } from './store.js';

export interface ParseResult {
  title: string;
  version: string;
  routes: RouteDefinition[];
  initialData: Record<string, Record<string, any>[]>;
}

export class SchemaParser {
  /**
   * Parse either an OpenAPI YAML/JSON file or a raw JSON data file
   */
  public static parseFile(filePath: string, store: RelationalStore): ParseResult {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    let doc: any;
    try {
      if (ext === '.yaml' || ext === '.yml') {
        doc = YAML.parse(content);
      } else {
        doc = JSON.parse(content);
      }
    } catch (err: any) {
      throw new Error(`Failed to parse file syntax (${filePath}): ${err.message}`);
    }

    // Determine if it's OpenAPI or a plain JSON data structure
    if (doc.openapi || doc.swagger) {
      return this.parseOpenAPI(doc, store);
    }

    if (Array.isArray(doc)) {
      const resource =
        path.basename(filePath, path.extname(filePath)).toLowerCase().replace(/[^a-z0-9_-]/g, '') ||
        'items';
      return this.parseRawJson({ [resource]: doc }, store);
    }

    return this.parseRawJson(doc, store);
  }

  /**
   * Generates a realistic default demo project with Users, Products, and Orders
   */
  public static generateDemo(store: RelationalStore): ParseResult {
    const demoOpenAPI = {
      openapi: '3.0.3',
      info: {
        title: 'MockSmith Demo Store API',
        version: '1.0.0',
        description: 'Instant zero-configuration stateful mock backend with live chaos testing.'
      },
      paths: {
        '/api/users': {
          get: { summary: 'List all users', tags: ['Users'] },
          post: { summary: 'Create user', tags: ['Users'] }
        },
        '/api/users/{id}': {
          get: { summary: 'Get user by ID', tags: ['Users'] },
          put: { summary: 'Replace user', tags: ['Users'] },
          patch: { summary: 'Update user', tags: ['Users'] },
          delete: { summary: 'Delete user', tags: ['Users'] }
        },
        '/api/users/{userId}/orders': {
          get: { summary: 'List orders for user', tags: ['Orders'] }
        },
        '/api/products': {
          get: { summary: 'List all products', tags: ['Products'] },
          post: { summary: 'Create product', tags: ['Products'] }
        },
        '/api/products/{id}': {
          get: { summary: 'Get product by ID', tags: ['Products'] },
          put: { summary: 'Update product', tags: ['Products'] },
          delete: { summary: 'Delete product', tags: ['Products'] }
        },
        '/api/orders': {
          get: { summary: 'List all orders', tags: ['Orders'] },
          post: { summary: 'Create order', tags: ['Orders'] }
        },
        '/api/orders/{id}': {
          get: { summary: 'Get order by ID', tags: ['Orders'] },
          delete: { summary: 'Cancel order', tags: ['Orders'] }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              avatar: { type: 'string' },
              company: { type: 'string' },
              city: { type: 'string' },
              status: { type: 'string', enum: ['active', 'pending', 'inactive'] },
              createdAt: { type: 'string', format: 'date-time' }
            }
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              category: { type: 'string' },
              price: { type: 'number' },
              description: { type: 'string' },
              inStock: { type: 'boolean' }
            }
          },
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              totalAmount: { type: 'number' },
              status: { type: 'string', enum: ['completed', 'pending', 'cancelled'] },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    };

    return this.parseOpenAPI(demoOpenAPI, store);
  }

  /**
   * Parse OpenAPI 3.0/3.1 document
   */
  public static parseOpenAPI(doc: any, store: RelationalStore): ParseResult {
    const title = doc.info?.title || 'MockSmith API';
    const version = doc.info?.version || '1.0.0';
    const paths = doc.paths || {};
    const schemas = doc.components?.schemas || doc.definitions || {};

    const routes: RouteDefinition[] = [];
    const initialData: Record<string, Record<string, any>[]> = {};

    // 1. Identify Resources and generate routes
    for (const [rawPath, pathItem] of Object.entries(paths) as [string, any][]) {
      // Normalize path parameters: /api/users/{id} -> /api/users/:id
      const normalizedPath = rawPath.replace(/\{([^}]+)\}/g, ':$1');
      const segments = normalizedPath.split('/').filter(Boolean);

      // Analyze route pattern
      const lastSegment = segments[segments.length - 1] || '';
      const isParam = lastSegment.startsWith(':');

      let resource = '';
      let parentResource: string | undefined;
      let parentParam: string | undefined;

      if (segments.length >= 3 && segments[segments.length - 2].startsWith(':')) {
        // e.g. /api/users/:userId/orders
        resource = lastSegment;
        parentResource = segments[segments.length - 3];
        parentParam = segments[segments.length - 2].slice(1);
      } else if (isParam) {
        // e.g. /api/users/:id
        resource = segments[segments.length - 2] || 'item';
      } else {
        // e.g. /api/users
        resource = lastSegment;
      }

      // Methods
      const supportedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      for (const [methodStr, opObj] of Object.entries(pathItem) as [string, any][]) {
        const method = methodStr.toUpperCase() as HttpMethod;
        if (!supportedMethods.includes(method)) continue;

        routes.push({
          method,
          path: normalizedPath,
          resource,
          isCollection: !isParam && !parentResource,
          parentResource,
          parentParam,
          paramName: isParam ? lastSegment.slice(1) : undefined,
          summary: opObj?.summary || `${method} ${normalizedPath}`,
          schema: this.findAssociatedSchema(opObj, schemas, resource)
        });
      }
    }

    // 2. Synthesize Initial Mock Data for discovered resources
    const discoveredResources = Array.from(new Set(routes.map((r) => r.resource)));
    for (const res of discoveredResources) {
      const singular = res.replace(/s$/, '');
      // Match schema by name (e.g. Users -> User)
      const matchingSchemaName = Object.keys(schemas).find(
        (k) => k.toLowerCase() === res.toLowerCase() || k.toLowerCase() === singular.toLowerCase()
      );
      const schemaObj = matchingSchemaName ? schemas[matchingSchemaName] : {};

      const count = 5;
      const records: Record<string, any>[] = [];
      for (let i = 1; i <= count; i++) {
        records.push(generateEntityFromSchema(schemaObj, i, schemas));
      }

      initialData[res] = records;
      store.seed(res, records);
    }

    // Connect relational mock IDs if Users and Orders both exist
    if (initialData['users'] && initialData['orders']) {
      const userIds = initialData['users'].map((u) => u.id);
      for (const order of initialData['orders']) {
        order.userId = userIds[Math.floor(Math.random() * userIds.length)];
      }
      store.seed('orders', initialData['orders']);
    }

    return {
      title,
      version,
      routes,
      initialData
    };
  }

  /**
   * Parse plain JSON mock file (e.g. db.json)
   */
  public static parseRawJson(
    doc: Record<string, any> | any[],
    store: RelationalStore,
    defaultResource = 'items'
  ): ParseResult {
    const routes: RouteDefinition[] = [];
    const initialData: Record<string, Record<string, any>[]> = {};
    const dict: Record<string, any> = Array.isArray(doc) ? { [defaultResource]: doc } : doc;

    for (const [resource, value] of Object.entries(dict)) {
      if (Array.isArray(value)) {
        initialData[resource] = value;
        store.seed(resource, value);

        // Auto-generate standard REST endpoints for each array key
        const basePath = `/${resource}`;
        routes.push({
          method: 'GET',
          path: basePath,
          resource,
          isCollection: true,
          summary: `List all ${resource}`
        });
        routes.push({
          method: 'POST',
          path: basePath,
          resource,
          isCollection: true,
          summary: `Create ${resource}`
        });
        routes.push({
          method: 'GET',
          path: `${basePath}/:id`,
          resource,
          isCollection: false,
          paramName: 'id',
          summary: `Get ${resource} by ID`
        });
        routes.push({
          method: 'PUT',
          path: `${basePath}/:id`,
          resource,
          isCollection: false,
          paramName: 'id',
          summary: `Replace ${resource}`
        });
        routes.push({
          method: 'PATCH',
          path: `${basePath}/:id`,
          resource,
          isCollection: false,
          paramName: 'id',
          summary: `Update ${resource}`
        });
        routes.push({
          method: 'DELETE',
          path: `${basePath}/:id`,
          resource,
          isCollection: false,
          paramName: 'id',
          summary: `Delete ${resource}`
        });
      }
    }

    return {
      title: 'Mock Database API',
      version: '1.0.0',
      routes,
      initialData
    };
  }

  private static findAssociatedSchema(
    opObj: any,
    schemas: Record<string, any>,
    resourceName: string
  ): Record<string, any> | undefined {
    let schema: any;

    // Check requestBody
    const reqSchema = opObj?.requestBody?.content?.['application/json']?.schema;
    if (reqSchema) schema = reqSchema;

    // Check responses 200 or 201
    if (!schema) {
      const resSchema =
        opObj?.responses?.['200']?.content?.['application/json']?.schema ||
        opObj?.responses?.['201']?.content?.['application/json']?.schema;
      if (resSchema) {
        if (resSchema.type === 'array' && resSchema.items) {
          schema = resSchema.items;
        } else {
          schema = resSchema;
        }
      }
    }

    // Fallback to name heuristic
    if (!schema) {
      const singular = resourceName.replace(/s$/, '').toLowerCase();
      const key = Object.keys(schemas).find((k) => k.toLowerCase() === singular);
      schema = key ? schemas[key] : undefined;
    }

    // Resolve top-level $ref if present
    if (schema?.$ref && typeof schema.$ref === 'string') {
      const refKey = schema.$ref.split('/').pop();
      if (refKey && schemas[refKey]) {
        return schemas[refKey];
      }
    }

    return schema;
  }
}
