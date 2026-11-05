import { cn } from '@/lib/cn';

// Placeholder drawings in the brand colours, drawn only with token classes.
// To be replaced with real app screenshots (product owner, 2026-11-05).

function ProductRow({ y, swatch }: { y: number; swatch: string }) {
  return (
    <g>
      <rect
        x="276"
        y={y}
        width="148"
        height="52"
        rx="10"
        className="fill-surface-default stroke-border-default"
      />
      <rect
        x="286"
        y={y + 8}
        width="36"
        height="36"
        rx="8"
        className="fill-brand-primary-soft"
      />
      <rect
        x="296"
        y={y + 16}
        width="16"
        height="20"
        rx="3"
        className={swatch}
      />
      <rect
        x="332"
        y={y + 12}
        width="64"
        height="8"
        rx="4"
        className="fill-text-primary"
      />
      <rect
        x="332"
        y={y + 26}
        width="44"
        height="6"
        rx="3"
        className="fill-border-strong"
      />
      <rect
        x="332"
        y={y + 37}
        width="30"
        height="7"
        rx="3"
        className="fill-brand-primary"
      />
    </g>
  );
}

/** Hero drawing: the shop portal on a screen and a shop storefront on a phone. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      role="img"
      aria-label="The shop portal on a computer and a shop catalogue on a phone"
      className={cn('h-auto w-full', className)}
    >
      {/* Portal window */}
      <rect
        x="16"
        y="40"
        width="340"
        height="250"
        rx="16"
        className="fill-surface-default stroke-border-strong"
      />
      <rect
        x="16"
        y="40"
        width="340"
        height="36"
        rx="16"
        className="fill-brand-primary"
      />
      <rect
        x="16"
        y="60"
        width="340"
        height="16"
        className="fill-brand-primary"
      />
      <circle cx="40" cy="58" r="5" className="fill-brand-primary-soft" />
      <circle cx="58" cy="58" r="5" className="fill-brand-primary-soft" />
      <circle cx="76" cy="58" r="5" className="fill-brand-accent" />
      {/* Sidebar */}
      <rect
        x="32"
        y="92"
        width="72"
        height="182"
        rx="10"
        className="fill-surface-subtle"
      />
      <rect
        x="42"
        y="106"
        width="52"
        height="10"
        rx="5"
        className="fill-brand-primary"
      />
      <rect
        x="42"
        y="126"
        width="44"
        height="8"
        rx="4"
        className="fill-border-strong"
      />
      <rect
        x="42"
        y="142"
        width="48"
        height="8"
        rx="4"
        className="fill-border-strong"
      />
      <rect
        x="42"
        y="158"
        width="40"
        height="8"
        rx="4"
        className="fill-border-strong"
      />
      {/* Checklist card */}
      <rect
        x="118"
        y="92"
        width="140"
        height="86"
        rx="12"
        className="fill-surface-default stroke-border-default"
      />
      <rect
        x="130"
        y="104"
        width="70"
        height="9"
        rx="4"
        className="fill-text-primary"
      />
      {[124, 142, 160].map((y, index) => (
        <g key={y}>
          <circle
            cx="138"
            cy={y + 4}
            r="6"
            className={index < 2 ? 'fill-status-success' : 'fill-border-strong'}
          />
          <rect
            x="150"
            y={y}
            width="86"
            height="8"
            rx="4"
            className="fill-border-strong"
          />
        </g>
      ))}
      {/* Shade swatches card */}
      <rect
        x="118"
        y="190"
        width="140"
        height="84"
        rx="12"
        className="fill-surface-default stroke-border-default"
      />
      <rect
        x="130"
        y="202"
        width="56"
        height="9"
        rx="4"
        className="fill-text-primary"
      />
      {[
        'fill-brand-primary',
        'fill-brand-accent',
        'fill-brand-primary-strong',
        'fill-border-strong',
        'fill-brand-primary-soft',
        'fill-text-secondary',
      ].map((fill, index) => (
        <rect
          key={fill}
          x={130 + (index % 3) * 40}
          y={222 + Math.floor(index / 3) * 24}
          width="32"
          height="18"
          rx="5"
          className={fill}
        />
      ))}

      {/* Phone */}
      <rect
        x="262"
        y="20"
        width="176"
        height="360"
        rx="28"
        className="fill-text-primary"
      />
      <rect
        x="270"
        y="28"
        width="160"
        height="344"
        rx="22"
        className="fill-surface-subtle"
      />
      <rect
        x="326"
        y="36"
        width="48"
        height="8"
        rx="4"
        className="fill-text-primary"
      />
      {/* Shop banner */}
      <rect
        x="276"
        y="54"
        width="148"
        height="64"
        rx="12"
        className="fill-brand-primary"
      />
      <rect
        x="288"
        y="68"
        width="78"
        height="10"
        rx="5"
        className="fill-surface-default"
      />
      <rect
        x="288"
        y="86"
        width="54"
        height="7"
        rx="3"
        className="fill-brand-primary-soft"
      />
      <rect
        x="370"
        y="94"
        width="44"
        height="16"
        rx="8"
        className="fill-brand-accent"
      />
      {/* Search */}
      <rect
        x="276"
        y="128"
        width="148"
        height="26"
        rx="10"
        className="fill-surface-default stroke-border-strong"
      />
      <rect
        x="288"
        y="137"
        width="60"
        height="8"
        rx="4"
        className="fill-border-strong"
      />
      <ProductRow y={164} swatch="fill-brand-accent" />
      <ProductRow y={224} swatch="fill-brand-primary" />
      <ProductRow y={284} swatch="fill-brand-primary-strong" />
      {/* Cart bar */}
      <rect
        x="276"
        y="342"
        width="148"
        height="22"
        rx="11"
        className="fill-brand-primary"
      />
      <rect
        x="318"
        y="349"
        width="64"
        height="8"
        rx="4"
        className="fill-surface-default"
      />
    </svg>
  );
}
