import type { ExpressionSpecification, Map as MapboxMap } from 'mapbox-gl';

import type { LayerSettings } from '../types';
import { firstLabelLayerId, setRiskVisible } from './addRiskLayers';

const DEM_SOURCE = 'mapbox-dem';
const ELEVATION_SOURCE = 'elevation-rgb';
const CONTOUR_SOURCE = 'mapbox-terrain';

const ELEVATION_LAYER = 'elevation-tint';
const HILLSHADE_LAYER = 'relief-hillshade';
const CONTOUR_LAYERS = ['contour-lines', 'contour-labels'];

const TERRAIN_EXAGGERATION = 1.4;
/** Pitch used when 3D terrain is switched on, so the relief is visible straight away. */
const TERRAIN_PITCH = 55;

/** Metres → colour, low green to high brown and white. Also drawn by the elevation legend. */
export const ELEVATION_STOPS: readonly (readonly [number, string])[] = [
  [0, '#4f9a64'],
  [200, '#8cbf6e'],
  [600, '#d9d58b'],
  [1200, '#e2b36d'],
  [2000, '#c4875a'],
  [3000, '#9a6b55'],
  [4500, '#e8e2dc'],
  [6000, '#ffffff'],
];
export const ELEVATION_MAX = ELEVATION_STOPS[ELEVATION_STOPS.length - 1][0];

/**
 * Terrain-RGB encodes height as -10000 + 0.1 × (R × 65536 + G × 256 + B), with
 * channels 0–255. raster-color-mix sees channels as 0–1, hence the ×255.
 */
const TERRAIN_RGB_MIX: [number, number, number, number] = [0.1 * 255 * 65536, 0.1 * 255 * 256, 0.1 * 255, -10000];

const elevationColor = [
  'interpolate',
  ['linear'],
  ['raster-value'],
  ...ELEVATION_STOPS.flat(),
] as ExpressionSpecification;

/**
 * Adds the elevation tint, hillshade and contour layers, all hidden at first.
 * The tint sits under the base map's water, so seas keep their colour. Shading
 * and contours sit over the risk layers, so they also work in risk mode.
 * Call after addRiskLayers and addCountryMaskLayers.
 */
export const addReliefLayers = (map: MapboxMap): void => {
  const labels = firstLabelLayerId(map);
  const underWater = map.getLayer('water') ? 'water' : labels;
  const hidden = { visibility: 'none' } as const;

  map.addSource(DEM_SOURCE, { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
  map.addSource(ELEVATION_SOURCE, { type: 'raster', url: 'mapbox://mapbox.terrain-rgb', tileSize: 256 });
  map.addSource(CONTOUR_SOURCE, { type: 'vector', url: 'mapbox://mapbox.mapbox-terrain-v2' });

  map.addLayer(
    {
      id: ELEVATION_LAYER,
      type: 'raster',
      source: ELEVATION_SOURCE,
      layout: hidden,
      paint: {
        'raster-color': elevationColor,
        'raster-color-mix': TERRAIN_RGB_MIX,
        'raster-color-range': [0, ELEVATION_MAX],
        // Blending neighbouring encoded pixels would mix up their digits.
        'raster-resampling': 'nearest',
        'raster-opacity': 0.9,
      },
    },
    underWater
  );
  map.addLayer(
    {
      id: HILLSHADE_LAYER,
      type: 'hillshade',
      source: DEM_SOURCE,
      layout: hidden,
      paint: {
        // Maximum exaggeration and strong shadows, so relief reads through the risk colours.
        'hillshade-exaggeration': 1,
        'hillshade-shadow-color': 'rgba(20, 20, 35, 0.8)',
        'hillshade-highlight-color': 'rgba(255, 255, 255, 0.55)',
        'hillshade-accent-color': 'rgba(20, 20, 35, 0.45)',
      },
    },
    labels
  );
  map.addLayer(
    {
      id: CONTOUR_LAYERS[0],
      type: 'line',
      source: CONTOUR_SOURCE,
      'source-layer': 'contour',
      layout: { ...hidden, 'line-join': 'round' },
      paint: {
        'line-color': '#6b4f2a',
        'line-opacity': 0.5,
        // Index contours (every 5th/10th line) drawn heavier.
        'line-width': ['match', ['get', 'index'], [5, 10], 1.2, 0.5],
      },
    },
    labels
  );
  map.addLayer(
    {
      id: CONTOUR_LAYERS[1],
      type: 'symbol',
      source: CONTOUR_SOURCE,
      'source-layer': 'contour',
      filter: ['match', ['get', 'index'], [5, 10], true, false],
      layout: {
        ...hidden,
        'symbol-placement': 'line',
        'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
        'text-size': 12,
      },
      paint: { 'text-color': '#5a4022', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 },
    },
    labels
  );
};

const show = (map: MapboxMap, id: string, visible: boolean) =>
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');

/** Applies the base layer and overlays; `previous` decides whether to tilt the camera for 3D terrain. */
export const applyLayerSettings = (map: MapboxMap, next: LayerSettings, previous: LayerSettings | null): void => {
  setRiskVisible(map, next.base === 'risk');
  show(map, ELEVATION_LAYER, next.base === 'elevation');
  show(map, HILLSHADE_LAYER, next.hillshade);
  CONTOUR_LAYERS.forEach(id => show(map, id, next.contours));

  if (next.terrain3d === (previous?.terrain3d ?? false)) return;
  map.setTerrain(next.terrain3d ? { source: DEM_SOURCE, exaggeration: TERRAIN_EXAGGERATION } : null);
  map.easeTo({ pitch: next.terrain3d ? TERRAIN_PITCH : 0, duration: 800 });
};
