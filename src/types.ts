export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteDefinition {
  method: HttpMethod;
  path: string; // e.g. '/api/users/:id'
  resource: string; // e.g. 'users'
  isCollection: boolean; // true for '/api/users', false for '/api/users/:id'
  parentResource?: string; // e.g. 'users' for '/api/users/:userId/posts'
  parentParam?: string; // e.g. 'userId'
  paramName?: string; // e.g. 'id'
  summary?: string;
  schema?: Record<string, any>;
}

export interface ChaosConfig {
  enabled: boolean;
  latencyMs: number; // base delay
  jitterMs: number; // random jitter (+/-)
  errorRate: number; // 0.0 to 1.0 (e.g., 0.15 = 15% failure)
  errorStatusCode: number; // 400, 401, 403, 404, 429, 500, 503
  errorMessage?: string;
  requireAuth: boolean;
  authToken?: string; // e.g. 'mocksmith-secret-key'
  expireTokenAfterRequests?: number; // simulate token expiry after N requests
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  chaosInjected?: {
    latency: number;
    errorInjected: boolean;
    reason?: string;
  };
}

export interface StoreOptions {
  persistPath?: string;
  autoSave?: boolean;
}

export interface QueryFilter {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  params?: Record<string, any>;
}

export interface PaginatedResult<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
