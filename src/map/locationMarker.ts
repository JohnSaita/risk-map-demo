import mapboxgl from 'mapbox-gl';

import { NO_DATA_COLOR, riskLabel, RISK_LEVELS, unitKind } from '../risk/levels';
import type { RiskFeatureProps } from '../types';

export interface LocationMarker {
  /** Shows the marker at the user's position. */
  moveTo(lngLat: [number, number]): void;
  /** Area at the marker with its resolved risk; null when no area contains it. */
  setArea(area: RiskFeatureProps | null, loading: boolean): void;
  remove(): void;
}

const element = (tag: string, className: string, text?: string): HTMLElement => {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
};

/**
 * The user's position, with their area's risk level in a popup that opens
 * on hover, keyboard focus or tap. Not on the map until moveTo is called.
 */
export const createLocationMarker = (map: mapboxgl.Map): LocationMarker => {
  const dot = element('div', 'location-marker');
  dot.tabIndex = 0;
  const content = element('div', 'location-popup');
  const popup = new mapboxgl.Popup({
    offset: 14,
    closeButton: false,
    closeOnClick: false,
    focusAfterOpen: false,
    maxWidth: '240px',
  }).setDOMContent(content);
  const marker = new mapboxgl.Marker({ element: dot });
  let added = false;

  const open = () => {
    if (!popup.isOpen()) popup.setLngLat(marker.getLngLat()).addTo(map);
  };
  const close = () => popup.remove();
  // Touch "enter" events fire on tap; taps open the popup through focus/click instead.
  dot.addEventListener('pointerenter', e => e.pointerType === 'mouse' && open());
  dot.addEventListener('pointerleave', e => e.pointerType === 'mouse' && document.activeElement !== dot && close());
  dot.addEventListener('focus', open);
  dot.addEventListener('blur', close);
  dot.addEventListener('click', open);

  const render = (area: RiskFeatureProps | null, loading: boolean) => {
    content.replaceChildren(element('p', 'eyebrow', 'Your location'));
    if (loading || !area) {
      const text = loading ? 'Finding your risk level…' : 'No risk data at this location';
      content.append(element('p', 'location-popup-note', text));
      dot.setAttribute('aria-label', `Your location: ${text}`);
      return;
    }

    const inherited = area.inherited !== 'none';
    const swatch = element('span', `swatch${inherited ? ' swatch-inherited-over' : ''}`);
    swatch.style.background = RISK_LEVELS.find(r => r.level === area.riskLevel)?.color ?? NO_DATA_COLOR;
    const level = element('p', 'area-level');
    level.append(swatch, `${riskLabel(area.riskLevel)} risk`);
    content.append(
      element('p', 'location-popup-name', area.name),
      element('p', 'location-popup-kind', unitKind(area)),
      level
    );
    if (inherited) {
      content.append(
        element('p', 'location-popup-note', `Inherited from ${area.inheritedFromName ?? `its ${area.inherited}`}`)
      );
    }
    dot.setAttribute('aria-label', `Your location, ${area.name}: ${riskLabel(area.riskLevel)} risk`);
  };
  render(null, true);

  return {
    moveTo: lngLat => {
      marker.setLngLat(lngLat);
      popup.setLngLat(lngLat);
      if (!added) {
        marker.addTo(map);
        added = true;
      }
    },
    setArea: render,
    remove: () => {
      popup.remove();
      marker.remove();
    },
  };
};
