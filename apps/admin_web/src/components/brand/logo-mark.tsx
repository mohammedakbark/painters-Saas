import { cn } from '@/lib/cn';

// The SevenPalette shade-card fan (DS-003): seven swatch strips 12 × 62
// rotated 24° apart about a pivot dot. Same geometry as the master SVGs in
// packages/design_tokens/logo (build-logo.mjs); colours are token classes.

const STRIPS: Record<'full' | 'inverse', readonly string[]> = {
  full: [
    'fill-brand-primary-strong',
    'fill-brand-primary',
    'fill-logo-teal-mid',
    'fill-logo-teal-light',
    'fill-brand-accent',
    'fill-logo-orange',
    'fill-brand-highlight',
  ],
  inverse: [
    'fill-logo-teal-light',
    'fill-logo-mint',
    'fill-surface-default',
    'fill-brand-accent',
    'fill-brand-accent',
    'fill-logo-orange',
    'fill-brand-highlight',
  ],
};

const PIVOT = {
  full: 'fill-brand-primary-strong',
  inverse: 'fill-logo-teal-light',
} as const;

/** The fan on its own; decorative (the wordmark carries the name). */
export function LogoMark({
  tone = 'full',
  className,
}: {
  tone?: 'full' | 'inverse';
  className?: string;
}) {
  return (
    <svg
      viewBox="-24.23 8 148.46 85"
      aria-hidden="true"
      focusable="false"
      className={cn('h-7 w-auto shrink-0', className)}
    >
      <g transform="translate(50 84)">
        {STRIPS[tone].map((fill, index) => (
          <rect
            key={index}
            x={-6}
            y={-74}
            width={12}
            height={62}
            rx={4}
            className={fill}
            transform={`rotate(${-72 + index * 24})`}
          />
        ))}
        <circle r={7} className={PIVOT[tone]} />
      </g>
    </svg>
  );
}
