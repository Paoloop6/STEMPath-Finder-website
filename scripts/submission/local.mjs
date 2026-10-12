// Local tooling only. Production entry points and application code are unchanged.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(root);
let file = {};
try { file = parseEnv(readFileSync('.env', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const env = { ...file, ...process.env };
// Blank optional values must be absent so the source's existing defaults apply.
for (const [key, value] of Object.entries(env)) if (value === '') delete env[key];
const mode = process.argv[2];
let args;
if (mode === 'build') {
  env.PORT ||= '5173';
  env.BASE_PATH ||= '/';
  args = ['run', 'build:workspace'];
} else if (mode === 'website') {
  env.PORT ||= '5173';
  env.BASE_PATH ||= '/';
  args = ['--filter', '@workspace/stempathfinder', 'run', 'dev'];
} else if (mode === 'server') {
  if (env.NODE_ENV === 'production') throw new Error('start:example is only for local development.');
  env.NODE_ENV = 'development';
  env.PORT ||= '8080';
  env.DATABASE_URL ||= 'postgresql://localhost:5432/nextstep';
  env.SESSION_SECRET ||= randomBytes(32).toString('hex');
  env.AWS_EC2_METADATA_DISABLED = 'true';
  console.log('Local API: /api/healthz works without service keys. Data routes need configured databases.');
  args = ['--filter', '@workspace/api-server', 'run', 'start'];
} else { throw new Error('Expected build, website, or server'); }
const result = spawnSync('pnpm', args, { stdio: 'inherit', env });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
