/**
 * Tests and builds the map, then copies dist/ into the portfolio site
 * (../portfolio/risk-map/ by default, or $PORTFOLIO_DIR/risk-map/), which
 * serves it at https://johnsaita.github.io/risk-map/. The old copy is removed
 * first so stale hashed assets don't pile up. Commit and push the portfolio
 * repo afterwards to go live.
 */
import { execSync } from 'node:child_process';
import { cp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PORTFOLIO_DIR = resolve(ROOT, process.env.PORTFOLIO_DIR ?? '../portfolio');
const TARGET = resolve(PORTFOLIO_DIR, 'risk-map');

const hasToken = async () => {
  if (process.env.VITE_MAPBOX_TOKEN) return true;
  const env = await readFile(resolve(ROOT, '.env'), 'utf8').catch(() => '');
  return /^VITE_MAPBOX_TOKEN=\S+/m.test(env);
};

const run = (command: string) => execSync(command, { cwd: ROOT, stdio: 'inherit' });

if (!(await hasToken())) {
  throw new Error('VITE_MAPBOX_TOKEN is not set in .env; the published map would have no base map.');
}

run('npm test');
run('npm run build');

await rm(TARGET, { recursive: true, force: true });
await cp(resolve(ROOT, 'dist'), TARGET, { recursive: true });
console.log(`Copied dist/ to ${TARGET}. Commit and push the portfolio repo to publish.`);
