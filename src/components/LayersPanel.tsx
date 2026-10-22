import type { BaseLayer, LayerSettings } from '../types';

interface Props {
  layers: LayerSettings;
  onChange: (layers: LayerSettings) => void;
}

interface LayerOption {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  toggle: (checked: boolean) => LayerSettings;
}

const options = (layers: LayerSettings): LayerOption[] => {
  const setBase = (base: BaseLayer) => ({ ...layers, base });
  return [
    {
      id: 'risk',
      title: 'Show transmission risk',
      description: 'Colour each area by its synthetic transmission risk level.',
      checked: layers.base === 'risk',
      // Risk and elevation share the map, so turning one off shows the other.
      toggle: on => setBase(on ? 'risk' : 'elevation'),
    },
    {
      id: 'elevation',
      title: 'Elevation focus',
      description: 'Colour the land by height instead; risk colours are hidden.',
      checked: layers.base === 'elevation',
      toggle: on => setBase(on ? 'elevation' : 'risk'),
    },
    {
      id: 'terrain3d',
      title: 'Show 3D terrain',
      description: 'Raise mountains and tilt the map to show relief.',
      checked: layers.terrain3d,
      toggle: on => ({ ...layers, terrain3d: on }),
    },
    {
      id: 'hillshade',
      title: 'Show hillshade',
      description: 'Shade slopes so hills and valleys stand out.',
      checked: layers.hillshade,
      toggle: on => ({ ...layers, hillshade: on }),
    },
    {
      id: 'contours',
      title: 'Show contour lines',
      description: 'Topographic lines with height labels, from district zoom (9) in.',
      checked: layers.contours,
      toggle: on => ({ ...layers, contours: on }),
    },
  ];
};

const CheckMark = () => (
  <svg className="layer-check-mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * One card per layer: a large checkbox, a title and a description. The card's
 * left edge is green while the layer is on and red while it is off.
 */
export const LayersPanel = ({ layers, onChange }: Props) => (
  <ul className="layer-cards">
    {options(layers).map(o => (
      <li key={o.id} className={`panel-card layer-card${o.checked ? ' is-on' : ''}`}>
        <label className="layer-check">
          <input
            type="checkbox"
            checked={o.checked}
            aria-describedby={`layer-${o.id}-description`}
            onChange={e => onChange(o.toggle(e.target.checked))}
          />
          <span className="layer-check-box" aria-hidden="true">
            {o.checked && <CheckMark />}
          </span>
          <span className="panel-card-text">
            <span className="panel-card-title">{o.title}</span>
            <span id={`layer-${o.id}-description`} className="panel-card-description">
              {o.description}
            </span>
          </span>
        </label>
      </li>
    ))}
  </ul>
);
