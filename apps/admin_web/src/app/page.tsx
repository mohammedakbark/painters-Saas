import { Hero } from '@/components/marketing/hero';
import {
  AppsSection,
  PaintersSection,
  ProductsSection,
} from '@/components/marketing/offer-sections';
import {
  ProblemsSection,
  PrivacySection,
  StepsSection,
  VisionSection,
} from '@/components/marketing/shop-sections';
import { SiteHeader } from '@/components/marketing/site-header';
import {
  FaqSection,
  FinalCta,
  SiteFooter,
} from '@/components/marketing/site-footer';

// Public home page (WEB-001): explains the platform and leads shops to Login
// and Register. Platform admins open /platform/sign-in directly; every area
// authorizes on the server, so this page is static.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ProblemsSection />
        <VisionSection />
        <ProductsSection />
        <PaintersSection />
        <StepsSection />
        <PrivacySection />
        <AppsSection />
        <FaqSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
