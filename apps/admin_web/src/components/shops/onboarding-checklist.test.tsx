import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnboardingChecklist } from './onboarding-checklist';

describe('OnboardingChecklist', () => {
  it('states each item in words and links open items to the profile', () => {
    render(
      <OnboardingChecklist
        shopId="shop-1"
        onboarding={{
          items: [
            { key: 'address', done: true },
            { key: 'location', done: false },
            { key: 'support_phone', done: false },
          ],
        }}
      />,
    );

    expect(screen.getByText('1 of 3 done')).toBeTruthy();
    expect(screen.getAllByText('Done')).toHaveLength(1);
    expect(screen.getAllByText('To do')).toHaveLength(2);
    const link = screen.getByRole('link', { name: 'Add map location' });
    expect(link.getAttribute('href')).toBe('/shops/shop-1/profile');
    expect(screen.queryByRole('link', { name: 'Add shop address' })).toBeNull();
  });

  it('still shows an item key it does not know yet', () => {
    render(
      <OnboardingChecklist
        shopId="shop-1"
        onboarding={{ items: [{ key: 'future_item', done: true }] }}
      />,
    );
    expect(screen.getByText('future_item')).toBeTruthy();
  });
});
