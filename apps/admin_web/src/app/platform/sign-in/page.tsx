import type { Metadata } from 'next';
import Link from 'next/link';
import { signInToPlatform } from './actions';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Platform sign-in' };

export default function PlatformSignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-form flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-caption font-medium tracking-wide text-text-secondary uppercase">
          Platform admin
        </p>
        <h1 className="text-heading1 font-bold">Sign in</h1>
        <p className="text-body-large text-text-secondary">
          For platform administrators.
        </p>
      </div>
      <div className="rounded-large border border-border-default bg-surface-default p-6">
        <SignInForm action={signInToPlatform} />
      </div>
      <Link
        href="/"
        className="text-body font-medium text-brand-primary hover:underline"
      >
        Back to portal home
      </Link>
    </main>
  );
}
