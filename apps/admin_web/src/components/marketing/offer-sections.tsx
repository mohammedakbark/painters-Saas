import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Icon, IconTile } from '@/components/ui/icon';
import { StoreButton } from '@/components/ui/store-button';
import { APP_STORE_LINKS, type AppStoreLinks } from '@/lib/app-stores';
import { BRAND } from '@/lib/brand';
import { PAINTER_POINTS, PRODUCTS } from './home-content';
import { cn } from '@/lib/cn';
import {
  CARD_MOTION,
  MarketingSection,
  revealIndex,
  TickIcon,
} from './section';

/** The three things the platform provides, each with its status. */
export function ProductsSection() {
  return (
    <MarketingSection
      id="products"
      eyebrow="What we provide"
      title="One platform, three ways in"
      intro="A mobile app for customers and painters, a mobile app for shops, and a web portal to run your shop."
    >
      <ul className="grid gap-4 desktop:grid-cols-3">
        {PRODUCTS.map((product, index) => (
          <Card
            as="li"
            key={product.id}
            aria-labelledby={`${product.id}-name`}
            style={revealIndex(index)}
            className={cn(CARD_MOTION, 'flex flex-col gap-5 p-6')}
          >
            <div className="flex flex-col items-start gap-2">
              <div className="flex w-full items-start justify-between gap-3">
                <IconTile name={product.icon} />
                <Badge tone={product.status.tone}>{product.status.label}</Badge>
              </div>
              <h3
                id={`${product.id}-name`}
                className="text-heading3 font-semibold text-text-primary"
              >
                {product.name}
              </h3>
              <p className="text-body text-text-secondary">
                {product.audience}
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {product.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-body text-text-primary"
                >
                  <TickIcon />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {product.id === 'shop-portal' ? (
              <ButtonLink href="/sign-in" className="mt-auto">
                Register your shop
                <Icon name="arrowRight" />
              </ButtonLink>
            ) : (
              <a
                href="#apps"
                className="mt-auto inline-flex items-center gap-2 text-body font-semibold text-brand-primary hover:underline"
              >
                Get the app
                <Icon name="arrowRight" className="size-4" />
              </a>
            )}
          </Card>
        ))}
      </ul>
    </MarketingSection>
  );
}

export function PaintersSection() {
  return (
    <MarketingSection
      id="painters"
      eyebrow="For painters and contractors"
      title="Every site, every shop, one app"
      intro="Painters often buy for one job from several shops. The Customer App keeps it all together while each shop's bills stay separate."
      aside={<Badge tone="neutral">Coming soon</Badge>}
      tone="subtle"
    >
      <ul className="grid gap-4 medium:grid-cols-2 desktop:grid-cols-4">
        {PAINTER_POINTS.map((point, index) => (
          <Card
            as="li"
            key={point.title}
            style={revealIndex(index)}
            className={cn(CARD_MOTION, 'flex flex-col gap-2 p-6')}
          >
            <IconTile name={point.icon} />
            <h3 className="text-title font-semibold text-text-primary">
              {point.title}
            </h3>
            <p className="text-body text-text-secondary">{point.text}</p>
          </Card>
        ))}
      </ul>
    </MarketingSection>
  );
}

function AppDownload({
  name,
  text,
  links,
}: {
  name: string;
  text: string;
  links: AppStoreLinks;
}) {
  return (
    <Card className={cn(CARD_MOTION, 'flex flex-col gap-5 p-6 desktop:p-8')}>
      <div className="flex flex-col gap-2">
        <h3 className="text-heading3 font-semibold text-text-primary">
          {name}
        </h3>
        <p className="text-body-large text-text-secondary">{text}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <StoreButton store="app-store" appName={name} href={links.appStore} />
        <StoreButton
          store="google-play"
          appName={name}
          href={links.googlePlay}
        />
      </div>
    </Card>
  );
}

export function AppsSection() {
  return (
    <MarketingSection
      id="apps"
      eyebrow="Get the apps"
      title="On Android and iPhone"
      intro="Both apps are being prepared for the stores. The buttons will work as soon as they are published."
    >
      <div className="grid gap-4 desktop:grid-cols-2">
        <AppDownload
          name={BRAND.customerAppName}
          text="For painters, contractors and home owners."
          links={APP_STORE_LINKS.customerApp}
        />
        <AppDownload
          name={BRAND.shopAppName}
          text="For shop owners. Sign in with the number you registered with."
          links={APP_STORE_LINKS.shopApp}
        />
      </div>
    </MarketingSection>
  );
}
