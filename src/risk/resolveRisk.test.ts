import { describe, expect, it } from 'vitest';

import type { AdminUnit, RiskRow } from '../types';
import { annotateWithRisk, buildRiskIndex, resolveRisk } from './resolveRisk';

const rows: RiskRow[] = [
  { gid0: 'AAA', level: 2 },
  { gid0: 'AAA', gid1: 'AAA.1', level: 3 },
  { gid0: 'AAA', gid1: 'AAA.1', gid2: 'AAA.1.1', level: 4 },
];
const index = buildRiskIndex(rows);

const district = (gid1: string, gid2: string): AdminUnit => ({ gid0: 'AAA', gid1, gid2, name: gid2 });

describe('resolveRisk', () => {
  it('uses a district’s own value', () => {
    expect(resolveRisk(index, district('AAA.1', 'AAA.1.1'))).toEqual({
      level: 4,
      inherited: 'none',
      sourceGid: 'AAA.1.1',
    });
  });

  it('district without data inherits from its state', () => {
    expect(resolveRisk(index, district('AAA.1', 'AAA.1.2'))).toEqual({
      level: 3,
      inherited: 'state',
      sourceGid: 'AAA.1',
    });
  });

  it('district whose state has no data inherits from the country', () => {
    expect(resolveRisk(index, district('AAA.2', 'AAA.2.1'))).toEqual({
      level: 2,
      inherited: 'country',
      sourceGid: 'AAA',
    });
  });

  it('uses a state’s own value', () => {
    expect(resolveRisk(index, { gid0: 'AAA', gid1: 'AAA.1', name: 's' })).toMatchObject({
      level: 3,
      inherited: 'none',
    });
  });

  it('state without data inherits from its country', () => {
    expect(resolveRisk(index, { gid0: 'AAA', gid1: 'AAA.2', name: 's' })).toEqual({
      level: 2,
      inherited: 'country',
      sourceGid: 'AAA',
    });
  });

  it('a state never inherits from one of its districts', () => {
    const onlyDistrict = buildRiskIndex([{ gid0: 'BBB', gid1: 'BBB.1', gid2: 'BBB.1.1', level: 4 }]);
    expect(resolveRisk(onlyDistrict, { gid0: 'BBB', gid1: 'BBB.1', name: 's' }).level).toBeNull();
  });

  it('returns no data when nothing up the chain has a value', () => {
    expect(resolveRisk(index, { gid0: 'ZZZ', gid1: 'ZZZ.1', gid2: 'ZZZ.1.1', name: 'd' })).toEqual({
      level: null,
      inherited: 'none',
      sourceGid: null,
    });
  });
});

describe('annotateWithRisk', () => {
  it('flattens resolved risk and the source name into properties', () => {
    const names = new Map([['AAA.1', 'First State']]);
    const result = annotateWithRisk(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: district('AAA.1', 'AAA.1.9'),
          },
        ],
      },
      index,
      names
    );
    expect(result.features[0].properties).toMatchObject({
      riskLevel: 3,
      inherited: 'state',
      inheritedFromName: 'First State',
    });
  });
});
