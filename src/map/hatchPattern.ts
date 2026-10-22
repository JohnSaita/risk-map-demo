export const HATCH_IMAGE_ID = 'inherited-hatch';

const SIZE = 8;
const STRIPE = [40, 40, 40, 150] as const; // dark grey, ~60% opacity

/**
 * Diagonal stripes on a transparent background, tiling seamlessly.
 * Drawn on top of the risk colour to mark values inherited from a parent unit.
 */
export const createHatchImage = (): { width: number; height: number; data: Uint8Array } => {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if ((x + y) % SIZE === 0 || (x + y + 1) % SIZE === 0) {
        data.set(STRIPE, (y * SIZE + x) * 4);
      }
    }
  }
  return { width: SIZE, height: SIZE, data };
};
