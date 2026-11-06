import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { RedirectIfSignedIn } from '@/components/auth/redirect-if-signed-in';
import { AuthSteps } from '@/components/auth/auth-steps';
import { afterVerifyPath } from '@/lib/auth/otp';
import { otpSignIn } from '../sign-in/actions';
import { OtpSignInForm } from '../sign-in/otp-sign-in-form';

export const metadata: Metadata = { title: 'Register your shop' };

/**
 * Registration step 1 (WEB-002): verify the mobile number. The account is
 * created on first verification (D-024); the shop details follow on
 * /shops/new.
 */
export default function RegisterPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn to={afterVerifyPath('register')} />
      </Suspense>
      <AuthLayout
        aside={<AuthSteps current={1} />}
        title="Register your shop"
        description="Start with your mobile number. You'll be the shop's owner, and your shop stays private until the platform team approves it."
        footer={
          <>
            Already registered?{' '}
            <Link
              href="/sign-in"
              className="font-semibold text-brand-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <OtpSignInForm action={otpSignIn} mode="register" />
      </AuthLayout>
    </>
  );
}
