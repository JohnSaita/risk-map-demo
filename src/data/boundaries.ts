import type { BBox, FeatureCollection, Geometry } from 'geojson';

import type { AdminUnit } from '../types';
import { fetchJson } from './fetchJson';

export type AdminCollection = FeatureCollection<Geometry, AdminUnit>;

/**
 * Boundaries, loaded in stages so the first view is fast:
 * countries up front, states right after, districts per country on demand.
 * Everything loaded is cached; nothing is fetched twice.
 */
export interface BoundaryStore {
  countries: AdminCollection;
  /** { ISO: bbox } for every country that has a district file. */
  districtIndex: Readonly<Record<string, BBox>>;
  loadStates(): Promise<AdminCollection>;
  /** Loads the given countries' districts and resolves to all districts loaded so far. */
  loadDistricts(isos: string[]): Promise<AdminCollection>;
  /** Country and (once loaded) state names by gid, for "inherited from …" labels. */
  names(): ReadonlyMap<string, string>;
}

const unitGid = (u: AdminUnit) => u.gid2 ?? u.gid1 ?? u.gid0;

const addNames = (names: Map<string, string>, fc: AdminCollection) => {
  for (const f of fc.features) names.set(unitGid(f.properties), f.properties.name);
};

export const loadBoundaries = async (): Promise<BoundaryStore> => {
  const [countries, districtIndex] = await Promise.all([
    fetchJson<AdminCollection>('adm0.geojson'),
    fetchJson<Record<string, BBox>>('adm2/index.json'),
  ]);

  const names = new Map<string, string>();
  addNames(names, countries);

  let states: Promise<AdminCollection> | null = null;
  const loadStates = () =>
    (states ??= fetchJson<AdminCollection>('adm1.geojson').then(fc => {
      addNames(names, fc);
      return fc;
    }));

  const districtFiles = new Map<string, Promise<AdminCollection>>();
  const loadDistricts = async (isos: string[]): Promise<AdminCollection> => {
    await loadStates(); // district fallback labels name the state
    for (const iso of isos) {
      if (!districtFiles.has(iso) && districtIndex[iso]) {
        const file = fetchJson<AdminCollection>(`adm2/${iso}.geojson`);
        // Forget a failed file so the next pan retries it.
        file.catch(() => districtFiles.delete(iso));
        districtFiles.set(iso, file);
      }
    }
    const loaded = await Promise.all(districtFiles.values());
    return { type: 'FeatureCollection', features: loaded.flatMap(fc => fc.features) };
  };

  return { countries, districtIndex, loadStates, loadDistricts, names: () => names };
};
