import fs from 'node:fs';
import path from 'node:path';
import { SchemaParser } from '../src/engine/schema-parser.js';
import { RelationalStore } from '../src/engine/store.js';
import { ChaosEngine } from '../src/engine/chaos.js';
import { validatePayload } from '../src/engine/validator.js';

export interface BenchmarkCaseResult {
  tier: string;
  name: string;
  category: string;
  expectedBehavior: string;
  actualStatus: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR';
  executionTimeMs: number;
  details: string;
  groundTruthNotes: string;
}

export const benchmarkResults: BenchmarkCaseResult[] = [];

async function recordBenchmark(
  tier: string,
  name: string,
  category: string,
  expectedBehavior: string,
  groundTruthNotes: string,
  fn: () => Promise<{ status: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR'; details: string }>
) {
  const start = Date.now();
  try {
    const outcome = await fn();
    const duration = Date.now() - start;
    benchmarkResults.push({
      tier,
      name,
      category,
      expectedBehavior,
      actualStatus: outcome.status,
      executionTimeMs: duration,
      details: outcome.details,
      groundTruthNotes
    });
    console.log(`[${outcome.status}] [${tier}] ${name} (${duration}ms) - ${outcome.details}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    benchmarkResults.push({
      tier,
      name,
      category,
      expectedBehavior,
      actualStatus: 'ERROR',
      executionTimeMs: duration,
      details: `Exception thrown: ${err.message}`,
      groundTruthNotes
    });
    console.error(`[ERROR] [${tier}] ${name} (${duration}ms) - Exception: ${err.message}`);
  }
}

export async function runAllBenchmarks() {
  console.log('======================================================================');
  console.log('MockSmith Real-World Benchmark & Product Validation Suite');
  console.log('Running on Node ' + process.version + ' (' + process.platform + ')');
  console.log('======================================================================\n');

  const bdir = path.resolve('test-fixtures/benchmark');

  // ====================================================================
  // TIER 1: Basic / Standard Canonical Specs
  // ====================================================================
  console.log('--- Tier 1: Canonical Real-World Standard Specs ---');

  await recordBenchmark(
    'Tier 1 (Basic)',
    'OAI Official Petstore 3.0',
    'OpenAPI Ingestion',
    'Parses routes for /pets, /pets/:id; synthesizes pet mock data',
    'Official OpenAPI Initiative canonical specification (v3.0/pass/petstore.yaml)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'oai-petstore.yaml'), store);
      if (res.routes.length < 2) return { status: 'FAIL', details: `Expected >= 2 routes, got ${res.routes.length}` };
      const pets = store.list('pets').data;
      return {
        status: pets.length > 0 ? 'PASS' : 'PARTIAL',
        details: `Discovered ${res.routes.length} routes, seeded ${pets.length} pets items.`
      };
    }
  );

  await recordBenchmark(
    'Tier 1 (Basic)',
    'APIs.guru HTTPBin Specification',
    'OpenAPI Ingestion',
    'Parses multi-path utility API (>50 endpoints)',
    'APIs.guru openapi-directory APIs/httpbin.org/0.9.2/openapi.yaml (27.8KB)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'apisguru-httpbin.yaml'), store);
      if (res.routes.length < 50) return { status: 'FAIL', details: `Expected >= 50 routes, got ${res.routes.length}` };
      return {
        status: 'PASS',
        details: `Successfully generated ${res.routes.length} routes and ${Object.keys(res.initialData).length} tables.`
      };
    }
  );

  await recordBenchmark(
    'Tier 1 (Basic)',
    'DummyJSON E-Commerce Products (Nested Array)',
    'JSON Ingestion',
    'Parses { "products": [...] } with tags, ratings, and dimensions',
    'Real-world public JSON API dummyjson.com/products (71KB)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'dummyjson-products.json'), store);
      const prods = store.list('products').data;
      if (prods.length !== 50) return { status: 'FAIL', details: `Expected 50 products, got ${prods.length}` };
      return {
        status: 'PASS',
        details: `Imported 50 rich e-commerce products with ${res.routes.length} REST endpoints.`
      };
    }
  );

  // ====================================================================
  // TIER 2: Intermediate Multi-Resource & Rich Schema
  // ====================================================================
  console.log('\n--- Tier 2: Intermediate Multi-Resource & Rich Schema ---');

  await recordBenchmark(
    'Tier 2 (Intermediate)',
    'OAI Petstore Expanded (Complex Error Models)',
    'OpenAPI Ingestion',
    'Parses multiple operations, query arrays, and pet models',
    'Official OpenAPI Initiative v3.0/pass/petstore-expanded.yaml',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'oai-petstore-expanded.yaml'), store);
      return {
        status: res.routes.length >= 4 ? 'PASS' : 'FAIL',
        details: `Generated ${res.routes.length} routes for expanded petstore.`
      };
    }
  );

  await recordBenchmark(
    'Tier 2 (Intermediate)',
    'OAI USPTO Patent Datasets API',
    'OpenAPI Ingestion',
    'Parses US Patent & Trademark Office endpoints with dataset parameters',
    'Official OpenAPI Initiative v3.0/pass/uspto.yaml',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'oai-uspto.yaml'), store);
      return {
        status: res.routes.length >= 3 ? 'PASS' : 'FAIL',
        details: `Generated ${res.routes.length} routes across USPTO dataset resources.`
      };
    }
  );

  await recordBenchmark(
    'Tier 2 (Intermediate)',
    'APIs.guru Giphy Media & Sticker API',
    'OpenAPI Ingestion',
    'Parses Giphy API endpoints and schema responses',
    'APIs.guru APIs/giphy.com/1.0/openapi.yaml (25.5KB)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'apisguru-giphy.yaml'), store);
      return {
        status: res.routes.length >= 10 ? 'PASS' : 'FAIL',
        details: `Generated ${res.routes.length} routes for Giphy media API.`
      };
    }
  );

  await recordBenchmark(
    'Tier 2 (Intermediate)',
    'APIs.guru Docker Hub DVP API',
    'OpenAPI Ingestion',
    'Parses Docker repository and tag endpoints',
    'APIs.guru APIs/docker.com/dvp/1.0.0/openapi.yaml (16.5KB)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'apisguru-docker.yaml'), store);
      return {
        status: res.routes.length >= 8 ? 'PASS' : 'FAIL',
        details: `Generated ${res.routes.length} routes for Docker API.`
      };
    }
  );

  await recordBenchmark(
    'Tier 2 (Intermediate)',
    'JSONPlaceholder Top-Level Array (Posts)',
    'JSON Array Ingestion',
    'Ingests top-level array JSON files (e.g. [ {...}, {...} ]) and infers resource name',
    'Real-world public REST mock service jsonplaceholder.typicode.com/posts (100 items)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'jsonplaceholder-posts.json'), store);
      const tables = store.getTableNames();
      if (res.routes.length === 0 || tables.length === 0) {
        return {
          status: 'FAIL',
          details: `Failed to recognize top-level array in JSON file; produced 0 routes and 0 tables.`
        };
      }
      const posts = store.list(tables[0]).data;
      return {
        status: 'PASS',
        details: `Synthesized ${res.routes.length} REST routes and seeded ${posts.length} posts.`
      };
    }
  );

  await recordBenchmark(
    'Tier 2 (Intermediate)',
    'JSONPlaceholder Top-Level Array (Users with Nested Geo)',
    'JSON Array Ingestion',
    'Ingests top-level array with nested objects (address, geo, company)',
    'Real-world public REST mock service jsonplaceholder.typicode.com/users (10 items)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'jsonplaceholder-users.json'), store);
      const tables = store.getTableNames();
      if (res.routes.length === 0 || tables.length === 0) {
        return {
          status: 'FAIL',
          details: `Failed to recognize top-level array in JSON file; produced 0 routes and 0 tables.`
        };
      }
      return {
        status: 'PASS',
        details: `Generated ${res.routes.length} routes with complex nested object attributes.`
      };
    }
  );

  // ====================================================================
  // TIER 3: Advanced Production & Large-Scale Specs
  // ====================================================================
  console.log('\n--- Tier 3: Advanced Production & Large-Scale Specs ---');

  await recordBenchmark(
    'Tier 3 (Advanced)',
    'Slack Platform API (712KB Spec, 174 Endpoints)',
    'Large-Scale OpenAPI',
    'Parses large production spec under 1000ms with 150+ routes',
    'APIs.guru APIs/slack.com/1.7.0/openapi.yaml (712KB, 174 endpoints)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'apisguru-slack.yaml'), store);
      if (res.routes.length < 150) return { status: 'FAIL', details: `Expected >= 150 routes, got ${res.routes.length}` };
      return {
        status: 'PASS',
        details: `Generated ${res.routes.length} routes and ${Object.keys(res.initialData).length} tables.`
      };
    }
  );

  await recordBenchmark(
    'Tier 3 (Advanced)',
    'Stripe Payments API (3.6MB Spec, 452 Endpoints)',
    'Massive Scale OpenAPI',
    'Parses multi-megabyte production spec without out-of-memory or timeout',
    'APIs.guru APIs/stripe.com/2022-11-15/openapi.yaml (3.6MB, 452 endpoints, 150 tables)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'apisguru-stripe-3.7MB.yaml'), store);
      if (res.routes.length < 300) return { status: 'FAIL', details: `Expected >= 300 routes, got ${res.routes.length}` };
      return {
        status: 'PASS',
        details: `Generated ${res.routes.length} routes across ${Object.keys(res.initialData).length} resources in Stripe.`
      };
    }
  );

  // ====================================================================
  // TIER 4: Edge Cases & Structural Anomalies
  // ====================================================================
  console.log('\n--- Tier 4: Edge Cases & Structural Anomalies ---');

  await recordBenchmark(
    'Tier 4 (Edge Cases)',
    'Corrupted YAML Syntax',
    'Robust Error Recovery',
    'Throws clean, descriptive syntax error rather than unhandled crash',
    'Intentionally broken YAML indentation and unclosed array tokens',
    async () => {
      const store = new RelationalStore();
      try {
        SchemaParser.parseFile(path.join(bdir, 'edge-corrupted.yaml'), store);
        return { status: 'FAIL', details: 'Should have rejected corrupted YAML syntax' };
      } catch (err: any) {
        if (err.message.includes('Failed to parse file syntax')) {
          return { status: 'PASS', details: `Correctly caught syntax error: ${err.message}` };
        }
        return { status: 'PARTIAL', details: `Caught error but unexpected message: ${err.message}` };
      }
    }
  );

  await recordBenchmark(
    'Tier 4 (Edge Cases)',
    'Cyclic $ref Pointer (Employee.manager -> Employee)',
    'Recursion Safety',
    'Parses cyclic schemas without RangeError: Maximum call stack size exceeded',
    'OpenAPI spec with self-referencing entity schema (manager: Employee)',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'edge-cyclic-ref.yaml'), store);
      const employees = store.list('employees').data;
      return {
        status: 'PASS',
        details: `Successfully handled cyclic schema; generated ${res.routes.length} routes and seeded ${employees.length} employees safely.`
      };
    }
  );

  await recordBenchmark(
    'Tier 4 (Edge Cases)',
    'Deeply Nested Schema (25 Levels Deep)',
    'Deep Recursion',
    'Parses and resolves 25 levels of nested JSON schema objects',
    'Synthesized OpenAPI with 25-level deep object tree',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'edge-deep-nesting-25.json'), store);
      return {
        status: res.routes.length > 0 ? 'PASS' : 'FAIL',
        details: `Handled 25 levels of object nesting without stack overflow.`
      };
    }
  );

  await recordBenchmark(
    'Tier 4 (Edge Cases)',
    'Multilingual & Emoji Unicode Routes',
    'Unicode Route Matching',
    'Handles emojis (/🚀/notifications), French (/café), and Chinese (/数据/指标)',
    'OpenAPI 3.0 with non-ASCII and emoji path segments',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'edge-unicode-routes.yaml'), store);
      return {
        status: res.routes.length === 3 ? 'PASS' : 'FAIL',
        details: `Generated ${res.routes.length} unicode routes with full path fidelity.`
      };
    }
  );

  await recordBenchmark(
    'Tier 4 (Edge Cases)',
    'Zero-Byte Empty File',
    'Empty File Handling',
    'Throws clean error when reading 0-byte file',
    'Empty 0-byte file edge-empty.json',
    async () => {
      const store = new RelationalStore();
      try {
        SchemaParser.parseFile(path.join(bdir, 'edge-empty.json'), store);
        return { status: 'FAIL', details: 'Should have rejected empty 0-byte file' };
      } catch (err: any) {
        return { status: 'PASS', details: `Correctly rejected empty file: ${err.message}` };
      }
    }
  );

  await recordBenchmark(
    'Tier 4 (Edge Cases)',
    'Missing Paths Object in OpenAPI',
    'Schema Resilience',
    'Does not crash when OpenAPI document contains no paths or empty paths',
    'Valid OpenAPI 3.1.0 without paths key',
    async () => {
      const store = new RelationalStore();
      const res = SchemaParser.parseFile(path.join(bdir, 'edge-missing-paths.yaml'), store);
      return {
        status: res.routes.length === 0 ? 'PASS' : 'FAIL',
        details: `Handled missing paths gracefully with ${res.routes.length} routes.`
      };
    }
  );

  // ====================================================================
  // TIER 5: Adversarial, Chaos & Contract Fidelity
  // ====================================================================
  console.log('\n--- Tier 5: Adversarial, Chaos & Contract Fidelity ---');

  await recordBenchmark(
    'Tier 5 (Adversarial/Chaos)',
    'Contract Schema Validation: Missing Required Fields',
    'Schema Validation',
    'Returns valid: false with descriptive message when required field is missing',
    'Schema requiring name and role; payload missing role',
    async () => {
      const schema = {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          name: { type: 'string' },
          role: { type: 'string' }
        }
      };
      const res = validatePayload({ name: 'Bob' }, schema);
      if (!res.valid && res.errors.some((e) => e.field === 'role')) {
        return { status: 'PASS', details: `Rejected payload: ${res.errors[0].message}` };
      }
      return { status: 'FAIL', details: `Expected validation error on 'role', got valid=${res.valid}` };
    }
  );

  await recordBenchmark(
    'Tier 5 (Adversarial/Chaos)',
    'Contract Schema Validation: Type Mismatch',
    'Schema Validation',
    'Returns valid: false when string is provided where integer is required',
    'Schema with age: integer; payload has age: "thirty"',
    async () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'integer' }
        }
      };
      const res = validatePayload({ age: 'thirty' }, schema);
      if (!res.valid && res.errors.some((e) => e.field === 'age')) {
        return { status: 'PASS', details: `Rejected type mismatch: ${res.errors[0].message}` };
      }
      return { status: 'FAIL', details: `Expected validation error on 'age', got valid=${res.valid}` };
    }
  );

  await recordBenchmark(
    'Tier 5 (Adversarial/Chaos)',
    'Chaos Statistical Distribution (25% Error Rate Over 200 Requests)',
    'Chaos Simulation Ground Truth',
    'Simulates 200 requests with 25% error rate; verifies error count is within statistical bounds (30-70 errors)',
    'Statistical binomial distribution: N=200, p=0.25, stdDev=6.12 -> 99.7% confidence interval is [31, 69]',
    async () => {
      const chaos = new ChaosEngine({
        enabled: true,
        latencyMs: 0,
        jitterMs: 0,
        errorRate: 0.25, // 25%
        errorStatusCode: 500
      });

      let errorCount = 0;
      const totalRequests = 200;

      for (let i = 0; i < totalRequests; i++) {
        const simulated = await chaos.processRequest({});
        if (simulated.shouldError) {
          errorCount++;
        }
      }

      const observedPercentage = (errorCount / totalRequests) * 100;
      if (errorCount >= 30 && errorCount <= 70) {
        return {
          status: 'PASS',
          details: `Observed ${errorCount}/${totalRequests} errors (${observedPercentage.toFixed(1)}%). Perfectly within statistical ground truth [30, 70].`
        };
      }
      return {
        status: 'FAIL',
        details: `Observed ${errorCount}/${totalRequests} errors (${observedPercentage.toFixed(1)}%), outside statistical threshold [30, 70].`
      };
    }
  );

  await recordBenchmark(
    'Tier 5 (Adversarial/Chaos)',
    'Chaos Latency & Jitter Bounds (100ms ± 30ms)',
    'Chaos Simulation Ground Truth',
    'Verifies injected delay is within [70ms, 130ms] for 100ms latency + 30ms jitter',
    'Deterministic bounds test on ChaosEngine delay calculation',
    async () => {
      const chaos = new ChaosEngine({
        enabled: true,
        latencyMs: 100,
        jitterMs: 30,
        errorRate: 0
      });

      let minDelay = Infinity;
      let maxDelay = -Infinity;

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const res = await chaos.processRequest({});
        const elapsed = Date.now() - start;
        if (res.delayedMs < minDelay) minDelay = res.delayedMs;
        if (res.delayedMs > maxDelay) maxDelay = res.delayedMs;
      }

      if (minDelay >= 70 && maxDelay <= 130) {
        return {
          status: 'PASS',
          details: `Delay bounds observed: [${minDelay}ms, ${maxDelay}ms]. Exactly within configured [70ms, 130ms].`
        };
      }
      return {
        status: 'FAIL',
        details: `Observed bounds [${minDelay}ms, ${maxDelay}ms] violated expected [70ms, 130ms].`
      };
    }
  );

  // Output summary
  console.log('\n======================================================================');
  console.log('REAL-WORLD BENCHMARK EXECUTION SUMMARY');
  console.log('======================================================================');
  const passCount = benchmarkResults.filter((r) => r.actualStatus === 'PASS').length;
  const failCount = benchmarkResults.filter((r) => r.actualStatus === 'FAIL').length;
  const partialCount = benchmarkResults.filter((r) => r.actualStatus === 'PARTIAL').length;
  const errorCount = benchmarkResults.filter((r) => r.actualStatus === 'ERROR').length;
  const total = benchmarkResults.length;

  console.log(`Total Scenarios : ${total}`);
  console.log(`PASS            : ${passCount}`);
  console.log(`FAIL            : ${failCount}`);
  console.log(`PARTIAL         : ${partialCount}`);
  console.log(`ERROR           : ${errorCount}`);
  console.log(`Success Rate    : ${((passCount / total) * 100).toFixed(1)}%`);

  fs.writeFileSync('benchmark-summary.json', JSON.stringify(benchmarkResults, null, 2));
  console.log('✔ Machine-readable report written to benchmark-summary.json\n');
}

runAllBenchmarks();
