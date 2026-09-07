interface Props {
  label: string;
  value: number;
  subtext?: string;
  accent?: 'default' | 'green' | 'amber' | 'red' | 'orange';
  size?: 'md' | 'lg';
  /** Extra class(es) merged onto the root `.stat-card` element — used on the
   *  Overview page to gate individual cards to a specific breakpoint (see
   *  `.overview-critical__mobile-only` / `__desktop-only` in dashboard.css). */
  className?: string;
  /** Optional icon (transparent-background PNG) shown directly on the
   *  card, on the opposite side from the label/value — the Overview
   *  cleaning-status cards. No colored square/background behind it: the
   *  icon sits plainly on the card, which itself gets a very soft
   *  orange-to-white gradient wash (see .stat-card--tinted). A card with
   *  an icon also drops the colored edge/border accent and the small
   *  accent dot. Omitted by default, in which case the card renders
   *  exactly as it always has. */
  iconSrc?: string;
  iconAlt?: string;
  /** Renders the card as a real <button> instead of a plain <div>, for the
   *  3 clickable cleaning-status cards that open/switch an accordion
   *  below them. Omitted (default) everywhere else, so every other
   *  StatCard usage renders exactly as it always has. */
  onClick?: () => void;
  /** Only meaningful together with onClick — reflects aria-expanded on the
   *  button for the accordion section it controls. */
  expanded?: boolean;
  /** Assigns this card to a named CSS Grid area — used when the parent
   *  grid places cards via `grid-template-areas` at different positions
   *  per breakpoint (the dashboard's 3 clickable status cards), instead
   *  of relying on plain DOM order. Omitted everywhere else. */
  gridArea?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  accent = 'default',
  size = 'md',
  className,
  iconSrc,
  iconAlt,
  onClick,
  expanded,
  gridArea,
}: Props) {
  const showAccent = !iconSrc && accent !== 'default';
  const cardClass = [
    size === 'lg' ? 'stat-card stat-card--lg' : 'stat-card',
    showAccent && `stat-card--${accent}`,
    iconSrc && 'stat-card--tinted',
    onClick && 'stat-card--clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const rootStyle = gridArea ? { gridArea } : undefined;

  const content = (
    <>
      <div className="stat-card__content">
        <div className="stat-card__label-row">
          {showAccent && <span className={`stat-card__dot stat-card__dot--${accent}`} />}
          <span className="stat-card__label">{label}</span>
        </div>
        <div className="stat-card__value">{value}</div>
        {subtext && <div className="stat-card__subtext">{subtext}</div>}
      </div>
      {iconSrc && (
        <span className="stat-card__icon">
          <img src={iconSrc} alt={iconAlt ?? ''} className="stat-card__icon-img" />
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cardClass} style={rootStyle} onClick={onClick} aria-expanded={expanded}>
        {content}
      </button>
    );
  }

  return (
    <div className={cardClass} style={rootStyle}>
      {content}
    </div>
  );
}
