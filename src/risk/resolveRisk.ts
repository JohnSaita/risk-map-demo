import type { Feature, FeatureCollection, Geometry } from 'geojson';

import type { AdminUnit, ResolvedRisk, RiskFeatureProps, RiskLevel, RiskRow } from '../types';

export interface RiskIndex {
  country: Map<string, RiskLevel>;
  state: Map<string, RiskLevel>;
  district: Map<string, RiskLevel>;
}

export const buildRiskIndex = (rows: RiskRow[]): RiskIndex => {
  const index: RiskIndex = { country: new Map(), state: new Map(), district: new Map() };
  for (const row of rows) {
    if (row.gid2) index.district.set(row.gid2, row.level);
    else if (row.gid1) index.state.set(row.gid1, row.level);
    else index.country.set(row.gid0, row.level);
  }
  return index;
};

/**
 * Resolves the risk for one admin unit:
 *   district → its own value, else its state's, else its country's
 *   state    → its own value, else its country's
 *   country  → its own value
 * `inherited` names the level the value actually came from, so a district
 * whose state also has no data reports 'country'.
 */
export const resolveRisk = (index: RiskIndex, unit: AdminUnit): ResolvedRisk => {
  if (unit.gid2) {
    const own = index.district.get(unit.gid2);
    if (own !== undefined) return { level: own, inherited: 'none', sourceGid: unit.gid2 };
  }
  if (unit.gid1) {
    const state = index.state.get(unit.gid1);
    if (state !== undefined) {
      return { level: state, inherited: unit.gid2 ? 'state' : 'none', sourceGid: unit.gid1 };
    }
  }
  const country = index.country.get(unit.gid0);
  if (country !== undefined) {
    return { level: country, inherited: unit.gid1 ? 'country' : 'none', sourceGid: unit.gid0 };
  }
  return { level: null, inherited: 'none', sourceGid: null };
};

/** One unit with its resolved risk, flattened into properties for styling and display. */
export const riskFeatureProps = (
  unit: AdminUnit,
  index: RiskIndex,
  names: ReadonlyMap<string, string>
): RiskFeatureProps => {
  const risk = resolveRisk(index, unit);
  return {
    ...unit,
    riskLevel: risk.level,
    inherited: risk.inherited,
    inheritedFromName:
      risk.inherited !== 'none' && risk.sourceGid ? names.get(risk.sourceGid) ?? null : null,
  };
};

/** Attaches resolved risk to every feature, flattening it into properties for styling. */
export const annotateWithRisk = <G extends Geometry>(
  collection: FeatureCollection<G, AdminUnit>,
  index: RiskIndex,
  names: ReadonlyMap<string, string>
): FeatureCollection<G, RiskFeatureProps> => ({
  type: 'FeatureCollection',
  features: collection.features.map(
    (feature): Feature<G, RiskFeatureProps> => ({
      ...feature,
      properties: riskFeatureProps(feature.properties, index, names),
    })
  ),
});
