import type { RelationalStore } from './store.js';
import { SchemaParser, type ParseResult } from './schema-parser.js';

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const TEMPLATES: TemplateMetadata[] = [
  {
    id: 'ecommerce',
    name: '🛒 E-Commerce Cloud Store',
    description: 'Relational Products, Carts, Orders, and Customers with inventory status',
    category: 'Commercial'
  },
  {
    id: 'petstore',
    name: '🐾 OAI Petstore Canonical',
    description: 'Official OpenAPI Initiative reference Petstore with pets, tags, and statuses',
    category: 'Standards'
  },
  {
    id: 'social',
    name: '💬 Social Network & Geo',
    description: 'Users with nested address and geo-coordinates, relational posts, and comments',
    category: 'Social'
  },
  {
    id: 'chaos',
    name: '⚡ Network Chaos Sandbox',
    description: 'Mock endpoints designed to test timeouts, 429 rate-limiting, and error recovery',
    category: 'Testing'
  }
];

export function getAvailableTemplates(): TemplateMetadata[] {
  return [...TEMPLATES];
}

export function loadTemplate(templateId: string, store: RelationalStore): ParseResult {
  switch (templateId.toLowerCase()) {
    case 'ecommerce': {
      const doc = {
        openapi: '3.0.3',
        info: {
          title: 'MockSmith E-Commerce Cloud API',
          version: '1.4.0',
          description: 'Production-ready e-commerce mock API with relational products, carts, and orders.'
        },
        paths: {
          '/api/v1/products': {
            get: { summary: 'List all products' },
            post: { summary: 'Create new product' }
          },
          '/api/v1/products/{id}': {
            get: { summary: 'Get product details' },
            put: { summary: 'Replace product' },
            delete: { summary: 'Delete product' }
          },
          '/api/v1/customers': {
            get: { summary: 'List customers' },
            post: { summary: 'Register customer' }
          },
          '/api/v1/customers/{id}': {
            get: { summary: 'Get customer profile' },
            patch: { summary: 'Update customer' }
          },
          '/api/v1/customers/{customerId}/orders': {
            get: { summary: 'List orders for customer' }
          },
          '/api/v1/orders': {
            get: { summary: 'List orders' },
            post: { summary: 'Place order' }
          },
          '/api/v1/orders/{id}': {
            get: { summary: 'Get order details' },
            delete: { summary: 'Cancel order' }
          }
        },
        components: {
          schemas: {
            Product: {
              type: 'object',
              required: ['title', 'price'],
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                price: { type: 'number' },
                sku: { type: 'string' },
                inStock: { type: 'boolean' },
                rating: { type: 'number' },
                category: { type: 'string' }
              }
            },
            Customer: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                phoneNumber: { type: 'string' },
                city: { type: 'string' },
                postalCode: { type: 'string' }
              }
            },
            Order: {
              type: 'object',
              required: ['customerId', 'totalAmount'],
              properties: {
                id: { type: 'string' },
                customerId: { type: 'string' },
                totalAmount: { type: 'number' },
                currency: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered'] }
              }
            }
          }
        }
      };
      return SchemaParser.parseOpenAPI(doc, store);
    }

    case 'petstore': {
      const doc = {
        openapi: '3.0.0',
        info: {
          title: 'Swagger Petstore Canonical',
          version: '1.0.0',
          description: 'Official OpenAPI Petstore standard schema with pets, categories, and tags'
        },
        paths: {
          '/pets': {
            get: { summary: 'List all pets' },
            post: { summary: 'Create a pet' }
          },
          '/pets/{petId}': {
            get: { summary: 'Info for a specific pet' },
            delete: { summary: 'Delete a pet' }
          }
        },
        components: {
          schemas: {
            Pet: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                tag: { type: 'string' },
                status: { type: 'string', enum: ['available', 'pending', 'sold'] }
              }
            }
          }
        }
      };
      return SchemaParser.parseOpenAPI(doc, store);
    }

    case 'social': {
      const doc = {
        openapi: '3.0.3',
        info: {
          title: 'Social Network & Geo API',
          version: '1.0.0',
          description: 'Users with nested geo-coordinates, posts, and comments'
        },
        paths: {
          '/users': {
            get: { summary: 'List users' },
            post: { summary: 'Create user' }
          },
          '/users/{id}': {
            get: { summary: 'Get user by ID' },
            delete: { summary: 'Delete user' }
          },
          '/users/{userId}/posts': {
            get: { summary: 'List posts by user' }
          },
          '/posts': {
            get: { summary: 'List all posts' },
            post: { summary: 'Publish post' }
          },
          '/posts/{id}': {
            get: { summary: 'Get post details' },
            delete: { summary: 'Delete post' }
          }
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                city: { type: 'string' },
                ipAddress: { type: 'string' },
                company: { type: 'string' }
              }
            },
            Post: {
              type: 'object',
              required: ['userId', 'title', 'body'],
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                title: { type: 'string' },
                body: { type: 'string' }
              }
            }
          }
        }
      };
      return SchemaParser.parseOpenAPI(doc, store);
    }

    case 'chaos':
    default: {
      const doc = {
        openapi: '3.0.0',
        info: {
          title: 'HTTP Chaos Sandbox API',
          version: '1.0.0',
          description: 'Dedicated routes for chaos fault injection and HTTP resilience testing'
        },
        paths: {
          '/api/status/200': { get: { summary: 'Guaranteed 200 OK' } },
          '/api/status/400': { get: { summary: 'Simulated 400 Bad Request' } },
          '/api/status/429': { get: { summary: 'Simulated 429 Rate Limited' } },
          '/api/status/500': { get: { summary: 'Simulated 500 Internal Error' } },
          '/api/latency/slow': { get: { summary: 'Slow latency endpoint' } }
        }
      };
      return SchemaParser.parseOpenAPI(doc, store);
    }
  }
}
