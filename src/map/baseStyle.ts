import type { Map as MapboxMap } from 'mapbox-gl';

const WATER_COLOR = '#ffffff';

/** White seas, as in the reference design. The light-v11 style names its water layer "water". */
export const setWaterColor = (map: MapboxMap): void => {
  if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', WATER_COLOR);
};
