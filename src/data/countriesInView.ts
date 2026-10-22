import type { BBox } from 'geojson';

/** [west, south, east, north] of the visible map, in degrees. */
export type ViewBounds = [number, number, number, number];

const overlaps = (a: BBox, west: number, south: number, east: number, north: number) =>
  a[0] <= east && a[2] >= west && a[1] <= north && a[3] >= south;

/**
 * Countries whose bounding box overlaps the view. The view's longitudes may
 * run past ±180 when the map wraps around the antimeridian, so it is also
 * tested shifted by ±360°.
 */
export const countriesInView = (index: Readonly<Record<string, BBox>>, view: ViewBounds): string[] => {
  const [west, south, east, north] = view;
  if (east - west >= 360) return Object.keys(index);
  return Object.entries(index)
    .filter(([, box]) =>
      [-360, 0, 360].some(shift => overlaps(box, west + shift, south, east + shift, north))
    )
    .map(([iso]) => iso);
};
