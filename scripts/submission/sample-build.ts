// Offline build verification only. Never used by vercel.json or a deployed API.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeOpportunity } from '../../artifacts/api-server/src/lib/opportunity-repository.ts';
const root = fileURLToPath(new URL('../../', import.meta.url));
const rows = JSON.parse(readFileSync(new URL('../../data/sample-opportunities.json', import.meta.url), 'utf8'));
const opportunities = rows.map((row: Record<string, unknown>) => ({ ...normalizeOpportunity(row), published: true }));
const server = createServer((req, res) => {
  if (req.url !== '/api/opportunities') { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ count: opportunities.length, opportunities }));
});
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing local server address');
  console.log('Building with 10 fictional examples. Do not deploy this sample output.');
  const child = spawn(process.execPath, ['scripts/submission/local.mjs', 'build'], {
    cwd: root, stdio: 'inherit',
    env: { ...process.env, PRERENDER_API_BASE: `http://127.0.0.1:${address.port}` },
  });
  child.on('error', (error) => { console.error(error); server.close(); process.exitCode = 1; });
  child.on('exit', (code) => { server.close(); process.exitCode = code ?? 1; });
});
