/**
 * Generates synthetic risk values, one file per disease
 * (public/data/risk/{disease}.json). Values are random but seeded, so the
 * output is reproducible, and loosely follow climate (latitude) so the map
 * looks plausible. They are not real risk estimates.
 * Some states and most districts are deliberately left without values so the
 * fallback shows on the map.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

import type { FeatureCollection, Geometry, Position } from 'geojson';

import { DISEASES, riskFile } from '../src/risk/diseases';
import type { AdminUnit, RiskLevel, RiskRow } from '../src/types';
import { DISTRICT_DIR, OUT_DIR } from './sources';

const SEED = 20261021;
const STATE_COVERAGE = 0.65;
const DISTRICT_COVERAGE = 0.35;

/** mulberry32: tiny deterministic PRNG. */
const createRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Expected risk level (1–4) at a location; the generator adds noise around it. */
type Profile = (lat: number, lon: number) => number;

/** Steps of [max |latitude|, level]; beyond the last step the level is 1. */
const byLatitude =
  (steps: [number, number][]): Profile =>
  lat =>
    steps.find(([limit]) => Math.abs(lat) <= limit)?.[1] ?? 1;

const within = (lon: number, ranges: [number, number][]) => ranges.some(([a, b]) => lon >= a && lon <= b);

const PROFILES: Record<string, Profile> = {
  malaria: byLatitude([[12, 3.5], [23, 2.8], [30, 1.6]]),
  dengue: byLatitude([[15, 3.4], [25, 2.9], [35, 1.8]]),
  zika: byLatitude([[15, 3], [25, 2.4], [32, 1.5]]),
  chikungunya: byLatitude([[15, 3.1], [25, 2.5], [32, 1.5]]),
  // Africa and South America only.
  'yellow-fever': (lat, lon) =>
    within(lon, [[-20, 52], [-85, -34]]) ? byLatitude([[10, 3.4], [18, 2.3]])(lat, lon) : 1,
  // Temperate as well as tropical.
  'west-nile': byLatitude([[20, 1.8], [35, 2.8], [48, 2.4], [55, 1.6]]),
  // South, South-East and East Asia, and the western Pacific.
  'japanese-encephalitis': (lat, lon) =>
    within(lon, [[60, 150]]) && lat > -12 ? byLatitude([[25, 3], [40, 2.4], [50, 1.6]])(lat, lon) : 1,
};

const clampLevel = (n: number): RiskLevel => Math.min(4, Math.max(1, Math.round(n))) as RiskLevel;

/** Middle of a geometry's bounding box: good enough to pick a climate band. */
const middle = (geometry: Geometry): [number, number] => {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (c: unknown): void => {
    if (typeof (c as Position)[0] === 'number') {
      const [x, y] = c as Position;
      w = Math.min(w, x);
      e = Math.max(e, x);
      s = Math.min(s, y);
      n = Math.max(n, y);
    } else (c as unknown[]).forEach(visit);
  };
  if ('coordinates' in geometry) visit(geometry.coordinates);
  return [(s + n) / 2, (w + e) / 2];
};

interface Unit extends AdminUnit {
  lat: number;
  lon: number;
}

const load = async (path: string): Promise<Unit[]> =>
  (JSON.parse(await readFile(path, 'utf8')) as FeatureCollection<Geometry, AdminUnit>).features.map(f => {
    const [lat, lon] = middle(f.geometry);
    return { ...f.properties, lat, lon };
  });

const countries = await load(`${OUT_DIR}/adm0.geojson`);
// Countries without states/districts appear in the lower files under their
// parent's gid; only real states and districts get rows of their own.
const states = (await load(`${OUT_DIR}/adm1.geojson`)).filter(u => u.gid1);
const districtFiles = (await readdir(DISTRICT_DIR)).filter(f => f.endsWith('.geojson')).sort();
const districts: Unit[] = [];
for (const file of districtFiles) {
  districts.push(...(await load(`${DISTRICT_DIR}/${file}`)).filter(u => u.gid2));
}
const statesByCountry = new Map<string, Unit[]>();
for (const state of states) {
  statesByCountry.set(state.gid0, [...(statesByCountry.get(state.gid0) ?? []), state]);
}

await rm(`${OUT_DIR}/risk`, { recursive: true, force: true });
await rm(`${OUT_DIR}/risk.json`, { force: true }); // single-disease file from earlier versions
await mkdir(`${OUT_DIR}/risk`, { recursive: true });

for (const [d, disease] of DISEASES.entries()) {
  const random = createRandom(SEED + d);
  const profile = PROFILES[disease.id];
  const noisy = (expected: number, spread: number) => clampLevel(expected + (random() * 2 - 1) * spread);

  const rows: RiskRow[] = [];
  const effective = new Map<string, RiskLevel>();

  for (const country of countries) {
    const level = noisy(profile(country.lat, country.lon), 0.6);
    rows.push({ gid0: country.gid0, level });
    effective.set(country.gid0, level);

    const countryStates = statesByCountry.get(country.gid0) ?? [];
    const withData = countryStates.filter(() => random() < STATE_COVERAGE);
    // Every country keeps at least one state without data, to show country fallback.
    if (withData.length && withData.length === countryStates.length) withData.shift();
    for (const state of countryStates) {
      if (withData.includes(state)) {
        const stateLevel = noisy(profile(state.lat, state.lon), 0.7);
        rows.push({ gid0: state.gid0, gid1: state.gid1, level: stateLevel });
        effective.set(state.gid1!, stateLevel);
      } else {
        effective.set(state.gid1!, level);
      }
    }
  }

  for (const { gid0, gid1, gid2 } of districts) {
    if (random() < DISTRICT_COVERAGE) {
      rows.push({ gid0, gid1, gid2, level: noisy(effective.get(gid1!) ?? 1, 1) });
    }
  }

  await writeFile(`${OUT_DIR}/${riskFile(disease.id)}`, JSON.stringify(rows));

  const count = (pred: (r: RiskRow) => boolean) => rows.filter(pred).length;
  console.log(
    `${riskFile(disease.id).padEnd(34)} countries ${count(r => !r.gid1)}/${countries.length}  ` +
      `states ${count(r => !!r.gid1 && !r.gid2)}/${states.length}  ` +
      `districts ${count(r => !!r.gid2)}/${districts.length}`
  );
}
