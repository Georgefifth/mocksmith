import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { RelationalStore } from './engine/store.js';
import { ChaosEngine } from './engine/chaos.js';
import { SchemaParser } from './engine/schema-parser.js';
import { setRandomSeed } from './engine/faker-lite.js';
import { MockSmithServer } from './server.js';

export function runCLI(args: string[] = process.argv): void {
  const program = new Command();

  program
    .name('mocksmith')
    .description('Zero-configuration stateful mock API server and network chaos sandbox')
    .version('1.0.0')
    .argument('[spec]', 'Path to OpenAPI YAML/JSON specification or raw JSON data model')
    .option('-p, --port <number>', 'Port to listen on', '4000')
    .option('-l, --latency <number>', 'Base network latency injection in ms', '0')
    .option('-j, --jitter <number>', 'Latency jitter in ms', '0')
    .option('-e, --error-rate <number>', 'Chaos failure rate (0.0 to 1.0)', '0')
    .option('-s, --status-code <number>', 'Chaos HTTP status code to inject (500, 503, 429)', '500')
    .option('--auth', 'Enable Bearer authorization simulation', false)
    .option('--persist <path>', 'Persist state mutations to a local JSON file')
    .option('--seed <number>', 'Deterministic PRNG seed for reproducible mock data')
    .option('--demo', 'Start instant interactive demo store with Users, Products, and Orders', false)
    .action(async (specPath, options) => {
      printBanner();

      if (options.seed !== undefined) {
        setRandomSeed(Number(options.seed));
        console.log(pc.cyan(`🎲 Deterministic PRNG Seed set to: ${pc.bold(options.seed)}`));
      }

      const port = Number(options.port) || 4000;
      const latencyMs = Number(options.latency) || 0;
      const jitterMs = Number(options.jitter) || 0;
      const errorRate = Number(options.errorRate) || 0;
      const errorStatusCode = Number(options.statusCode) || 500;
      const isDemo = options.demo || !specPath;

      const store = new RelationalStore({
        persistPath: options.persist ? path.resolve(options.persist) : undefined,
        autoSave: !!options.persist
      });

      const chaos = new ChaosEngine({
        enabled: latencyMs > 0 || errorRate > 0 || options.auth,
        latencyMs,
        jitterMs,
        errorRate,
        errorStatusCode,
        requireAuth: options.auth
      });

      let parseResult: import('./engine/schema-parser.js').ParseResult;
      try {
        if (isDemo && !specPath) {
          console.log(pc.cyan('ℹ No specification provided. Initializing MockSmith interactive DEMO API...\n'));
          parseResult = SchemaParser.generateDemo(store);
        } else {
          console.log(pc.cyan(`ℹ Ingesting API specification from: ${pc.bold(specPath)}...\n`));
          parseResult = SchemaParser.parseFile(path.resolve(specPath), store);
        }
      } catch (err: any) {
        console.error(pc.red(`✖ Failed to load specification: ${err.message}`));
        process.exit(1);
        return;
      }

      const server = new MockSmithServer(store, chaos, parseResult.routes, { port });
      server.setInitialSeed(parseResult.initialData);

      try {
        const activePort = await server.listen();
        console.log(pc.green(`✔ MockSmith API server running at: ${pc.bold(`http://localhost:${activePort}`)}`));
        console.log(pc.magenta(`★ Web Studio & Chaos Dashboard: ${pc.bold(`http://localhost:${activePort}/_mocksmith`)}\n`));

        if (chaos.getConfig().enabled) {
          console.log(pc.yellow(`⚡ Chaos Interceptor ACTIVE: ${latencyMs}ms delay, ${(errorRate * 100).toFixed(0)}% fail rate (${errorStatusCode})`));
        }

        console.log(pc.dim('------------------------------------------------------------'));
        console.log(pc.bold('Discovered Mock Endpoints:'));
        for (const r of parseResult.routes) {
          const methodColor = getMethodColor(r.method);
          console.log(`  ${methodColor(r.method.padEnd(7))} ${r.path} ${pc.dim(r.summary ? `(${r.summary})` : '')}`);
        }
        console.log(pc.dim('------------------------------------------------------------\n'));
        console.log(pc.dim('Press Ctrl+C to stop server.\n'));
      } catch (err: any) {
        console.error(pc.red(`✖ Failed to start server on port ${port}: ${err.message}`));
        process.exit(1);
      }
    });

  program.parse(args);
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return pc.cyan;
    case 'POST': return pc.green;
    case 'PUT':
    case 'PATCH': return pc.yellow;
    case 'DELETE': return pc.red;
    default: return pc.white;
  }
}

function printBanner(): void {
  console.log(pc.bold(pc.cyan(`
   __  __            _    ____            _ _   _     
  |  \\/  |          | |  / ___| _ __ ___ (_) |_| |__  
  | |\\/| | ___   ___| | _\\___ \\| '_ \` _ \\| | __| '_ \\ 
  | |  | |/ _ \\ / __| |/ /___) | | | | | | | |_| | | |
  |_|  |_|\\___/ \\___|_|\\_\\____/|_| |_| |_|_|\\__|_| |_|
  `)));
  console.log(pc.dim('  Zero-Config Stateful Mock API Server & Network Chaos Sandbox\n'));
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('cli.ts')) {
  runCLI();
}
