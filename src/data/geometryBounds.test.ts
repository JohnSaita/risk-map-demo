import type { Polygon, Position } from 'geojson';
import { describe, expect, it } from 'vitest';

import { geometryBounds } from './geometryBounds';

const box = (west: number, south: number, east: number, north: number): Position[][] => [
  [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ],
];

describe('geometryBounds', () => {
  it('returns the box of an ordinary polygon', () => {
    const polygon: Polygon = { type: 'Polygon', coordinates: box(33.9, -4.7, 41.9, 5.0) };
    expect(geometryBounds(polygon)).toEqual([
      [33.9, -4.7],
      [41.9, 5.0],
    ]);
  });

  it('keeps a country that crosses the antimeridian in one narrow box', () => {
    // Islands either side of 180°, like Fiji or eastern Russia.
    const bounds = geometryBounds({
      type: 'MultiPolygon',
      coordinates: [box(177, -19, 180, -16), box(-180, -18, -178.5, -16.5)],
    });
    expect(bounds).toEqual([
      [177, -19],
      [181.5, -16],
    ]);
  });

  it('does not shift a country that spans many longitudes without crossing 180°', () => {
    const bounds = geometryBounds({
      type: 'MultiPolygon',
      coordinates: [box(-120, 30, -70, 50), box(10, 30, 40, 50)],
    });
    expect(bounds).toEqual([
      [-120, 30],
      [40, 50],
    ]);
  });

  it('returns null for an empty geometry', () => {
    expect(geometryBounds({ type: 'MultiPolygon', coordinates: [] })).toBeNull();
  });
});
