export const ATLAS_KEY = 'workshop';

export const atlas = {
  key: ATLAS_KEY,
  texture: '/assets/atlas/workshop_atlas.png',
  data: '/assets/atlas/workshop_atlas.json',
};

export const backgroundKeys = {
  back: 'bg-back',
  mid: 'bg-mid',
  front: 'bg-front',
  vignette: 'bg-vignette',
} as const;

export const backgrounds = {
  [backgroundKeys.back]: '/assets/atlas/background_back.png',
  [backgroundKeys.mid]: '/assets/atlas/background_mid.png',
  [backgroundKeys.front]: '/assets/atlas/background_front.png',
  [backgroundKeys.vignette]: '/assets/atlas/background_vignette.png',
};

export type BackgroundKey = (typeof backgroundKeys)[keyof typeof backgroundKeys];
