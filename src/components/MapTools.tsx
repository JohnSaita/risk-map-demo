import { type ReactNode, useState } from 'react';

import type { LayerSettings } from '../types';
import { LayersPanel } from './LayersPanel';
import { Legend } from './Legend';
import { SidePanel } from './SidePanel';

interface Props {
  layers: LayerSettings;
  onLayersChange: (layers: LayerSettings) => void;
  /** Named in the Configuration panel's title. */
  diseaseName: string;
}

type PanelId = 'legend' | 'layers';

const LegendIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <rect x="3" y="3.5" width="4" height="4" rx="1" fill="#e74141" />
    <rect x="3" y="8" width="4" height="4" rx="1" fill="#ebce12" />
    <rect x="3" y="12.5" width="4" height="4" rx="1" fill="#65e180" />
    <path d="M9.5 5.5h7.5M9.5 10h7.5M9.5 14.5h7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="m10 3 7.5 4L10 11 2.5 7 10 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="m2.5 10.5 7.5 4 7.5-4M2.5 14l7.5 4 7.5-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/**
 * Separate, labelled Legend and Configuration buttons. Each opens a side
 * panel (from the right; from the bottom on small screens). One at a time.
 */
export const MapTools = ({ layers, onLayersChange, diseaseName }: Props) => {
  const [open, setOpen] = useState<PanelId | null>(null);
  const close = () => setOpen(null);

  const panels: Record<PanelId, { label: string; title: string; icon: ReactNode; body: ReactNode }> = {
    legend: {
      label: 'Legend',
      title: 'Legend',
      icon: <LegendIcon />,
      body: <Legend base={layers.base} />,
    },
    layers: {
      label: 'Configuration',
      title: `Configure display for ${diseaseName}`,
      icon: <LayersIcon />,
      body: <LayersPanel layers={layers} onChange={onLayersChange} />,
    },
  };
  const ids = Object.keys(panels) as PanelId[];

  return (
    <div className="map-tools">
      <div className="tool-rail">
        {ids.map(id => (
          <button
            key={id}
            type="button"
            className={`tool-btn${open === id ? ' is-active' : ''}`}
            aria-haspopup="dialog"
            onClick={() => setOpen(id)}
          >
            {panels[id].icon}
            <span>{panels[id].label}</span>
          </button>
        ))}
      </div>
      {ids.map(id => (
        <SidePanel key={id} open={open === id} title={panels[id].title} onClose={close}>
          {panels[id].body}
        </SidePanel>
      ))}
    </div>
  );
};
