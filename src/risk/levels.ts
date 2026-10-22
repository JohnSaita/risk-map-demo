import type { RiskLevel } from '../types';

export interface RiskLevelInfo {
  level: RiskLevel;
  label: string;
  color: string;
}

/** Red / yellow / green / light blue, high to unlikely. */
export const RISK_LEVELS: readonly RiskLevelInfo[] = [
  { level: 1, label: 'Unlikely', color: '#cce5ff' },
  { level: 2, label: 'Low', color: '#65e180' },
  { level: 3, label: 'Medium', color: '#ebce12' },
  { level: 4, label: 'High', color: '#e74141' },
];

export const NO_DATA_COLOR = '#d9d9d9';

export const riskLabel = (level: RiskLevel | null): string =>
  RISK_LEVELS.find(r => r.level === level)?.label ?? 'No data';

/** 'District', 'State' or 'Country', for the area the unit describes. */
export const unitKind = (unit: { gid1?: string; gid2?: string }): string =>
  unit.gid2 ? 'District' : unit.gid1 ? 'State' : 'Country';
