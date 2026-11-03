import Link from 'next/link';
import type { ComponentProps } from 'react';
import { type ButtonVariant, buttonClasses } from './button';

/** Navigation that looks like a button (e.g. "Register a shop"). */
export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
