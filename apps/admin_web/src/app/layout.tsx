import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { appFont } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: BRAND.adminPortalName,
    template: `%s · ${BRAND.adminPortalName}`,
  },
  description: BRAND.adminPortalDescription,
  // Administration surface: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={appFont.variable}
      // Lets the router turn smooth scrolling off during navigation.
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
