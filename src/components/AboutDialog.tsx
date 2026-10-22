import { useEffect, useRef } from 'react';

import { DISEASES } from '../risk/diseases';
import { SITE, TECH_STACK } from '../site';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  ['Three admin levels', 'Country, state and district boundaries switch automatically as you zoom.'],
  ['Smart fallback', 'Areas without data inherit their parent’s value, shown with a hatch pattern.'],
  ['Zoom to any country', 'Pick one or click it on the map; everything around it fades back.'],
  ['Your location', 'One tap finds you and shows the risk where you are.'],
  [`${DISEASES.length} diseases`, `${DISEASES.map(d => d.name).join(', ')}.`],
  ['Works on any screen', 'Built for desktop and phones alike, down to 400px wide.'],
] as const;

/** What the map does and who built it. A native modal dialog: focus trap and Esc come for free. */
export const AboutDialog = ({ open, onClose }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="about-body">
        <button type="button" className="about-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">Interactive web map</p>
        <h2 id="about-title">{SITE.title}</h2>
        <p className="about-lead">
          A global, multi-level map of transmission risk for mosquito-borne diseases, from whole countries down to
          individual districts, fast enough for a phone.
        </p>

        <ul className="about-features">
          {FEATURES.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <p className="eyebrow">Built with</p>
        <ul className="about-stack">
          {TECH_STACK.map(t => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <p className="about-disclaimer">
          All risk values are synthetic, generated for demonstration. They are not real risk estimates.
        </p>

        <div className="about-cta">
          <div>
            <p className="about-cta-title">Need a web map like this?</p>
            <p className="about-cta-text">
              Designed and built by <strong>{SITE.author}</strong>. Your data, your boundaries, your branding.
            </p>
          </div>
          {SITE.contactUrl && (
            <a className="btn btn-primary" href={SITE.contactUrl} target="_blank" rel="noopener">
              Get in touch
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
};
