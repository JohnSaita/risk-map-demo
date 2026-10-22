import { NO_DATA_COLOR, riskLabel, RISK_LEVELS, unitKind } from '../risk/levels';
import type { HoveredArea, RiskFeatureProps } from '../types';

interface Props {
  hovered: HoveredArea | null;
}

/** Gap between the pointer and the tooltip, in pixels. */
const OFFSET = 14;

const describeSource = (area: RiskFeatureProps): string | null => {
  if (area.inherited === 'none') return null;
  const from = area.inheritedFromName ?? `its ${area.inherited}`;
  return `No ${area.gid2 ? 'district' : 'state'} data — value inherited from ${area.inherited} (${from}).`;
};

/**
 * Tooltip at the pointer for the hovered (desktop) or tapped (touch) area.
 * It sits below-right of the pointer and flips to the other side in the
 * right or bottom half of the screen, so it stays on a 400px-wide phone.
 */
export const AreaInfo = ({ hovered }: Props) => {
  if (!hovered) return null;

  const { area, x, y, mapWidth, mapHeight } = hovered;
  const flipX = x > mapWidth / 2;
  const flipY = y > mapHeight / 2;
  const inherited = area.inherited !== 'none';
  const color = RISK_LEVELS.find(r => r.level === area.riskLevel)?.color ?? NO_DATA_COLOR;
  const note = describeSource(area);

  return (
    <section
      className="card area-info"
      aria-live="polite"
      style={{
        left: x,
        top: y,
        transform: `translate(${flipX ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`}, ${
          flipY ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`
        })`,
      }}
    >
      <p className="eyebrow">{unitKind(area)}</p>
      <h2>{area.name}</h2>
      <p className="area-level">
        <span className={`swatch${inherited ? ' swatch-inherited-over' : ''}`} style={{ background: color }} />
        {riskLabel(area.riskLevel)} risk
        {inherited && <span className="area-level-tag">inherited</span>}
      </p>
      {note && <p className="area-note">{note}</p>}
    </section>
  );
};
