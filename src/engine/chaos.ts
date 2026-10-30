import type { ChaosConfig } from '../types.js';

export interface ChaosResult {
  delayedMs: number;
  shouldError: boolean;
  statusCode?: number;
  errorMessage?: string;
  responseHeaders?: Record<string, string>;
  reason?: string;
}

export class ChaosEngine {
  private config: ChaosConfig;
  private authRequestCounter: number = 0;

  constructor(initialConfig: Partial<ChaosConfig> = {}) {
    this.config = {
      enabled: initialConfig.enabled ?? false,
      latencyMs: initialConfig.latencyMs ?? 0,
      jitterMs: initialConfig.jitterMs ?? 0,
      errorRate: initialConfig.errorRate ?? 0,
      errorStatusCode: initialConfig.errorStatusCode ?? 500,
      errorMessage: initialConfig.errorMessage ?? 'Chaos Engine: Injected Fault',
      requireAuth: initialConfig.requireAuth ?? false,
      authToken: initialConfig.authToken ?? 'mocksmith-demo-token',
      expireTokenAfterRequests: initialConfig.expireTokenAfterRequests
    };
  }

  public getConfig(): ChaosConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<ChaosConfig>): ChaosConfig {
    this.config = {
      ...this.config,
      ...patch
    };
    return this.getConfig();
  }

  public resetAuthCounter(): void {
    this.authRequestCounter = 0;
  }

  /**
   * Evaluates incoming request headers and returns chaos simulation result
   */
  public async processRequest(headers: Record<string, string | string[] | undefined>): Promise<ChaosResult> {
    const result: ChaosResult = {
      delayedMs: 0,
      shouldError: false
    };

    if (!this.config.enabled) {
      return result;
    }

    // 1. Auth Simulation
    if (this.config.requireAuth) {
      this.authRequestCounter++;
      const authHeader = (headers['authorization'] || headers['Authorization']) as string | undefined;

      if (!authHeader) {
        return {
          delayedMs: 0,
          shouldError: true,
          statusCode: 401,
          errorMessage: 'Unauthorized: Missing Authorization header (MockSmith Chaos Auth)',
          reason: 'Missing Authorization header'
        };
      }

      const expected = `Bearer ${this.config.authToken}`;
      if (authHeader !== expected && authHeader !== this.config.authToken) {
        return {
          delayedMs: 0,
          shouldError: true,
          statusCode: 403,
          errorMessage: 'Forbidden: Invalid bearer token (MockSmith Chaos Auth)',
          reason: 'Invalid bearer token'
        };
      }

      // Token Expiration Simulation
      if (
        this.config.expireTokenAfterRequests &&
        this.authRequestCounter > this.config.expireTokenAfterRequests
      ) {
        return {
          delayedMs: 0,
          shouldError: true,
          statusCode: 401,
          errorMessage: 'Unauthorized: Simulated Token Expiration',
          reason: `Token expired after ${this.config.expireTokenAfterRequests} requests`
        };
      }
    }

    // 2. Latency & Jitter Injection
    if (this.config.latencyMs > 0) {
      const jitterRange = this.config.jitterMs || 0;
      const jitter = (Math.random() * 2 - 1) * jitterRange;
      const delay = Math.max(0, Math.round(this.config.latencyMs + jitter));
      result.delayedMs = delay;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // 3. Probabilistic Error Injection
    if (this.config.errorRate > 0) {
      const roll = Math.random();
      if (roll < this.config.errorRate) {
        result.shouldError = true;
        result.statusCode = this.config.errorStatusCode || 500;
        result.errorMessage = this.config.errorMessage || `Injected Error ${result.statusCode}`;
        result.reason = `Injected probabilistic chaos failure (roll: ${(roll * 100).toFixed(1)}% < rate: ${(this.config.errorRate * 100).toFixed(1)}%)`;

        if (result.statusCode === 429) {
          result.responseHeaders = {
            'Retry-After': '5',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 5)
          };
        }
      }
    }

    return result;
  }
}
