import type { AdminCollection } from '../data/boundaries';

export interface CountryOption {
  gid0: string;
  name: string;
}

/** Every country, sorted by name, for the picker. */
export const countryOptions = (countries: AdminCollection): CountryOption[] =>
  countries.features
    .map(f => ({ gid0: f.properties.gid0, name: f.properties.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

interface Props {
  countries: readonly CountryOption[];
  /** gid0 of the focused country, or null for the world view. */
  value: string | null;
  onChange: (gid0: string | null) => void;
}

/** Zooms to one country (dimming the rest), or back out to the whole world. */
export const CountryPicker = ({ countries, value, onChange }: Props) => (
  <label className="crumb-select">
    <span className="visually-hidden">Country</span>
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      disabled={countries.length === 0}
    >
      <option value="">All countries</option>
      {countries.map(c => (
        <option key={c.gid0} value={c.gid0}>
          {c.name}
        </option>
      ))}
    </select>
  </label>
);
