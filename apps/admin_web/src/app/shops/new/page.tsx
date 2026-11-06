import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthSteps } from '@/components/auth/auth-steps';
import { registerShopAction } from './actions';
import { RegisterShopForm } from './register-shop-form';

export const metadata: Metadata = { title: 'Register a shop' };

// Registration step 2 (WEB-002). The form holds no data; the Server Action
// requires a session and the API decides whether the account may register
// (verified mobile number).
export default function RegisterShopPage() {
  return (
    <AuthLayout
      aside={<AuthSteps current={2} />}
      title="Tell us about your shop"
      description="Your shop starts as a private draft. Customers and painters see it only after you complete its profile and the platform team approves it."
    >
      <RegisterShopForm action={registerShopAction} />
    </AuthLayout>
  );
}
