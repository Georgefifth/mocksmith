import type { RouteDefinition } from '../types.js';
import type { RelationalStore } from './store.js';

export class CollectionExporter {
  /**
   * Export all active mock routes and current state as an OpenAPI 3.0.3 Specification
   */
  public static toOpenApiJson(
    routes: RouteDefinition[],
    store: RelationalStore,
    title = 'MockSmith Exported API',
    version = '1.0.0'
  ): Record<string, any> {
    const paths: Record<string, any> = {};
    const schemas: Record<string, any> = {};

    for (const route of routes) {
      // Re-convert :param into {param}
      const openApiPath = route.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      const methodLower = route.method.toLowerCase();
      paths[openApiPath][methodLower] = {
        summary: route.summary || `${route.method} ${route.path}`,
        tags: [route.resource.charAt(0).toUpperCase() + route.resource.slice(1)],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: route.schema || { type: 'object' }
              }
            }
          }
        }
      };

      if (['post', 'put', 'patch'].includes(methodLower) && route.schema) {
        paths[openApiPath][methodLower].requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: route.schema
            }
          }
        };
      }

      // Add schema to components
      const schemaName = route.resource.charAt(0).toUpperCase() + route.resource.slice(1).replace(/s$/, '');
      if (route.schema && !schemas[schemaName]) {
        schemas[schemaName] = route.schema;
      }
    }

    return {
      openapi: '3.0.3',
      info: {
        title,
        version,
        description: 'Auto-generated contract exported from MockSmith stateful mock engine.'
      },
      paths,
      components: {
        schemas
      }
    };
  }

  /**
   * Export routes into Bruno-compatible collection manifest
   */
  public static toBrunoCollection(routes: RouteDefinition[], baseUrl = 'http://localhost:4000'): Record<string, any> {
    const requests = routes.map((r) => {
      const name = `${r.method} ${r.path}`;
      const url = `${baseUrl}${r.path.replace(/:([a-zA-Z0-9_]+)/g, '1')}`;

      let body: any = null;
      if (['POST', 'PUT', 'PATCH'].includes(r.method)) {
        body = {
          mode: 'json',
          json: JSON.stringify(r.schema?.properties ? { name: 'Demo Item' } : {}, null, 2)
        };
      }

      return {
        name,
        type: 'http',
        request: {
          method: r.method,
          url,
          body,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Accept', value: 'application/json' }
          ]
        }
      };
    });

    return {
      name: 'MockSmith Collection',
      version: '1',
      items: requests
    };
  }
}
