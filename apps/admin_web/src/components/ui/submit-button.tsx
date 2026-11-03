'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from './button';

/** Submit button that shows the pending state of its enclosing <form>. */
export function SubmitButton(props: Omit<ButtonProps, 'type' | 'pending'>) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" pending={pending} />;
}
