import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

import type { AdminUnit } from '../types';
import type { AdminCollection, BoundaryStore } from './boundaries';

/** [longitude, latitude] */
export type LngLat = [number, number];

/** The first area in the collection that contains the point. */
export const unitAt = (collection: AdminCollection, point: LngLat): AdminUnit | null =>
  collection.features.find(
    f =>
      (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') &&
      booleanPointInPolygon(point, f.geometry)
  )?.properties ?? null;

const inCountry = (collection: AdminCollection, gid0: string): AdminCollection => ({
  type: 'FeatureCollection',
  features: collection.features.filter(f => f.properties.gid0 === gid0),
});

/**
 * The deepest admin area containing the point: its district, else its state,
 * else its country. Loads states and that country's districts if needed.
 * Each level is searched on its own because the levels are simplified
 * differently, so a point near a coast can fall inside a state but just
 * outside the country outline. Null if no area contains it (e.g. at sea).
 */
export const locateUnit = async (store: BoundaryStore, point: LngLat): Promise<AdminUnit | null> => {
  const country = unitAt(store.countries, point);
  const state = unitAt(await store.loadStates(), point);
  const iso = state?.gid0 ?? country?.gid0;
  if (!iso) return null;

  const district = store.districtIndex[iso]
    ? unitAt(inCountry(await store.loadDistricts([iso]), iso), point)
    : null;
  return district ?? state ?? country;
};
