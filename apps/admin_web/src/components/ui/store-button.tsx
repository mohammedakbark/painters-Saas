import { cn } from '@/lib/cn';
import { buttonClasses } from './button';
import { Icon } from './icon';

export type AppStore = 'app-store' | 'google-play';

const STORE_LABELS: Record<AppStore, { line1: string; line2: string }> = {
  'app-store': { line1: 'Download on the', line2: 'App Store' },
  'google-play': { line1: 'Get it on', line2: 'Google Play' },
};

/**
 * An app-store download button. With a store URL it is a link; without one
 * (the app is not published yet) it shows "Coming soon" and cannot be used.
 */
export function StoreButton({
  store,
  appName,
  href,
  className,
}: {
  store: AppStore;
  /** Used in the accessible name, e.g. "Shop App". */
  appName: string;
  href: string | null;
  className?: string;
}) {
  const label = STORE_LABELS[store];
  const classes = buttonClasses(
    'secondary',
    cn('min-w-44 justify-start gap-3 py-2 text-left', className),
  );
  const text = (
    <>
      <Icon
        name={store === 'app-store' ? 'apple' : 'googlePlay'}
        className="size-6"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-caption font-medium text-text-secondary">
          {href ? label.line1 : 'Coming soon to'}
        </span>
        <span className="text-body-large font-semibold">{label.line2}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        aria-label={`${appName}: ${label.line1} ${label.line2}`}
      >
        {text}
      </a>
    );
  }

  return (
    <span
      role="link"
      aria-disabled="true"
      aria-label={`${appName} on ${label.line2}: coming soon`}
      className={cn(classes, 'cursor-not-allowed opacity-70')}
    >
      {text}
    </span>
  );
}
