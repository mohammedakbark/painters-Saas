import { cn } from '@/lib/cn';

// The project's icon set (D-039). Line icons are drawn on a 24 px grid with
// `currentColor`, so they take the colour of the text around them. Add an
// icon here before a screen uses it; no icon library is needed.
//
// The Apple and Google Play glyphs are from Font Awesome Free 6
// (https://fontawesome.com, CC BY 4.0). They identify the stores on download
// buttons; switch to the stores' official badges when the apps are published.

interface IconShape {
  viewBox: string;
  /** Filled glyph (store logos) instead of a 2 px line icon. */
  filled?: boolean;
  d: string;
}

const LINE = '0 0 24 24';

const ICONS = {
  arrowRight: { viewBox: LINE, d: 'M5 12h14M13 6l6 6-6 6' },
  logIn: {
    viewBox: LINE,
    d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  },
  chevronDown: { viewBox: LINE, d: 'M6 9l6 6 6-6' },
  menu: { viewBox: LINE, d: 'M4 7h16M4 12h16M4 17h16' },
  check: { viewBox: LINE, d: 'M5 12.5l4.5 4.5L19 7.5' },
  close: { viewBox: LINE, d: 'M6 6l12 12M18 6L6 18' },
  sparkle: {
    viewBox: LINE,
    d: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  },
  smartphone: {
    viewBox: LINE,
    d: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  },
  store: {
    viewBox: LINE,
    d: 'M4.5 4h15L21 9H3zM3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5',
  },
  monitor: {
    viewBox: LINE,
    d: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 20h8M12 16v4',
  },
  message: {
    viewBox: LINE,
    d: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-5A8 8 0 1 1 21 12z',
  },
  notebook: {
    viewBox: LINE,
    d: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM9 3v18M12.5 8h3.5M12.5 12h3.5',
  },
  tag: {
    viewBox: LINE,
    d: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01',
  },
  mapPin: {
    viewBox: LINE,
    d: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  chart: { viewBox: LINE, d: 'M5 20v-9M11 20V4M17 20v-6M3 20h18' },
  receipt: {
    viewBox: LINE,
    d: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
  },
  wallet: {
    viewBox: LINE,
    d: 'M18 5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7M16 14.5h.01',
  },
  shield: {
    viewBox: LINE,
    d: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  },
  lock: { viewBox: LINE, d: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4' },
  eyeOff: {
    viewBox: LINE,
    d: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-2.6 3.2M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  },
  eye: {
    viewBox: LINE,
    d: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  },
  target: {
    viewBox: LINE,
    d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  },
  instagram: {
    viewBox: LINE,
    d: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h.01',
  },
  linkedin: {
    viewBox: LINE,
    d: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM8 11v5M8 8h.01M12 16v-5M12 13.5a2.5 2.5 0 0 1 5 0V16',
  },
  whatsapp: {
    viewBox: LINE,
    d: 'M3.5 20.5l1.4-4.2A8.5 8.5 0 1 1 8 19.2zM9 8.5c.2 3.4 3 6.3 6.5 6.5l1-1.6-2-1.1-1 .8a4.6 4.6 0 0 1-2.1-2.1l.8-1-1.1-2z',
  },
  apple: {
    viewBox: '0 0 384 512',
    filled: true,
    d: 'M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z',
  },
  googlePlay: {
    viewBox: '0 0 512 512',
    filled: true,
    d: 'M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z',
  },
} satisfies Record<string, IconShape>;

export type IconName = keyof typeof ICONS;

/** A decorative icon; the text next to it carries the meaning. */
export function Icon({
  name,
  className,
}: {
  name: IconName;
  /** Size and colour, e.g. `size-5 text-brand-primary`. Defaults to 20 px. */
  className?: string;
}) {
  const shape: IconShape = ICONS[name];
  return (
    <svg
      viewBox={shape.viewBox}
      aria-hidden="true"
      focusable="false"
      className={cn('size-5 shrink-0', className)}
      fill={shape.filled ? 'currentColor' : 'none'}
      stroke={shape.filled ? 'none' : 'currentColor'}
      strokeWidth={shape.filled ? undefined : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={shape.d} />
    </svg>
  );
}

/** A soft square tile holding an icon, used at the top of feature cards. */
export function IconTile({ name }: { name: IconName }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-panel bg-brand-primary-soft text-brand-primary">
      <Icon name={name} className="size-6" />
    </span>
  );
}
