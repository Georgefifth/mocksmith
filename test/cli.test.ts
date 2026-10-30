import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

describe('CLI Process Execution', () => {
  it('should start with --demo flag and serve requests', async () => {
    const cliPath = path.resolve('bin/mocksmith.js');
    const port = 4921;

    const proc = spawn('node', [cliPath, '--demo', '-p', String(port)], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    try {
      // Wait for server to emit ready
      await new Promise<void>((resolve, reject) => {
        let output = '';
        proc.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes(`http://localhost:${port}`)) {
            resolve();
          }
        });
        proc.stderr.on('data', (err) => {
          reject(new Error(err.toString()));
        });
        setTimeout(() => reject(new Error('Timeout waiting for MockSmith CLI to start')), 4000);
      });

      // Test querying the live CLI process
      const res = await fetch(`http://localhost:${port}/api/users`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(5);

      // Test dashboard endpoint
      const dashRes = await fetch(`http://localhost:${port}/_mocksmith`);
      expect(dashRes.status).toBe(200);
    } finally {
      proc.kill('SIGTERM');
    }
  });

  it('should load petstore OpenAPI YAML specification', async () => {
    const cliPath = path.resolve('bin/mocksmith.js');
    const port = 4922;
    const petstorePath = path.resolve('examples/petstore.yaml');

    const proc = spawn('node', [cliPath, petstorePath, '-p', String(port)], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    try {
      await new Promise<void>((resolve, reject) => {
        let output = '';
        proc.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes(`http://localhost:${port}`)) {
            resolve();
          }
        });
        setTimeout(() => reject(new Error('Timeout starting petstore CLI')), 4000);
      });

      const res = await fetch(`http://localhost:${port}/pets`);
      expect(res.status).toBe(200);
      const pets = await res.json();
      expect(Array.isArray(pets)).toBe(true);
      expect(pets.length).toBe(5);
    } finally {
      proc.kill('SIGTERM');
    }
  });
});
