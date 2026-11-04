import { BrandMark } from '@/components/brand/brand-mark';
import { CardLink } from '@/components/ui/card';

// Portal entry point. Each area authorizes on the server, so this page is
// static and only routes people to the right sign-in.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-narrow flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <BrandMark as="h1" size="heading1" />
        <p className="text-body-large text-text-secondary">
          Choose how you want to sign in.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        <li>
          <CardLink href="/sign-in" className="flex flex-col gap-1 px-5 py-4">
            <span className="text-title font-semibold text-brand-primary">
              Shop owners and staff
            </span>
            <span className="text-body text-text-secondary">
              Sign in or register your shop with your mobile number.
            </span>
          </CardLink>
        </li>
        <li>
          <CardLink
            href="/platform/sign-in"
            className="flex flex-col gap-1 px-5 py-4"
          >
            <span className="text-title font-semibold text-brand-primary">
              Platform admin
            </span>
            <span className="text-body text-text-secondary">
              Manage shops on the platform. Email and password.
            </span>
          </CardLink>
        </li>
      </ul>
    </main>
  );
}
