import { DISEASES, type Disease } from '../risk/diseases';
import type { BaseLayer } from '../types';
import { type CountryOption, CountryPicker } from './CountryPicker';

interface Props {
  base: BaseLayer;
  disease: Disease;
  onDiseaseChange: (id: string) => void;
  loading: boolean;
  countries: readonly CountryOption[];
  country: string | null;
  onCountryChange: (gid0: string | null) => void;
}

const GlobeIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
    <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M2.5 10h15M10 2.5c2.2 2.1 3.2 4.6 3.2 7.5s-1 5.4-3.2 7.5c-2.2-2.1-3.2-4.6-3.2-7.5s1-5.4 3.2-7.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

/**
 * What the map shows, then disease, then country, as separate pills with no
 * separators: top-left of the map on wide screens, a bar along the bottom at
 * 1000px and below. The disease and country steps are pickers. Elevation has
 * no disease, so that step is left out.
 */
export const Breadcrumb = ({ base, disease, onDiseaseChange, loading, countries, country, onCountryChange }: Props) => (
  <nav className="crumbs" aria-label="Map selection">
    <ol>
      <li className="crumb crumb-root">
        <GlobeIcon />
        <span className="crumb-root-text">{base === 'risk' ? 'Transmission risk' : 'Elevation'}</span>
      </li>
      {base === 'risk' && (
        <li className="crumb">
          <label className="crumb-select">
            <span className="visually-hidden">Mosquito-borne disease</span>
            <select value={disease.id} onChange={e => onDiseaseChange(e.target.value)} aria-busy={loading}>
              {DISEASES.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </li>
      )}
      <li className="crumb">
        <CountryPicker countries={countries} value={country} onChange={onCountryChange} />
      </li>
    </ol>
  </nav>
);
