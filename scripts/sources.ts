/**
 * Boundary sources: geoBoundaries gbOpen, one simplified file per country and
 * admin level. Each file carries the licence of its upstream source, so
 * licences are tracked per file and only openly licensed files are used.
 * Metadata: https://www.geoboundaries.org/api/current/gbOpen/ALL/{ADM}/
 */
export type AdminLevel = 'ADM0' | 'ADM1' | 'ADM2';
export const LEVELS: readonly AdminLevel[] = ['ADM0', 'ADM1', 'ADM2'];

/** The subset of geoBoundaries metadata fields the pipeline uses. */
export interface BoundaryMeta {
  boundaryISO: string;
  boundaryName: string;
  boundaryType: AdminLevel;
  boundarySource: string;
  boundaryLicense: string;
  licenseSource: string;
  simplifiedGeometryGeoJSON: string;
}

export const metaUrl = (level: AdminLevel) =>
  `https://www.geoboundaries.org/api/current/gbOpen/ALL/${level}/`;

/**
 * Licences that allow redistribution with attribution. Anything else
 * ("Other - Direct Permission", "Other - Humanitarian", image licences,
 * agency-specific terms) is excluded.
 */
const OPEN_LICENSES: readonly RegExp[] = [
  /^Public Domain$/,
  /^CC0 1\.0/,
  /Public Domain Dedication and License \(PDDL\)/,
  /^Creative Commons Attribution( 2\.5| 3\.0| 4\.0)?( Generic| License| Intergovernmental Organisations| International| India)?/,
  /^Creative Commons Attribution-ShareAlike (2\.0|3\.0)/,
  /^Open Data Commons Open Database License 1\.0$/,
  /^Open Government Licence v3\.0$/,
  /^Open Government Canada 2\.0$/,
  /^Federal Office of Topography swisstopo License$/,
  /^Data license Germany - Attribution - Version 2\.0$/,
  /^Etalab Open License 2\.0$/,
  /^Singapore Open Data License Version 1\.0$/,
];

export const isOpenLicense = (license: string) => OPEN_LICENSES.some(re => re.test(license));

export const RAW_DIR = 'data-raw';
export const OUT_DIR = 'public/data';
export const DISTRICT_DIR = `${OUT_DIR}/adm2`;

export const metaPath = (level: AdminLevel) => `${RAW_DIR}/meta-${level}.json`;
export const rawPath = (iso: string, level: AdminLevel) => `${RAW_DIR}/${iso}-${level}.geojson`;
