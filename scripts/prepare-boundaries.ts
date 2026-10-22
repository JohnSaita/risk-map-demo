/**
 * Turns the raw geoBoundaries downloads into the files the app loads:
 *   public/data/adm0.geojson        every country            (loaded at start)
 *   public/data/adm1.geojson        every state              (loaded right after)
 *   public/data/adm2/{ISO}.geojson  districts of one country (loaded on zoom-in)
 *   public/data/adm2/index.json     { ISO: bbox } to pick files for the viewport
 *   public/data/sources.json        licence and source of every file used
 * with stable, hierarchical IDs:
 *   gid0 = ISO3            e.g. KEN
 *   gid1 = gid0.<n>        e.g. KEN.12
 *   gid2 = gid1.<n>        e.g. KEN.12.3
 * geoBoundaries ADM2 features don't reference their ADM1 parent, so the parent
 * is found spatially (point-on-feature inside the ADM1 polygon).
 *
 * Gaps are filled from the level above or below so every zoom band covers
 * every country: a country without an open ADM0 file is dissolved from its
 * states; a level with no file reuses the level above it (those features keep
 * the parent's IDs, so they resolve to the parent's risk).
 * Countries are processed one at a time to keep memory use low.
 */
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centroid from '@turf/centroid';
import distance from '@turf/distance';
import pointOnFeature from '@turf/point-on-feature';
import type { BBox, Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import mapshaper from 'mapshaper';

import {
  AdminLevel,
  BoundaryMeta,
  DISTRICT_DIR,
  isOpenLicense,
  LEVELS,
  metaPath,
  OUT_DIR,
  rawPath,
} from './sources';

type Area = Feature<Polygon | MultiPolygon, Record<string, unknown>>;

/**
 * Simplification tolerance per level, in metres, matched to the zoom band the
 * level is shown at (coarse for the world view, fine for districts).
 */
const SIMPLIFY_INTERVAL: Record<AdminLevel, number> = { ADM0: 8000, ADM1: 3000, ADM2: 1200 };
const PRECISION: Record<AdminLevel, string> = { ADM0: '0.01', ADM1: '0.01', ADM2: '0.001' };

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false
  );

const runMapshaper = async (commands: string, text: string, precision: string): Promise<Area[]> => {
  const output = await mapshaper.applyCommands(
    `-i in.json ${commands} -o out.json format=geojson geojson-type=FeatureCollection precision=${precision}`,
    { 'in.json': text }
  );
  const fc = JSON.parse(String(output['out.json'])) as FeatureCollection<Polygon | MultiPolygon>;
  // `allow-empty` keeps features whose shape simplified away; drop them here.
  return fc.features.filter(f => f.geometry?.coordinates.length) as Area[];
};

const simplify = (text: string, level: AdminLevel) =>
  runMapshaper(
    `-simplify interval=${SIMPLIFY_INTERVAL[level]} keep-shapes -clean allow-empty`,
    text,
    PRECISION[level]
  );

const dissolve = (areas: Area[]) =>
  runMapshaper(
    '-dissolve -clean',
    JSON.stringify({ type: 'FeatureCollection', features: areas }),
    PRECISION.ADM0
  );

const byName = (a: Area, b: Area) =>
  String(a.properties.shapeName).localeCompare(String(b.properties.shapeName));

const findParent = (child: Area, candidates: Area[]): { parent: Area; nearest: boolean } => {
  const point = pointOnFeature(child);
  const containing = candidates.find(c => booleanPointInPolygon(point, c));
  if (containing) return { parent: containing, nearest: false };
  // Borders from different sources don't always nest; fall back to nearest.
  const here = centroid(child);
  const parent = candidates.reduce((best, c) =>
    distance(here, centroid(c)) < distance(here, centroid(best)) ? c : best
  );
  return { parent, nearest: true };
};

const bboxOf = (features: Area[]): BBox => {
  const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (coords: unknown): void => {
    if (typeof (coords as Position)[0] === 'number') {
      const [x, y] = coords as Position;
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
    } else (coords as unknown[]).forEach(visit);
  };
  features.forEach(f => visit(f.geometry.coordinates));
  return box.map(n => Math.round(n * 100) / 100) as BBox;
};

const collection = (features: Feature[]): string =>
  JSON.stringify({ type: 'FeatureCollection', features });

// --- metadata --------------------------------------------------------------

const metas = new Map<string, Partial<Record<AdminLevel, BoundaryMeta>>>();
for (const level of LEVELS) {
  const list = JSON.parse(await readFile(metaPath(level), 'utf8')) as BoundaryMeta[];
  for (const m of list) {
    metas.set(m.boundaryISO, { ...metas.get(m.boundaryISO), [level]: m });
  }
}

/** Raw file for a level, or null when it is missing or not openly licensed. */
const loadRaw = async (iso: string, level: AdminLevel): Promise<string | null> => {
  const meta = metas.get(iso)?.[level];
  if (!meta || !isOpenLicense(meta.boundaryLicense)) return null;
  const path = rawPath(iso, level);
  return (await exists(path)) ? readFile(path, 'utf8') : null;
};

// --- per country -----------------------------------------------------------

interface SourceRecord {
  level: AdminLevel;
  license: string;
  source: string;
  licenseSource: string;
}

const adm0Out: Area[] = [];
const adm1Out: Area[] = [];
const districtIndex: Record<string, BBox> = {};
const sources: Record<string, { name: string; files: SourceRecord[]; notes: string[] }> = {};
let nearestParents = 0;

await rm(DISTRICT_DIR, { recursive: true, force: true });
await mkdir(DISTRICT_DIR, { recursive: true });

const isos = [...metas.keys()].sort();
for (const [n, gid0] of isos.entries()) {
  const meta = metas.get(gid0)!;
  const name = (meta.ADM0 ?? meta.ADM1 ?? meta.ADM2)!.boundaryName;
  const notes: string[] = [];
  const used: SourceRecord[] = [];
  const take = async (level: AdminLevel): Promise<Area[]> => {
    const text = await loadRaw(gid0, level);
    if (!text) return [];
    const m = meta[level]!;
    used.push({ level, license: m.boundaryLicense, source: m.boundarySource, licenseSource: m.licenseSource });
    const areas = await simplify(text, level);
    // Very small islands can vanish at coarse intervals; keep them unsimplified.
    return areas.length ? areas : runMapshaper('', text, PRECISION.ADM2);
  };

  const rawStates = (await take('ADM1')).sort(byName);
  const rawDistricts = await take('ADM2');
  let country = await take('ADM0');
  if (!country.length && (rawStates.length || rawDistricts.length)) {
    country = await dissolve(rawStates.length ? rawStates : rawDistricts);
    notes.push(`country outline dissolved from ${rawStates.length ? 'states' : 'districts'} (no open ADM0 file)`);
  }
  if (!country.length) {
    console.log(`skip ${gid0}: no usable boundaries`);
    continue;
  }

  const countryArea: Area = {
    type: 'Feature',
    geometry:
      country.length === 1
        ? country[0].geometry
        : { type: 'MultiPolygon', coordinates: country.flatMap(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) },
    properties: { gid0, name },
  };
  adm0Out.push(countryArea);

  const states: Area[] = rawStates.map((f, i) => ({
    ...f,
    properties: { gid0, gid1: `${gid0}.${i + 1}`, name: String(f.properties.shapeName) },
  }));
  if (states.length) adm1Out.push(...states);
  else {
    adm1Out.push(countryArea);
    notes.push('no states: country shown at state zoom');
  }

  const districts: Area[] = [];
  if (rawDistricts.length && states.length) {
    const byState = new Map<Area, Area[]>();
    for (const f of rawDistricts) {
      const { parent, nearest } = findParent(f, states);
      if (nearest) nearestParents++;
      byState.set(parent, [...(byState.get(parent) ?? []), f]);
    }
    for (const state of states) {
      const gid1 = String(state.properties.gid1);
      (byState.get(state) ?? []).sort(byName).forEach((f, i) =>
        districts.push({
          ...f,
          properties: { gid0, gid1, gid2: `${gid1}.${i + 1}`, name: String(f.properties.shapeName) },
        })
      );
    }
  } else {
    districts.push(...(states.length ? states : [countryArea]));
    notes.push(`no ${rawDistricts.length ? 'states to nest districts in' : 'open district file'}: ${states.length ? 'states' : 'country'} shown at district zoom`);
  }
  await writeFile(`${DISTRICT_DIR}/${gid0}.geojson`, collection(districts));
  districtIndex[gid0] = bboxOf([countryArea]);

  sources[gid0] = { name, files: used, notes };
  if ((n + 1) % 25 === 0) console.log(`${n + 1}/${isos.length} countries…`);
}

await writeFile(`${OUT_DIR}/adm0.geojson`, collection(adm0Out));
await writeFile(`${OUT_DIR}/adm1.geojson`, collection(adm1Out));
await writeFile(`${DISTRICT_DIR}/index.json`, JSON.stringify(districtIndex));
await writeFile(`${OUT_DIR}/sources.json`, JSON.stringify(sources, null, 1));

console.log(
  `countries ${adm0Out.length}, states ${adm1Out.filter(f => f.properties.gid1).length}, ` +
    `district files ${Object.keys(districtIndex).length}, parents by nearest centroid ${nearestParents}`
);
