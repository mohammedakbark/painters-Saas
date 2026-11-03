import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('Home page', () => {
  it('renders the portal heading and the platform sign-in link', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Admin portal' }),
    ).toBeDefined();
    expect(
      screen.getByRole('link', { name: /Platform admin/ }).getAttribute('href'),
    ).toBe('/platform/sign-in');
  });
});
