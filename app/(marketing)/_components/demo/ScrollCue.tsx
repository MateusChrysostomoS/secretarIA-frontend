// ScrollCue — the "role para baixo" arrow at the foot of each landing's hero
// (owner, 2026-11-06). A plain anchor to the first act: it works without
// JavaScript, and the bob animation stops under prefers-reduced-motion
// (guided-demo.css). Server component.

type ScrollCueProps = {
  /** id of the section it scrolls to, without "#". */
  to: string;
  label?: string;
};

export function ScrollCue({ to, label = "Role para ver" }: ScrollCueProps) {
  return (
    <a className="gd-scrolldown" href={`#${to}`}>
      <span className="gd-scrolldown__ring" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
      {label}
    </a>
  );
}
