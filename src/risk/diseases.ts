export interface Disease {
  id: string;
  name: string;
}

/** Mosquito-borne diseases offered in the picker. Each has its own synthetic risk file. */
export const DISEASES: readonly Disease[] = [
  { id: 'malaria', name: 'Malaria' },
  { id: 'dengue', name: 'Dengue' },
  { id: 'zika', name: 'Zika' },
  { id: 'chikungunya', name: 'Chikungunya' },
  { id: 'yellow-fever', name: 'Yellow fever' },
  { id: 'west-nile', name: 'West Nile fever' },
  { id: 'japanese-encephalitis', name: 'Japanese encephalitis' },
];

export const DEFAULT_DISEASE_ID = 'malaria';

export const findDisease = (id: string | null | undefined): Disease =>
  DISEASES.find(d => d.id === id) ?? DISEASES.find(d => d.id === DEFAULT_DISEASE_ID)!;

export const riskFile = (diseaseId: string) => `risk/${diseaseId}.json`;
