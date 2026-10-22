import type { FeatureCollection, Geometry } from 'geojson';
import type { ExpressionSpecification, GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';

import { NO_DATA_COLOR, RISK_LEVELS } from '../risk/levels';
import { ADMIN_BANDS, AdminLayerId } from '../risk/zoomBands';
import type { RiskFeatureProps } from '../types';
import { createHatchImage, HATCH_IMAGE_ID } from './hatchPattern';

export type RiskCollection = FeatureCollection<Geometry, RiskFeatureProps>;

export const fillLayerId = (id: AdminLayerId) => `${id}-risk-fill`;
const inheritedLayerId = (id: AdminLayerId) => `${id}-risk-inherited`;

const RISK_FILL_OPACITY = 0.85;

const EMPTY: RiskCollection = { type: 'FeatureCollection', features: [] };

const riskColor: ExpressionSpecification = [
  'match',
  ['coalesce', ['get', 'riskLevel'], 0],
  ...RISK_LEVELS.flatMap(r => [r.level, r.color]),
  NO_DATA_COLOR,
] as ExpressionSpecification;

/** First symbol layer of the base style, so risk fills sit under place labels. */
export const firstLabelLayerId = (map: MapboxMap): string | undefined =>
  map.getStyle()?.layers?.find(l => l.type === 'symbol')?.id;

/**
 * Adds one (initially empty) source and three layers (fill, inherited hatch,
 * outline) per admin level. Each layer is limited to its band's zoom range,
 * so only one admin level renders at a time. Fill sources with setRiskData.
 */
export const addRiskLayers = (map: MapboxMap): void => {
  if (!map.hasImage(HATCH_IMAGE_ID)) map.addImage(HATCH_IMAGE_ID, createHatchImage());
  const beforeId = firstLabelLayerId(map);

  for (const band of ADMIN_BANDS) {
    const zoomRange = { minzoom: band.minzoom, maxzoom: band.maxzoom };
    map.addSource(band.id, { type: 'geojson', data: EMPTY });

    map.addLayer(
      {
        id: fillLayerId(band.id),
        type: 'fill',
        source: band.id,
        ...zoomRange,
        paint: { 'fill-color': riskColor, 'fill-opacity': RISK_FILL_OPACITY },
      },
      beforeId
    );
    map.addLayer(
      {
        id: inheritedLayerId(band.id),
        type: 'fill',
        source: band.id,
        ...zoomRange,
        filter: ['!=', ['get', 'inherited'], 'none'],
        paint: { 'fill-pattern': HATCH_IMAGE_ID },
      },
      beforeId
    );
    map.addLayer(
      {
        id: `${band.id}-risk-outline`,
        type: 'line',
        source: band.id,
        ...zoomRange,
        paint: { 'line-color': '#555', 'line-width': band.id === 'adm0' ? 1.2 : 0.6 },
      },
      beforeId
    );
  }
};

/** Replaces one admin level's features (e.g. after more districts load or the disease changes). */
export const setRiskData = (map: MapboxMap, id: AdminLayerId, data: RiskCollection): void => {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
};

export const RISK_FILL_LAYER_IDS = ADMIN_BANDS.map(b => fillLayerId(b.id));

/**
 * Shows or hides the risk colours and hatching. Outlines stay. Hidden fills
 * go transparent rather than invisible, so clicking a country still zooms to it.
 */
export const setRiskVisible = (map: MapboxMap, visible: boolean): void => {
  for (const band of ADMIN_BANDS) {
    map.setPaintProperty(fillLayerId(band.id), 'fill-opacity', visible ? RISK_FILL_OPACITY : 0);
    map.setLayoutProperty(inheritedLayerId(band.id), 'visibility', visible ? 'visible' : 'none');
  }
};
