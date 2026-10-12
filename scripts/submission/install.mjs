// Let npm users install the existing pnpm workspace without changing its layout.
import { spawnSync } from 'node:child_process';
if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
  const result = spawnSync('pnpm', ['install', '--frozen-lockfile'], { stdio: 'inherit' });
  if (result.error) console.error('Install pnpm 11.18.0 first: npm install -g pnpm@11.18.0');
  process.exit(result.status ?? 1);
}
