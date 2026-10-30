import http from 'node:http';
import { renderDashboardHtml } from './dashboard/html.js';
import { generateUUID } from './engine/faker-lite.js';
import { validatePayload } from './engine/validator.js';
import { CollectionExporter } from './engine/exporter.js';
import { WebhookEngine } from './engine/webhook.js';
import type { RelationalStore } from './engine/store.js';
import type { ChaosEngine } from './engine/chaos.js';
import type { RouteDefinition, RequestLogEntry } from './types.js';

export interface ServerOptions {
  port: number;
  host?: string;
  cors?: boolean;
}

export class MockSmithServer {
  private server: http.Server | null = null;
  private sseClients: Set<http.ServerResponse> = new Set();
  private initialSeedData: Record<string, Record<string, any>[]> = {};
  public webhookEngine: WebhookEngine;

  constructor(
    private store: RelationalStore,
    private chaos: ChaosEngine,
    private routes: RouteDefinition[],
    private options: ServerOptions = { port: 4000 },
    webhookEngine?: WebhookEngine
  ) {
    this.initialSeedData = store.exportSnapshot();
    this.webhookEngine = webhookEngine || new WebhookEngine();
  }

  public setInitialSeed(data: Record<string, Record<string, any>[]>): void {
    this.initialSeedData = JSON.parse(JSON.stringify(data));
  }

  public listen(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) =>
        this.handleRequest(req, res)
      );

      this.server.on('error', (err: Error) => {
        reject(err);
      });

      this.server.listen(this.options.port, this.options.host || '0.0.0.0', () => {
        const addr = this.server?.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : this.options.port;
        resolve(actualPort);
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.sseClients) {
        client.end();
      }
      this.sseClients.clear();

      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const pathname = urlObj.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 2. MockSmith Internal Dashboard Endpoints
    if (pathname.startsWith('/_mocksmith')) {
      return this.handleDashboardEndpoints(pathname, method, req, res);
    }

    // 3. Chaos & Network Interception Middleware
    const chaosResult = await this.chaos.processRequest(req.headers);

    if (chaosResult.shouldError) {
      const status = chaosResult.statusCode || 500;
      const errorBody = {
        error: chaosResult.errorMessage,
        status,
        timestamp: new Date().toISOString(),
        chaos: true,
        reason: chaosResult.reason
      };

      if (chaosResult.responseHeaders) {
        for (const [k, v] of Object.entries(chaosResult.responseHeaders)) {
          res.setHeader(k, v);
        }
      }

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(errorBody, null, 2));

      this.broadcastLog({
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        method,
        url: req.url || '/',
        status,
        durationMs: Date.now() - startTime,
        requestHeaders: this.sanitizeHeaders(req.headers),
        responseBody: errorBody,
        chaosInjected: {
          latency: chaosResult.delayedMs,
          errorInjected: true,
          reason: chaosResult.reason
        }
      });
      return;
    }

    // 4. Read Request Body
    const body = await this.readRequestBody(req);

    // 5. Match Dynamic Mock Route
    const match = this.matchRoute(method, pathname);
    let statusCode = 200;
    let responseBody: any = null;

    if (!match) {
      statusCode = 404;
      responseBody = {
        error: 'Not Found',
        message: `No mock route registered for [${method}] ${pathname}`,
        availableRoutes: this.routes.map((r) => `[${r.method}] ${r.path}`)
      };
    } else {
      try {
        const { route, params } = match;

        // Sub-resource (e.g. /users/:userId/orders)
        if (route.parentResource && route.parentParam) {
          const parentId = params[route.parentParam];
          const results = this.store.getSubResource(route.parentResource, parentId, route.resource);
          responseBody = results;
        }
        // Collection endpoints: GET /items, POST /items
        else if (route.isCollection) {
          if (method === 'GET') {
            const queryParams: Record<string, string> = {};
            urlObj.searchParams.forEach((val, key) => {
              queryParams[key] = val;
            });
            const pageParam = queryParams['page'];
            const limitParam = queryParams['limit'];
            const sortParam = queryParams['sort'];
            const orderParam = queryParams['order'];
            const searchParam = queryParams['search'];

            delete queryParams['page'];
            delete queryParams['limit'];
            delete queryParams['sort'];
            delete queryParams['order'];
            delete queryParams['search'];

            const filter = {
              page: pageParam ? Number(pageParam) : undefined,
              limit: limitParam ? Number(limitParam) : undefined,
              sort: sortParam,
              order: orderParam as 'asc' | 'desc' | undefined,
              search: searchParam,
              params: queryParams
            };

            const result = this.store.list(route.resource, filter);
            responseBody = pageParam ? result : result.data;
          } else if (method === 'POST') {
            if (route.schema) {
              const validation = validatePayload(body, route.schema);
              if (!validation.valid) {
                statusCode = 400;
                responseBody = {
                  error: 'Validation Error',
                  message: 'Request payload does not satisfy OpenAPI schema requirements',
                  details: validation.errors
                };
              } else {
                statusCode = 201;
                responseBody = this.store.create(route.resource, body || {});
                this.webhookEngine.dispatch(`${route.resource}.created`, responseBody);
              }
            } else {
              statusCode = 201;
              responseBody = this.store.create(route.resource, body || {});
              this.webhookEngine.dispatch(`${route.resource}.created`, responseBody);
            }
          }
        }
        // Single Item endpoints: GET /items/:id, PUT, PATCH, DELETE
        else if (route.paramName) {
          const id = params[route.paramName];
          if (method === 'GET') {
            const item = this.store.get(route.resource, id);
            if (!item) {
              statusCode = 404;
              responseBody = { error: 'Not Found', message: `${route.resource} with ID '${id}' not found` };
            } else {
              responseBody = item;
            }
          } else if (method === 'PUT') {
            if (route.schema) {
              const validation = validatePayload(body, route.schema);
              if (!validation.valid) {
                statusCode = 400;
                responseBody = {
                  error: 'Validation Error',
                  message: 'Request payload does not satisfy OpenAPI schema requirements',
                  details: validation.errors
                };
              } else {
                const updated = this.store.update(route.resource, id, body || {});
                if (!updated) {
                  statusCode = 404;
                  responseBody = { error: 'Not Found', message: `${route.resource} with ID '${id}' not found` };
                } else {
                  responseBody = updated;
                  this.webhookEngine.dispatch(`${route.resource}.updated`, responseBody);
                }
              }
            } else {
              const updated = this.store.update(route.resource, id, body || {});
              if (!updated) {
                statusCode = 404;
                responseBody = { error: 'Not Found', message: `${route.resource} with ID '${id}' not found` };
              } else {
                responseBody = updated;
                this.webhookEngine.dispatch(`${route.resource}.updated`, responseBody);
              }
            }
          } else if (method === 'PATCH') {
            const patched = this.store.patch(route.resource, id, body || {});
            if (!patched) {
              statusCode = 404;
              responseBody = { error: 'Not Found', message: `${route.resource} with ID '${id}' not found` };
            } else {
              responseBody = patched;
              this.webhookEngine.dispatch(`${route.resource}.updated`, responseBody);
            }
          } else if (method === 'DELETE') {
            const deleted = this.store.delete(route.resource, id);
            if (!deleted) {
              statusCode = 404;
              responseBody = { error: 'Not Found', message: `${route.resource} with ID '${id}' not found` };
            } else {
              statusCode = 200;
              responseBody = { success: true, message: `Deleted ${route.resource} '${id}'` };
              this.webhookEngine.dispatch(`${route.resource}.deleted`, { id, resource: route.resource });
            }
          }
        }
      } catch (err: any) {
        statusCode = 500;
        responseBody = { error: 'Internal Server Error', message: err.message };
      }
    }

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseBody, null, 2));

    // 6. Broadcast Log to SSE Dashboard
    this.broadcastLog({
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      method,
      url: req.url || '/',
      status: statusCode,
      durationMs: Date.now() - startTime,
      requestHeaders: this.sanitizeHeaders(req.headers),
      requestBody: body,
      responseBody,
      chaosInjected: {
        latency: chaosResult.delayedMs,
        errorInjected: false
      }
    });
  }

  private handleDashboardEndpoints(
    pathname: string,
    method: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    if (pathname === '/_mocksmith' || pathname === '/_mocksmith/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderDashboardHtml());
      return;
    }

    if (pathname === '/_mocksmith/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write('\n');
      this.sseClients.add(res);

      req.on('close', () => {
        this.sseClients.delete(res);
      });
      return;
    }

    if (pathname === '/_mocksmith/api/state' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.store.exportSnapshot(), null, 2));
      return;
    }

    if (pathname === '/_mocksmith/api/chaos') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.chaos.getConfig()));
        return;
      }
      if (method === 'POST') {
        this.readRequestBody(req).then((body) => {
          const updated = this.chaos.updateConfig(body || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        });
        return;
      }
    }

    if (pathname === '/_mocksmith/api/reset' && method === 'POST') {
      this.store.importSnapshot(this.initialSeedData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Database state reset' }));
      return;
    }

    if (pathname === '/_mocksmith/api/routes' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.routes, null, 2));
      return;
    }

    if (pathname === '/_mocksmith/api/export/openapi' && method === 'GET') {
      const openApiSpec = CollectionExporter.toOpenApiJson(this.routes, this.store);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="mocksmith-openapi.json"'
      });
      res.end(JSON.stringify(openApiSpec, null, 2));
      return;
    }

    if (pathname === '/_mocksmith/api/export/bruno' && method === 'GET') {
      const brunoCol = CollectionExporter.toBrunoCollection(this.routes);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="mocksmith-bruno.json"'
      });
      res.end(JSON.stringify(brunoCol, null, 2));
      return;
    }

    // Webhook Management Endpoints
    if (pathname === '/_mocksmith/api/webhooks' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.webhookEngine.list(), null, 2));
      return;
    }

    if (pathname === '/_mocksmith/api/webhooks' && method === 'POST') {
      this.readRequestBody(req).then((body) => {
        const sub = this.webhookEngine.register({
          event: body.event || '*',
          targetUrl: body.targetUrl,
          secret: body.secret || 'mocksmith-webhook-secret',
          delayMs: Number(body.delayMs) || 0,
          active: body.active !== false
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sub, null, 2));
      });
      return;
    }

    if (pathname.startsWith('/_mocksmith/api/webhooks/') && method === 'DELETE') {
      const id = pathname.replace('/_mocksmith/api/webhooks/', '');
      const removed = this.webhookEngine.remove(id);
      res.writeHead(removed ? 200 : 404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: removed }));
      return;
    }

    if (pathname.startsWith('/_mocksmith/api/webhooks/') && pathname.endsWith('/trigger') && method === 'POST') {
      const id = pathname.replace('/_mocksmith/api/webhooks/', '').replace('/trigger', '');
      const sub = this.webhookEngine.list().find((s) => s.id === id);
      if (!sub) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Webhook not found' }));
        return;
      }
      this.readRequestBody(req).then(async (body) => {
        const testPayload = body?.data || { message: 'Manual MockSmith Webhook Trigger', test: true };
        const delivery = await this.webhookEngine.deliver(sub, sub.event, testPayload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(delivery, null, 2));
      });
      return;
    }

    if (pathname === '/_mocksmith/api/webhooks/deliveries' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.webhookEngine.getDeliveries(), null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Dashboard endpoint not found' }));
  }

  private matchRoute(
    method: string,
    pathname: string
  ): { route: RouteDefinition; params: Record<string, string> } | null {
    const cleanPath = pathname.replace(/\/+$/, '') || '/';
    const pathSegments = cleanPath.split('/').filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const routeSegments = route.path.replace(/\/+$/, '').split('/').filter(Boolean);
      if (routeSegments.length !== pathSegments.length) continue;

      const params: Record<string, string> = {};
      let isMatch = true;

      for (let i = 0; i < routeSegments.length; i++) {
        const rSeg = routeSegments[i];
        const pSeg = pathSegments[i];

        if (rSeg.startsWith(':')) {
          params[rSeg.slice(1)] = pSeg;
        } else if (rSeg !== pSeg) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return { route, params };
      }
    }

    return null;
  }

  private readRequestBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk: any) => {
        data += chunk;
      });
      req.on('end', () => {
        if (!data.trim()) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
  }

  private broadcastLog(entry: RequestLogEntry): void {
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    for (const client of this.sseClients) {
      client.write(payload);
    }
  }

  private sanitizeHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (v !== undefined && v !== null) {
        result[k] = Array.isArray(v) ? v.join(', ') : String(v);
      }
    }
    return result;
  }
}
