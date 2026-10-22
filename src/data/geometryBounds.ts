import type { Geometry, Position } from 'geojson';

/** [[west, south], [east, north]], as Mapbox's fitBounds takes it. */
export type LngLatBox = [[number, number], [number, number]];

const positionsOf = (geometry: Geometry): Position[] => {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates;
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat();
    case 'MultiPolygon':
      return geometry.coordinates.flat(2);
    case 'GeometryCollection':
      return geometry.geometries.flatMap(positionsOf);
  }
};

/** Loops rather than Math.min(...values): large countries have more points than spread allows. */
const range = (values: number[]): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
};

/**
 * Bounding box of a geometry, or null if it has no points. A country that
 * crosses the antimeridian (Russia, the US Aleutians) has longitudes near both
 * -180 and 180; when shifting its western longitudes by +360 gives a narrower
 * box, that box is used, so `east` may exceed 180 (Mapbox accepts this).
 */
export const geometryBounds = (geometry: Geometry): LngLatBox | null => {
  const positions = positionsOf(geometry);
  if (positions.length === 0) return null;

  const lngs = positions.map(p => p[0]);
  const [south, north] = range(positions.map(p => p[1]));
  const [west, east] = range(lngs);
  const [shiftedWest, shiftedEast] = range(lngs.map(lng => (lng < 0 ? lng + 360 : lng)));

  return shiftedEast - shiftedWest < east - west
    ? [[shiftedWest, south], [shiftedEast, north]]
    : [[west, south], [east, north]];
};
