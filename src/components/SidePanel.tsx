import { type AnimationEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Full-height panel that slides in from the right (from the bottom on small
 * screens) over a dimmed backdrop. A native modal dialog, so focus stays
 * inside and returns to the opening button. Closing plays the slide-out
 * animation first, then closes the dialog.
 */
export const SidePanel = ({ open, title, onClose, children }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setClosing(false);
      dialog.showModal();
    }
    if (!open && dialog.open) setClosing(true);
  }, [open]);

  const onAnimationEnd = (e: AnimationEvent<HTMLDialogElement>) => {
    // Children (e.g. checkmarks) animate too; only the panel's own slide-out counts.
    if (!closing || e.target !== ref.current) return;
    ref.current.close();
    setClosing(false);
  };

  return (
    <dialog
      ref={ref}
      className={`side-panel${closing ? ' is-closing' : ''}`}
      aria-labelledby={titleId}
      // Esc: animate out through the parent's state instead of closing at once.
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog element itself.
      onClick={e => e.target === e.currentTarget && onClose()}
      onAnimationEnd={onAnimationEnd}
    >
      <header className="side-panel-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="side-panel-close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className="side-panel-body">{children}</div>
    </dialog>
  );
};
