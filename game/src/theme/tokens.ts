export const palette = {
  ebony: '#121212',
  ebonyDeep: '#0b0a0c',
  ebonySoft: '#1c1c1f',
  ivory: '#faf7f0',
  ivoryMuted: '#e7dfcf',
  brass: '#c1a464',
  brassSoft: '#d8ba7a',
  royalRed: '#9c1c2b',
  royalRedBright: '#c72f3c',
  teal: '#1e8a9e',
  tealBright: '#2aa9b9',
  cream: '#f3e3c6',
  midnightBlue: '#101934',
  velvetPlum: '#352640',
  coal: '#070708',
};

export const accents = {
  highlight: 'rgba(255, 210, 127, 0.85)',
  shadow: 'rgba(8, 8, 12, 0.55)',
  outline: 'rgba(255, 245, 224, 0.65)',
  focus: '#ffd27f',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  pill: 999,
  sm: 8,
  md: 14,
  lg: 24,
};

export const fonts = {
  display: '"Cormorant Garamond", "Playfair Display", "Georgia", serif',
  ui: '"Manrope", "Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
  mono: '"IBM Plex Mono", "SFMono-Regular", Menlo, monospace',
};

export const metrics = {
  worldWidth: 960,
  worldHeight: 540,
  gutter: spacing.md,
};

export const shadows = {
  soft: `0 18px 48px -16px ${accents.shadow}`,
  inset: `inset 0 1px 0 rgba(255, 255, 255, 0.12)`,
};
