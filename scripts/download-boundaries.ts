/**
 * Downloads geoBoundaries metadata and every openly licensed, simplified
 * country file into data-raw/ (git-ignored). Files already present are
 * skipped, so an interrupted run can be resumed.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';

import { BoundaryMeta, isOpenLicense, LEVELS, metaPath, metaUrl, RAW_DIR, rawPath } from './sources';

const CONCURRENCY = 8;
const RETRIES = 3;

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false
  );

const fetchText = async (url: string): Promise<string> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      JSON.parse(body); // fail fast on anything that is not JSON
      return body;
    } catch (err) {
      if (attempt >= RETRIES) throw new Error(`${url}: ${(err as Error).message}`);
    }
  }
};

await mkdir(RAW_DIR, { recursive: true });

const jobs: { path: string; url: string }[] = [];
for (const level of LEVELS) {
  const body = await fetchText(metaUrl(level));
  await writeFile(metaPath(level), body);
  const metas = JSON.parse(body) as BoundaryMeta[];
  const excluded = metas.filter(m => !isOpenLicense(m.boundaryLicense));
  for (const m of excluded) {
    console.log(`skip ${m.boundaryISO} ${level}: licence "${m.boundaryLicense}"`);
  }
  for (const m of metas.filter(m => isOpenLicense(m.boundaryLicense))) {
    jobs.push({ path: rawPath(m.boundaryISO, level), url: m.simplifiedGeometryGeoJSON });
  }
}

let done = 0;
let failed = 0;
const worker = async () => {
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    try {
      if (!(await exists(job.path))) await writeFile(job.path, await fetchText(job.url));
    } catch (err) {
      failed++;
      console.error((err as Error).message);
    }
    if (++done % 50 === 0) console.log(`${done} files…`);
  }
};
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`done: ${done} files, ${failed} failed`);
if (failed) process.exitCode = 1;
