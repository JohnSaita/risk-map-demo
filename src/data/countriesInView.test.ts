import type { BBox } from 'geojson';
import { describe, expect, it } from 'vitest';

import { countriesInView } from './countriesInView';

const index: Record<string, BBox> = {
  KEN: [33.9, -4.7, 41.9, 5.0],
  BRA: [-74.0, -33.8, -34.8, 5.3],
  FJI: [-180, -21.0, 180, -12.5], // crosses the antimeridian, so its bbox spans all longitudes
  NZL: [166.4, -47.3, 178.6, -34.4],
};

describe('countriesInView', () => {
  it('returns only countries overlapping the view', () => {
    expect(countriesInView(index, [35, -2, 38, 1])).toEqual(['KEN']);
  });

  it('returns nothing for open ocean away from any country', () => {
    expect(countriesInView(index, [-30, 20, -25, 25])).toEqual([]);
  });

  it('finds countries when the view runs past 180° longitude', () => {
    // Panning east past New Zealand: longitudes 175..190 (= -185..-170).
    expect(countriesInView(index, [175, -45, 190, -15]).sort()).toEqual(['FJI', 'NZL']);
  });

  it('returns every country when the view spans the whole world', () => {
    expect(countriesInView(index, [-200, -80, 200, 80]).sort()).toEqual(['BRA', 'FJI', 'KEN', 'NZL']);
  });
});
