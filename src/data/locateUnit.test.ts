import type { Geometry } from 'geojson';
import { describe, expect, it } from 'vitest';

import type { AdminUnit } from '../types';
import type { AdminCollection, BoundaryStore } from './boundaries';
import { locateUnit } from './locateUnit';

const square = (west: number, south: number, size: number): Geometry => ({
  type: 'Polygon',
  coordinates: [
    [
      [west, south],
      [west + size, south],
      [west + size, south + size],
      [west, south + size],
      [west, south],
    ],
  ],
});

const collection = (...features: [AdminUnit, Geometry][]): AdminCollection => ({
  type: 'FeatureCollection',
  features: features.map(([properties, geometry]) => ({ type: 'Feature', properties, geometry })),
});

// AAA covers 0..10 and has districts only in its western state; BBB has no district file.
const store: BoundaryStore = {
  countries: collection(
    [{ gid0: 'AAA', name: 'A' }, square(0, 0, 10)],
    [{ gid0: 'BBB', name: 'B' }, square(20, 0, 10)]
  ),
  districtIndex: { AAA: [0, 0, 10, 10] },
  loadStates: async () =>
    collection(
      [{ gid0: 'AAA', gid1: 'AAA.1', name: 'A west' }, square(0, 0, 5)],
      [{ gid0: 'AAA', gid1: 'AAA.2', name: 'A east' }, square(5, 0, 5)],
      [{ gid0: 'BBB', gid1: 'BBB.1', name: 'B one' }, square(20, 0, 10)]
    ),
  loadDistricts: async () =>
    collection([{ gid0: 'AAA', gid1: 'AAA.1', gid2: 'AAA.1.1', name: 'A west 1' }, square(0, 0, 5)]),
  names: () => new Map(),
};

describe('locateUnit', () => {
  it('finds the district containing the point', async () => {
    expect((await locateUnit(store, [2, 2]))?.gid2).toBe('AAA.1.1');
  });

  it('falls back to the state where no district contains the point', async () => {
    expect((await locateUnit(store, [7, 2]))?.gid1).toBe('AAA.2');
  });

  it('uses states for a country without a district file', async () => {
    expect((await locateUnit(store, [25, 5]))?.gid1).toBe('BBB.1');
  });

  it('returns null outside every area', async () => {
    expect(await locateUnit(store, [15, 5])).toBeNull();
  });
});
