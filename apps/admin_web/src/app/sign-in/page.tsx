import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { otpSignIn } from './actions';
import { OtpSignInForm } from './otp-sign-in-form';

export const metadata: Metadata = { title: 'Shop sign-in' };

export default function ShopSignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-form flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-caption font-medium tracking-wide text-text-secondary uppercase">
          Shop owners and staff
        </p>
        <h1 className="text-heading1 font-bold">Sign in with your mobile</h1>
        <p className="text-body-large text-text-secondary">
          New here? Signing in with your number creates your account, then you
          can register your shop.
        </p>
      </div>
      <Card className="p-6">
        <OtpSignInForm action={otpSignIn} />
      </Card>
      <Link
        href="/"
        className="text-body font-medium text-brand-primary hover:underline"
      >
        Back to portal home
      </Link>
    </main>
  );
}
