export type RiskLevel = 1 | 2 | 3 | 4;

/** One synthetic risk value. The deepest gid present is the unit it describes. */
export interface RiskRow {
  gid0: string;
  gid1?: string;
  gid2?: string;
  level: RiskLevel;
}

/** Admin unit identity as carried on boundary features. */
export interface AdminUnit {
  gid0: string;
  gid1?: string;
  gid2?: string;
  name: string;
}

export type InheritedFrom = 'none' | 'state' | 'country';

export interface ResolvedRisk {
  level: RiskLevel | null;
  inherited: InheritedFrom;
  /** gid of the unit whose value is used (null when there is no data at all). */
  sourceGid: string | null;
}

/** Flat feature properties after resolution — flat so Mapbox expressions can read them. */
export interface RiskFeatureProps extends AdminUnit {
  riskLevel: RiskLevel | null;
  inherited: InheritedFrom;
  inheritedFromName: string | null;
}

/** The area under the pointer, the pointer's position and the map's size, in map-container pixels. */
export interface HoveredArea {
  area: RiskFeatureProps;
  x: number;
  y: number;
  mapWidth: number;
  mapHeight: number;
}

/**
 * A request to zoom to one country and dim everything around it. A new
 * object zooms again, even to the country already focused.
 */
export interface CountryFocus {
  gid0: string;
}

/** What the map colours areas by. */
export type BaseLayer = 'risk' | 'elevation';

/** The base layer plus the relief overlays the user has switched on. */
export interface LayerSettings {
  base: BaseLayer;
  terrain3d: boolean;
  hillshade: boolean;
  contours: boolean;
}
