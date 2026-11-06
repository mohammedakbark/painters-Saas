import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  MyShopsLoading,
  MyShopsView,
  type ShopMembership,
} from './my-shops-view';

const signOut = async () => {};

const SHOPS: ShopMembership[] = [
  {
    shopId: 'shop-1',
    shopName: 'Sree Colours',
    shopStatus: 'DRAFT',
    role: 'MASTER',
  },
  {
    shopId: 'shop-2',
    shopName: 'Asha Paints',
    shopStatus: 'ACTIVE',
    role: 'MASTER',
  },
];

describe('MyShopsView', () => {
  it('shows how to get started when there is no shop', () => {
    render(
      <MyShopsView
        account="+91 99999 00001"
        memberships={[]}
        signOutAction={signOut}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your shops' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: "You haven't registered a shop yet",
      }),
    ).toBeDefined();
    const steps = screen.getByRole('list', { name: 'How a shop goes live' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    const links = screen.getAllByRole('link', { name: 'Register a shop' });
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('/shops/new');
  });

  it('lists each shop as a card that opens it', () => {
    render(
      <MyShopsView
        account="+91 99999 00001"
        memberships={SHOPS}
        signOutAction={signOut}
      />,
    );

    const draft = screen.getByRole('link', { name: /Sree Colours/ });
    expect(draft.getAttribute('href')).toBe('/shops/shop-1');
    expect(within(draft).getByText('Draft')).toBeDefined();
    expect(within(draft).getByText('Owner (master account)')).toBeDefined();
    expect(
      within(draft).getByText('Not visible to customers or painters yet.'),
    ).toBeDefined();

    const live = screen.getByRole('link', { name: /Asha Paints/ });
    expect(live.getAttribute('href')).toBe('/shops/shop-2');
    expect(within(live).getByText('Live')).toBeDefined();

    expect(
      screen
        .getByRole('link', { name: /Register another shop/ })
        .getAttribute('href'),
    ).toBe('/shops/new');
    expect(
      screen
        .getByRole('link', { name: 'Register a shop' })
        .getAttribute('href'),
    ).toBe('/shops/new');
    expect(screen.queryByText("You haven't registered a shop yet")).toBeNull();
  });

  it('shows who is signed in and a way to sign out', () => {
    render(
      <MyShopsView
        account="+91 99999 00001"
        memberships={SHOPS}
        signOutAction={signOut}
      />,
    );

    expect(screen.getByText('Signed in as +91 99999 00001.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDefined();
  });
});

describe('MyShopsLoading', () => {
  it('is announced as loading', () => {
    const { container } = render(<MyShopsLoading />);
    expect(screen.getByText('Loading your shops…')).toBeDefined();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });
});
