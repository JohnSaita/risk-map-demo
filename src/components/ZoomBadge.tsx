import { ADMIN_BANDS, type AdminBand } from '../risk/zoomBands';

interface Props {
  band: AdminBand;
}

/** Shows which admin level is on screen; zoom in/out to switch. */
export const ZoomBadge = ({ band }: Props) => (
  <div className="card zoom-badge" aria-live="polite">
    <span className="zoom-badge-label">Showing</span>
    <ol className="zoom-steps">
      {ADMIN_BANDS.map(b => (
        <li key={b.id} aria-current={b.id === band.id ? 'true' : undefined}>
          {b.label}
        </li>
      ))}
    </ol>
  </div>
);
