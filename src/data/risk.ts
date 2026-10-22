import { riskFile } from '../risk/diseases';
import { buildRiskIndex, type RiskIndex } from '../risk/resolveRisk';
import type { RiskRow } from '../types';
import { fetchJson } from './fetchJson';

const cache = new Map<string, Promise<RiskIndex>>();

/** Synthetic risk values for one disease, indexed for fallback resolution. Cached per disease. */
export const loadRisk = (diseaseId: string): Promise<RiskIndex> => {
  let index = cache.get(diseaseId);
  if (!index) {
    index = fetchJson<RiskRow[]>(riskFile(diseaseId)).then(buildRiskIndex);
    index.catch(() => cache.delete(diseaseId));
    cache.set(diseaseId, index);
  }
  return index;
};
