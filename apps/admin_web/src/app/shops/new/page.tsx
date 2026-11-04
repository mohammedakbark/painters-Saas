import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { registerShopAction } from './actions';
import { RegisterShopForm } from './register-shop-form';

export const metadata: Metadata = { title: 'Register a shop' };

// The form holds no data; the Server Action requires a session and the API
// decides whether the account may register (verified mobile number).
export default function RegisterShopPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-narrow flex-col gap-6 px-4 py-8 medium:px-6">
      <PageHeader
        title="Register a shop"
        description="Your shop starts as a private draft. Customers and painters see it only after you complete its profile and the platform team approves it."
      />
      <Card className="p-6">
        <RegisterShopForm action={registerShopAction} />
      </Card>
    </main>
  );
}
