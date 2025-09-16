import { accents, fonts, metrics, palette, radii, shadows, spacing } from './theme/tokens';

export const colors = {
  ...palette,
};

export const tokens = {
  palette,
  accents,
  spacing,
  radii,
  fonts,
  shadows,
};

export { spacing, radii, accents, shadows, fonts } from './theme/tokens';

export const typography = {
  heading: fonts.display,
  body: fonts.ui,
  mono: fonts.mono,
};

export const brand = {
  title: 'Melody Dash',
  tagline: 'Montague Pianos — Est. 1879',
};

export const layout = {
  worldWidth: metrics.worldWidth,
  worldHeight: metrics.worldHeight,
};
