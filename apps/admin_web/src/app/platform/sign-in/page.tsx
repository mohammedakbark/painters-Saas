import type { Metadata } from 'next';
import { AuthLayout, type AuthHighlight } from '@/components/auth/auth-layout';
import { signInToPlatform } from './actions';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Platform Admin sign-in' };

const PLATFORM_HIGHLIGHTS: readonly AuthHighlight[] = [
  { icon: 'store', text: 'Review and approve shops' },
  { icon: 'notebook', text: 'Manage the brand catalogues' },
  { icon: 'shield', text: 'Every platform action is audited' },
];

// Reached by typing the address; the public site does not link here
// (WEB-001). Every console page authorizes on the server.
export default function PlatformSignInPage() {
  return (
    <AuthLayout
      title="Platform Admin sign-in"
      description="For the platform team. Use your email and password."
      highlights={PLATFORM_HIGHLIGHTS}
    >
      <SignInForm action={signInToPlatform} />
    </AuthLayout>
  );
}
