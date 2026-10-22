import 'mapbox-gl/dist/mapbox-gl.css';

import mapboxgl, { type GeoJSONFeature } from 'mapbox-gl';
import { useEffect, useRef } from 'react';

import { DATA_ATTRIBUTION } from '../attribution';
import type { AdminCollection, BoundaryStore } from '../data/boundaries';
import { countriesInView } from '../data/countriesInView';
import { geometryBounds } from '../data/geometryBounds';
import { type LngLat, locateUnit } from '../data/locateUnit';
import { addRiskLayers, fillLayerId, RISK_FILL_LAYER_IDS, setRiskData } from '../map/addRiskLayers';
import { setWaterColor } from '../map/baseStyle';
import { addCountryMaskLayers, setCountryMask } from '../map/countryMask';
import { createLocationMarker, type LocationMarker } from '../map/locationMarker';
import { addReliefLayers, applyLayerSettings } from '../map/reliefLayers';
import { annotateWithRisk, type RiskIndex, riskFeatureProps } from '../risk/resolveRisk';
import { ADMIN_BANDS, type AdminBand, type AdminLayerId, bandForZoom } from '../risk/zoomBands';
import type {
  AdminUnit,
  CountryFocus,
  HoveredArea,
  InheritedFrom,
  LayerSettings,
  RiskFeatureProps,
  RiskLevel,
} from '../types';

/** Matches the CSS breakpoint where the breadcrumb moves to a 50px bar along the bottom. */
const BOTTOM_BAR_MAX_WIDTH = 1000;
const BOTTOM_BAR_HEIGHT = 50;

/** Start fetching districts a little before the district band begins, so they're ready on arrival. */
const DISTRICT_PREFETCH_ZOOM = ADMIN_BANDS[2].minzoom - 1.5;
const WORLD_VIEW = { center: [15, 15] as LngLat, zoom: 1.3 };
/** Caps the zoom for small countries and for "my location", so a few districts stay in view. */
const FOCUS_MAX_ZOOM = 9;

interface Props {
  token: string;
  boundaries: BoundaryStore;
  risk: RiskIndex;
  focus: CountryFocus | null;
  layers: LayerSettings;
  onHover: (hovered: HoveredArea | null) => void;
  onFocusCountry: (gid0: string) => void;
  onBandChange: (band: AdminBand) => void;
  onError: (message: string) => void;
}

/** Mapbox omits null properties, so restore the shape the rest of the app expects. */
const readProps = (feature: GeoJSONFeature): RiskFeatureProps => {
  const p = feature.properties ?? {};
  return {
    gid0: String(p.gid0),
    gid1: p.gid1 ? String(p.gid1) : undefined,
    gid2: p.gid2 ? String(p.gid2) : undefined,
    name: String(p.name ?? ''),
    riskLevel: typeof p.riskLevel === 'number' ? (p.riskLevel as RiskLevel) : null,
    inherited: (p.inherited as InheritedFrom | undefined) ?? 'none',
    inheritedFromName: p.inheritedFromName ? String(p.inheritedFromName) : null,
  };
};

/**
 * Room for the top row (breadcrumb and tool buttons), the map controls
 * (left) and the zoom badge plus, on small screens, the breadcrumb bar
 * (bottom), capped so a short screen still has
 * space to fit a country into.
 */
const focusPadding = (map: mapboxgl.Map) => {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  return {
    top: Math.min(80, h * 0.2),
    bottom: Math.min(70 + (w <= BOTTOM_BAR_MAX_WIDTH ? BOTTOM_BAR_HEIGHT : 0), h * 0.2),
    left: Math.min(60, w * 0.15),
    right: Math.min(60, w * 0.15),
  };
};

export const RiskMap = ({
  token,
  boundaries,
  risk,
  focus,
  layers,
  onHover,
  onFocusCountry,
  onBandChange,
  onError,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  // Callbacks and risk change identity over time; the map is created once.
  const callbacks = useRef({ onHover, onFocusCountry, onBandChange, onError });
  callbacks.current = { onHover, onFocusCountry, onBandChange, onError };
  const riskRef = useRef(risk);
  const focusRef = useRef(focus);
  const layersRef = useRef(layers);
  /** Layer settings currently on the map; null until the style has loaded. */
  const appliedLayers = useRef<LayerSettings | null>(null);
  /** Boundaries loaded so far, per level, before risk is attached. */
  const loaded = useRef<Partial<Record<AdminLayerId, AdminCollection>>>({});
  const locationMarker = useRef<LocationMarker | null>(null);
  /** Area at the user's location: undefined while it is being looked up, null if none contains it. */
  const locatedUnit = useRef<AdminUnit | null | undefined>(undefined);

  const paint = (map: mapboxgl.Map, id: AdminLayerId) => {
    const raw = loaded.current[id];
    if (raw) setRiskData(map, id, annotateWithRisk(raw, riskRef.current, boundaries.names()));
  };

  const showLocationRisk = () => {
    const unit = locatedUnit.current;
    locationMarker.current?.setArea(
      unit ? riskFeatureProps(unit, riskRef.current, boundaries.names()) : null,
      unit === undefined
    );
  };

  /** Masks around the focused country and zooms to it, or back to the world when focus is cleared. */
  const showFocus = (map: mapboxgl.Map, next: CountryFocus | null) => {
    setCountryMask(map, next?.gid0 ?? null);
    if (!next) {
      map.flyTo(WORLD_VIEW);
      return;
    }
    const country = boundaries.countries.features.find(f => f.properties.gid0 === next.gid0);
    const bounds = country && geometryBounds(country.geometry);
    if (bounds) map.fitBounds(bounds, { padding: focusPadding(map), maxZoom: FOCUS_MAX_ZOOM });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      ...WORLD_VIEW,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: false,
      projection: 'mercator',
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      trackUserLocation: false,
      showUserLocation: false, // replaced by the marker below, which shows the risk level
      showAccuracyCircle: false,
      fitBoundsOptions: { maxZoom: FOCUS_MAX_ZOOM },
    });
    map.addControl(geolocate, 'top-left');
    // Compass below the locate button: the needle shows the map's rotation; clicking it resets to north.
    map.addControl(new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true }), 'top-left');
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true, customAttribution: DATA_ATTRIBUTION }),
      'bottom-right'
    );
    const marker = createLocationMarker(map);
    locationMarker.current = marker;

    let currentBand = bandForZoom(map.getZoom());
    callbacks.current.onBandChange(currentBand);
    map.on('zoom', () => {
      const band = bandForZoom(map.getZoom());
      if (band.id !== currentBand.id) {
        currentBand = band;
        callbacks.current.onBandChange(band);
      }
    });

    const reportError = (err: Error) => callbacks.current.onError(err.message);

    const loadDistrictsInView = () => {
      if (map.getZoom() < DISTRICT_PREFETCH_ZOOM) return;
      const b = map.getBounds();
      if (!b) return;
      const isos = countriesInView(boundaries.districtIndex, [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      boundaries
        .loadDistricts(isos)
        .then(districts => {
          if (districts.features.length === loaded.current.adm2?.features.length) return;
          loaded.current.adm2 = districts;
          paint(map, 'adm2');
        })
        .catch(reportError);
    };

    // Hover on desktop; tap on touch screens (click fires for taps). Off every area, or
    // while the map shows elevation instead of risk, nothing shows.
    const hover = (e: mapboxgl.MapMouseEvent) => {
      const feature =
        layersRef.current.base === 'risk'
          ? map.queryRenderedFeatures(e.point, { layers: RISK_FILL_LAYER_IDS })[0]
          : undefined;
      map.getCanvas().style.cursor = feature ? 'pointer' : '';
      const { clientWidth: mapWidth, clientHeight: mapHeight } = map.getContainer();
      callbacks.current.onHover(
        feature ? { area: readProps(feature), x: e.point.x, y: e.point.y, mapWidth, mapHeight } : null
      );
    };
    const clearHover = () => callbacks.current.onHover(null);

    map.on('load', () => {
      setWaterColor(map);
      addRiskLayers(map);
      addCountryMaskLayers(map);
      addReliefLayers(map);
      applyLayerSettings(map, layersRef.current, null);
      appliedLayers.current = layersRef.current;
      if (focusRef.current) showFocus(map, focusRef.current);
      loaded.current.adm0 = boundaries.countries;
      paint(map, 'adm0');
      boundaries
        .loadStates()
        .then(states => {
          loaded.current.adm1 = states;
          paint(map, 'adm1');
        })
        .catch(reportError);
      loadDistrictsInView();

      map.on('mousemove', hover);
      map.on('click', hover);
      map.on('mouseout', clearHover);
      map.on('movestart', clearHover);
      // Clicking a country (at country zoom) zooms to it.
      map.on('click', fillLayerId('adm0'), e => {
        const gid0 = e.features?.[0]?.properties?.gid0;
        if (gid0) callbacks.current.onFocusCountry(String(gid0));
      });
    });
    map.on('moveend', loadDistrictsInView);

    let lookup = 0;
    geolocate.on('geolocate', (position: GeolocationPosition) => {
      const point: LngLat = [position.coords.longitude, position.coords.latitude];
      const id = ++lookup;
      locatedUnit.current = undefined;
      marker.moveTo(point);
      showLocationRisk();
      locateUnit(boundaries, point)
        .then(unit => {
          if (id !== lookup) return; // a newer position arrived meanwhile
          locatedUnit.current = unit;
          showLocationRisk();
        })
        .catch(reportError);
    });

    return () => {
      mapRef.current = null;
      locationMarker.current = null;
      appliedLayers.current = null;
      loaded.current = {};
      marker.remove();
      map.remove();
    };
    // `paint`, `showFocus` and `showLocationRisk` only read refs and `boundaries`, which is in the dependency list.
  }, [token, boundaries]);

  // Disease changed: re-resolve every loaded level (and the user's location) against the new risk values.
  useEffect(() => {
    riskRef.current = risk;
    showLocationRisk();
    const map = mapRef.current;
    if (!map?.getSource('adm0')) return; // not loaded yet; the load handler paints with riskRef
    ADMIN_BANDS.forEach(band => paint(map, band.id));
    callbacks.current.onHover(null);
  }, [risk]);

  useEffect(() => {
    focusRef.current = focus;
    const map = mapRef.current;
    if (!map?.getSource('adm0')) return; // not loaded yet; the load handler applies focusRef
    showFocus(map, focus);
  }, [focus]);

  useEffect(() => {
    layersRef.current = layers;
    const map = mapRef.current;
    if (!map || !appliedLayers.current) return; // not loaded yet; the load handler applies layersRef
    applyLayerSettings(map, layers, appliedLayers.current);
    appliedLayers.current = layers;
    if (layers.base !== 'risk') callbacks.current.onHover(null);
  }, [layers]);

  return <div ref={containerRef} className="map" aria-label="Transmission risk map" role="region" />;
};
