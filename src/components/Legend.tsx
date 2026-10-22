import { ELEVATION_MAX, ELEVATION_STOPS } from '../map/reliefLayers';
import { NO_DATA_COLOR, RISK_LEVELS } from '../risk/levels';
import type { BaseLayer } from '../types';

interface LegendEntry {
  title: string;
  /** CSS background for the circle. */
  fill: string;
  description?: string;
}

const riskTitle = (label: string) => (label === 'Unlikely' ? 'Unlikely transmission' : `${label} risk`);

const RISK_ENTRIES: LegendEntry[] = [...RISK_LEVELS].reverse().map(r => ({ title: riskTitle(r.label), fill: r.color }));

const OTHER_ENTRIES: LegendEntry[] = [
  { title: 'No data', fill: NO_DATA_COLOR },
  {
    title: 'Inherited from parent area',
    fill: 'var(--hatch), #ffffff',
    description: 'No value of its own; shows its state’s or country’s level.',
  },
];

const metres = (m: number) => `${m.toLocaleString()} m`;

/** One card per band between elevation stops; each circle shades from the band's low to high colour. */
const ELEVATION_ENTRIES: LegendEntry[] = [
  ...ELEVATION_STOPS.slice(0, -1).map(([low, lowColor], i) => {
    const [high, highColor] = ELEVATION_STOPS[i + 1];
    return {
      title: low === 0 ? `Below ${metres(high)}` : `${metres(low)} – ${metres(high)}`,
      fill: `linear-gradient(135deg, ${lowColor}, ${highColor})`,
    };
  }),
  { title: `${metres(ELEVATION_MAX)} and above`, fill: ELEVATION_STOPS[ELEVATION_STOPS.length - 1][1] },
];

const LegendCards = ({ heading, entries }: { heading: string; entries: LegendEntry[] }) => (
  <section className="legend-section">
    <h3 className="panel-subheading">{heading}</h3>
    <ul className="legend-cards">
      {entries.map(e => (
        <li key={e.title} className="panel-card legend-card">
          <span className="legend-circle" style={{ background: e.fill }} aria-hidden="true" />
          <span className="panel-card-text">
            <span className="panel-card-title">{e.title}</span>
            {e.description && <span className="panel-card-description">{e.description}</span>}
          </span>
        </li>
      ))}
    </ul>
  </section>
);

/** Key for whichever base layer is showing, as a list of cards. */
export const Legend = ({ base }: { base: BaseLayer }) =>
  base === 'risk' ? (
    <>
      <LegendCards heading="Risk levels" entries={RISK_ENTRIES} />
      <LegendCards heading="Other areas" entries={OTHER_ENTRIES} />
    </>
  ) : (
    <LegendCards heading="Elevation is shown in metres above sea level." entries={ELEVATION_ENTRIES} />
  );
