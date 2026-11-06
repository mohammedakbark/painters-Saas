import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { RedirectIfSignedIn } from '@/components/auth/redirect-if-signed-in';
import { afterVerifyPath } from '@/lib/auth/otp';
import { otpSignIn } from './actions';
import { OtpSignInForm } from './otp-sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function ShopSignInPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn to={afterVerifyPath('sign-in')} />
      </Suspense>
      <AuthLayout
        title="Sign in to your shop"
        description="For shop owners and staff. Enter your mobile number and we'll send you a code."
        footer={
          <>
            New here?{' '}
            <Link
              href="/register"
              className="font-semibold text-brand-primary underline-offset-4 hover:underline"
            >
              Register your shop
            </Link>
          </>
        }
      >
        <OtpSignInForm action={otpSignIn} mode="sign-in" />
      </AuthLayout>
    </>
  );
}
