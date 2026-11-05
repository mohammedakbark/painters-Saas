import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon';
import {
  MISSION,
  PRIVACY_POINTS,
  PROBLEMS,
  SHOP_STEPS,
  VISION,
} from './home-content';
import { MarketingSection, TickIcon } from './section';

/** Today's problems and what the platform does instead. */
export function ProblemsSection() {
  return (
    <MarketingSection
      id="why"
      eyebrow="Why"
      title="Built for how paint shops really work"
      intro="Many shops still run on phone calls, WhatsApp messages and notebooks. That works, until it doesn’t."
    >
      <ul className="grid gap-4 desktop:grid-cols-3">
        {PROBLEMS.map((item) => (
          <Card as="li" key={item.today} className="flex flex-col gap-4 p-6">
            <IconTile name={item.icon} />
            <p className="text-body font-medium text-text-secondary">
              <span className="sr-only">Today: </span>
              {item.today}
            </p>
            <p className="flex gap-3 text-body-large text-text-primary">
              <TickIcon className="mt-0.5" />
              <span>
                <span className="sr-only">Instead: </span>
                {item.instead}
              </span>
            </p>
          </Card>
        ))}
      </ul>
    </MarketingSection>
  );
}

export function VisionSection() {
  return (
    <MarketingSection
      id="vision"
      eyebrow="Vision and mission"
      title="Local paint shops, made digital"
      tone="subtle"
    >
      <div className="grid gap-4 desktop:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6 desktop:p-8">
          <IconTile name="eye" />
          <h3 className="text-heading3 font-semibold text-brand-primary">
            Our vision
          </h3>
          <p className="text-body-large text-text-primary">{VISION}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-6 desktop:p-8">
          <IconTile name="target" />
          <h3 className="text-heading3 font-semibold text-brand-primary">
            Our mission
          </h3>
          <p className="text-body-large text-text-primary">{MISSION}</p>
        </Card>
      </div>
    </MarketingSection>
  );
}

/** The real onboarding flow: register, set up, review, live (D-025). */
export function StepsSection() {
  return (
    <MarketingSection
      id="how-it-works"
      eyebrow="How it works"
      title="How a shop goes live"
      intro="Getting your shop online takes four steps, all from the Shop Admin portal."
    >
      <ol className="grid gap-4 medium:grid-cols-2 desktop:grid-cols-4">
        {SHOP_STEPS.map((step, index) => (
          <Card as="li" key={step.title} className="flex flex-col gap-3 p-6">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-badge bg-brand-primary text-title font-semibold text-surface-default"
            >
              {index + 1}
            </span>
            <h3 className="text-title font-semibold text-text-primary">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="text-body text-text-secondary">{step.text}</p>
          </Card>
        ))}
      </ol>
    </MarketingSection>
  );
}

export function PrivacySection() {
  return (
    <MarketingSection
      id="privacy"
      eyebrow="Trust"
      title="Your shop’s data stays yours"
      tone="subtle"
    >
      <ul className="grid gap-4 desktop:grid-cols-3">
        {PRIVACY_POINTS.map((point) => (
          <Card as="li" key={point.text} className="flex flex-col gap-4 p-6">
            <IconTile name={point.icon} />
            <span className="text-body-large text-text-primary">
              {point.text}
            </span>
          </Card>
        ))}
      </ul>
    </MarketingSection>
  );
}
