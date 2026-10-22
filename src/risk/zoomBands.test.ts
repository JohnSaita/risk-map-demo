import { describe, expect, it } from 'vitest';

import { ADMIN_BANDS, bandForZoom } from './zoomBands';

describe('bandForZoom', () => {
  it.each([
    [0, 'adm0'],
    [2.99, 'adm0'],
    [3, 'adm1'],
    [5.99, 'adm1'],
    [6, 'adm2'],
    [12, 'adm2'],
  ])('zoom %s → %s', (zoom, id) => {
    expect(bandForZoom(zoom).id).toBe(id);
  });

  it('bands are contiguous and non-overlapping, so one layer shows at a time', () => {
    for (let i = 1; i < ADMIN_BANDS.length; i++) {
      expect(ADMIN_BANDS[i].minzoom).toBe(ADMIN_BANDS[i - 1].maxzoom);
    }
    for (let z = 0; z < 22; z += 0.25) {
      const visible = ADMIN_BANDS.filter(b => z >= b.minzoom && z < b.maxzoom);
      expect(visible).toHaveLength(1);
    }
  });
});
