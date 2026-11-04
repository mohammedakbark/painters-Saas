import { Inter } from 'next/font/google';

/**
 * The only place the web font is loaded (DS-001). The family must match
 * `font.family` in packages/design_tokens/tokens.json and the variable must
 * match `font.webVariable`; `pnpm tokens:check` verifies the variable.
 *
 * Downloaded at build time and self-hosted by next/font (no runtime Google
 * request). To change the font, see packages/design_tokens/README.md.
 */
export const appFont = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
