import type { Map as MapboxMap } from 'mapbox-gl';

import { ADMIN_BANDS } from '../risk/zoomBands';
import { firstLabelLayerId } from './addRiskLayers';

const MASK_LAYER_IDS = ADMIN_BANDS.map(b => `${b.id}-focus-mask`);
/** Country outlines are simplified for the country band only, so the outline is drawn there alone. */
const OUTLINE_LAYER_ID = 'adm0-focus-outline';

/**
 * Dims every area outside the focused country. There is one mask layer per
 * admin source, limited to that band's zoom range, so the mask follows the
 * boundaries on screen exactly and only one admin level still renders at a
 * time. Hidden until a country is focused. Call after addRiskLayers.
 */
export const addCountryMaskLayers = (map: MapboxMap): void => {
  const beforeId = firstLabelLayerId(map);

  ADMIN_BANDS.forEach((band, i) => {
    map.addLayer(
      {
        id: MASK_LAYER_IDS[i],
        type: 'fill',
        source: band.id,
        minzoom: band.minzoom,
        maxzoom: band.maxzoom,
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.75 },
      },
      beforeId
    );
  });

  const countryBand = ADMIN_BANDS[0];
  map.addLayer(
    {
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: countryBand.id,
      minzoom: countryBand.minzoom,
      maxzoom: countryBand.maxzoom,
      layout: { visibility: 'none' },
      paint: { 'line-color': '#1f1f1f', 'line-width': 2.5 },
    },
    beforeId
  );
};

/** Masks everything outside `gid0`, or removes the mask when null. */
export const setCountryMask = (map: MapboxMap, gid0: string | null): void => {
  const visibility = gid0 ? 'visible' : 'none';
  for (const id of MASK_LAYER_IDS) {
    if (gid0) map.setFilter(id, ['!=', ['get', 'gid0'], gid0]);
    map.setLayoutProperty(id, 'visibility', visibility);
  }
  if (gid0) map.setFilter(OUTLINE_LAYER_ID, ['==', ['get', 'gid0'], gid0]);
  map.setLayoutProperty(OUTLINE_LAYER_ID, 'visibility', visibility);
};
