import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Downloaded at build time and self-hosted by next/font (no runtime Google request).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Admin portal',
  description: 'Shop Admin and Platform Super Admin portal.',
  // Administration surface: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
