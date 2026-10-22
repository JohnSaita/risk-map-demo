export type AdminLayerId = 'adm0' | 'adm1' | 'adm2';

export interface AdminBand {
  id: AdminLayerId;
  label: string;
  /** Inclusive. */
  minzoom: number;
  /** Exclusive — matches Mapbox's layer `maxzoom` semantics. */
  maxzoom: number;
}

/**
 * Half-open zoom ranges, so exactly one admin layer is visible at any zoom:
 * [0, 3) country, [3, 6) state, [6, 24) district.
 */
export const ADMIN_BANDS: readonly AdminBand[] = [
  { id: 'adm0', label: 'Country', minzoom: 0, maxzoom: 3 },
  { id: 'adm1', label: 'State', minzoom: 3, maxzoom: 6 },
  { id: 'adm2', label: 'District', minzoom: 6, maxzoom: 24 },
];

export const bandForZoom = (zoom: number): AdminBand =>
  ADMIN_BANDS.find(b => zoom >= b.minzoom && zoom < b.maxzoom) ??
  ADMIN_BANDS[ADMIN_BANDS.length - 1];
