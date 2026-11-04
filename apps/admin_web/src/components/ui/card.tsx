import Link from 'next/link';
import type { ComponentProps, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Surfaces (D-039). Their radius, border and background come from the
// `component.card` and `component.panel` tokens; callers add only layout
// and padding classes.

type CardElement = 'div' | 'section' | 'aside' | 'article' | 'li' | 'details';

const CARD = 'rounded-card border border-card-border';
const TONES = {
  default: 'bg-card-background',
  subtle: 'bg-surface-subtle',
} as const;

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** The element to render; `section` for titled page sections. */
  as?: CardElement;
  /** `subtle` for placeholders such as an empty image preview. */
  tone?: keyof typeof TONES;
  /** Layout and padding classes (for example `flex flex-col gap-4 p-6`). */
  className?: string;
  /** For `as="details"`. */
  open?: boolean;
}

/** A card: the standard bordered surface for page sections and list items. */
export function Card({
  as: Element = 'div',
  tone = 'default',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Element className={cn(CARD, TONES[tone], className)} {...rest}>
      {children}
    </Element>
  );
}

/** Card surface classes for elements that can't be a `Card` (e.g. a table wrapper). */
export function cardClasses(className?: string): string {
  return cn(CARD, TONES.default, className);
}

/** A bordered list in one card, with dividers between the items. */
export function CardList({
  className,
  ...rest
}: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      {...rest}
      className={cn(
        'flex flex-col divide-y divide-card-border',
        CARD,
        TONES.default,
        className,
      )}
    />
  );
}

/** A whole card that is one link, such as a shop in "Your shops". */
export function CardLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        CARD,
        TONES.default,
        'hover:border-control-border focus-visible:outline-2 focus-visible:outline-brand-primary',
        className,
      )}
      {...props}
    />
  );
}

/** A box inside a card, such as a pack-size row or a shade row. */
export function Panel({
  as: Element = 'div',
  className,
  children,
  ...rest
}: Omit<CardProps, 'tone'>) {
  return (
    <Element
      className={cn('rounded-panel border border-panel-border', className)}
      {...rest}
    >
      {children}
    </Element>
  );
}
