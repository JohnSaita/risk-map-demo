import { SITE } from '../site';

interface Props {
  onAbout: () => void;
}

/** Map pin over stacked layers: the three admin levels. Coloured from the --brand-accent tokens. */
const LogoMark = () => (
  <svg className="site-logo" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="url(#site-logo-fill)" />
    <path d="M7 20.5 16 25l9-4.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M7 16.5 16 21l9-4.5" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M16 6.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 7 4.5 7s4.5-3.8 4.5-7A4.5 4.5 0 0 0 16 6.5Z" fill="#fff" />
    <circle cx="16" cy="11" r="1.7" className="site-logo-dot" />
    <defs>
      <linearGradient id="site-logo-fill" x1="0" y1="0" x2="32" y2="32">
        <stop className="site-logo-stop-start" />
        <stop offset="1" className="site-logo-stop-end" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Page header: logo and byline on the left, the page title centred, About
 * and (if configured) contact on the right. On phones the title gets its own
 * row above the byline and buttons.
 */
export const SiteHeader = ({ onAbout }: Props) => (
  <header className="site-header">
    <div className="site-brand">
      <LogoMark />
      <p className="site-byline">
        <span className="site-byline-label">Created by</span>
        <strong>{SITE.author}</strong>
        <span className="site-role">{SITE.role}</span>
      </p>
    </div>
    <h1 className="site-title">{SITE.title}</h1>
    <nav className="site-actions" aria-label="About this map">
      <button type="button" className="btn btn-ghost" onClick={onAbout}>
        About
      </button>
      {SITE.contactUrl && (
        <a className="btn btn-primary" href={SITE.contactUrl} target="_blank" rel="noopener">
          <span className="btn-long">Get a map like this</span>
          <span className="btn-short">Contact</span>
        </a>
      )}
    </nav>
  </header>
);
