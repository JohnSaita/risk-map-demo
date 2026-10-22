import { useEffect, useMemo, useState } from 'react';

import { AboutDialog } from './components/AboutDialog';
import { AreaInfo } from './components/AreaInfo';
import { Breadcrumb } from './components/Breadcrumb';
import { countryOptions } from './components/CountryPicker';
import { MapTools } from './components/MapTools';
import { RiskMap } from './components/RiskMap';
import { SiteHeader } from './components/SiteHeader';
import { ZoomBadge } from './components/ZoomBadge';
import { type BoundaryStore, loadBoundaries } from './data/boundaries';
import { loadRisk } from './data/risk';
import { findDisease } from './risk/diseases';
import type { RiskIndex } from './risk/resolveRisk';
import { ADMIN_BANDS, type AdminBand } from './risk/zoomBands';
import type { CountryFocus, HoveredArea, LayerSettings } from './types';

const token = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_LAYERS: LayerSettings = { base: 'risk', terrain3d: false, hillshade: false, contours: false };

/** The disease lives in the URL (?disease=dengue) so a link opens the same view. */
const diseaseFromUrl = () => findDisease(new URLSearchParams(window.location.search).get('disease'));

const writeDiseaseToUrl = (id: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set('disease', id);
  window.history.replaceState(null, '', url);
};

export const App = () => {
  const [boundaries, setBoundaries] = useState<BoundaryStore | null>(null);
  const [disease, setDisease] = useState(diseaseFromUrl);
  // Keeps the previous disease's values on screen while the next one loads.
  const [risk, setRisk] = useState<RiskIndex | null>(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<AdminBand>(ADMIN_BANDS[0]);
  const [hovered, setHovered] = useState<HoveredArea | null>(null);
  const [focus, setFocus] = useState<CountryFocus | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [layers, setLayers] = useState<LayerSettings>(DEFAULT_LAYERS);
  const countries = useMemo(() => (boundaries ? countryOptions(boundaries.countries) : []), [boundaries]);

  useEffect(() => {
    loadBoundaries()
      .then(setBoundaries)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    let current = true;
    setRiskLoading(true);
    loadRisk(disease.id)
      .then(index => current && setRisk(index))
      .catch((err: Error) => current && setError(err.message))
      .finally(() => current && setRiskLoading(false));
    return () => {
      current = false;
    };
  }, [disease.id]);

  const changeDisease = (id: string) => {
    const next = findDisease(id);
    writeDiseaseToUrl(next.id);
    setDisease(next);
  };

  // Always a new object, so picking or clicking the same country zooms to it again.
  const focusCountry = (gid0: string | null) => setFocus(gid0 ? { gid0 } : null);

  return (
    <div className="page">
      <SiteHeader onAbout={() => setAboutOpen(true)} />
      {token ? (
        <main className="app">
          {boundaries && risk && (
            <RiskMap
              token={token}
              boundaries={boundaries}
              risk={risk}
              focus={focus}
              layers={layers}
              onHover={setHovered}
              onFocusCountry={focusCountry}
              onBandChange={setBand}
              onError={setError}
            />
          )}
          {!error && (!boundaries || !risk) && <p className="status">Loading map data…</p>}
          {error && (
            <p className="status status-error" role="alert">
              {error}
            </p>
          )}

          {/* One row: breadcrumb on the left, tool buttons on the right. */}
          <div className="map-topbar">
            <Breadcrumb
              base={layers.base}
              disease={disease}
              onDiseaseChange={changeDisease}
              loading={riskLoading}
              countries={countries}
              country={focus?.gid0 ?? null}
              onCountryChange={focusCountry}
            />
            <MapTools layers={layers} onLayersChange={setLayers} diseaseName={disease.name} />
          </div>
          <ZoomBadge band={band} />
          {layers.base === 'risk' && (
            <p className="card synthetic-note">
              <span className="synthetic-dot" aria-hidden="true" />
              <span className="note-long">Synthetic demo data, not real risk levels</span>
              <span className="note-short">Synthetic demo data</span>
            </p>
          )}
          <AreaInfo hovered={hovered} />
        </main>
      ) : (
        <main className="notice">
          <h1>Mapbox token missing</h1>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_MAPBOX_TOKEN</code> to a
            public (pk.*) Mapbox token, then restart the dev server.
          </p>
        </main>
      )}
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
};
