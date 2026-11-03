import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { StateMessage } from '@/components/ui/state-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { getPlatformAccess } from '@/lib/auth/platform-access';
import { signOutOfPlatform } from '../actions';

export const metadata: Metadata = {
  title: 'No platform access · Admin portal',
};

/** Where signed-in accounts without platform access are sent. */
export default function NoPlatformAccessPage() {
  return (
    <main className="flex min-h-dvh items-center px-4 py-12">
      <Suspense
        fallback={
          <p className="mx-auto flex items-center gap-3 text-body-large text-text-secondary">
            <Spinner />
            <span>Checking your access…</span>
          </p>
        }
      >
        <NoAccessMessage />
      </Suspense>
    </main>
  );
}

async function NoAccessMessage() {
  const access = await getPlatformAccess();
  if (access.kind === 'admin') {
    redirect('/platform');
  }
  return (
    <StateMessage
      role="alert"
      title="No platform access"
      description={
        <>
          You are signed in{access.account ? ` as ${access.account}` : ''}, but
          this account doesn&apos;t have platform access.
        </>
      }
      action={
        <form action={signOutOfPlatform}>
          <SubmitButton pendingLabel="Signing out…">Sign out</SubmitButton>
        </form>
      }
    />
  );
}
