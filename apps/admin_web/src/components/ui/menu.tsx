'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * A dropdown menu (WEB-005, D-039): a trigger button and a panel of items.
 * Closes on Escape, on a click outside and after an item is chosen. Items
 * are links (`MenuLink`) or buttons (`MenuButton`).
 */
export function Menu({
  label,
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  triggerClassName,
  className,
}: {
  /** Spoken name of the trigger, e.g. "Actions for Silk Emulsion 4 L". */
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  /** `top` opens upwards, e.g. at the bottom of the sidebar. */
  side?: 'top' | 'bottom';
  triggerClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex min-h-11 items-center rounded-nav-item focus-visible:outline-2 focus-visible:outline-brand-primary',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={id}
          role="menu"
          aria-label={label}
          // Choosing an item (a click that bubbles up) closes the menu.
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-30 flex min-w-56 flex-col rounded-panel border border-card-border bg-card-background p-1.5 shadow-xl shadow-brand-primary/10',
            align === 'end' ? 'right-0' : 'left-0',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-nav-item px-3 text-left text-body font-medium focus-visible:outline-2 focus-visible:outline-brand-primary';

const TONE = {
  default: 'text-text-primary hover:bg-surface-subtle',
  danger: 'text-status-error hover:bg-status-error-soft',
} as const;

export function MenuLink({
  href,
  children,
  tone = 'default',
}: {
  href: string;
  children: ReactNode;
  tone?: keyof typeof TONE;
}) {
  return (
    <Link role="menuitem" href={href} className={cn(ITEM, TONE[tone])}>
      {children}
    </Link>
  );
}

export function MenuButton({
  onSelect,
  children,
  tone = 'default',
  disabled,
}: {
  onSelect: () => void;
  children: ReactNode;
  tone?: keyof typeof TONE;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(ITEM, TONE[tone], 'disabled:opacity-60')}
    >
      {children}
    </button>
  );
}

/** A thin line between groups of items. */
export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border-default" />;
}

/** A non-interactive heading inside a menu, e.g. "Signed in as …". */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-2 text-caption text-text-secondary">{children}</div>
  );
}
