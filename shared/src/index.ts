export interface ScoreSubmission {
  name: string;
  score: number;
  seed: string;
  ts: number;
}

export type LeaderboardEntry = ScoreSubmission;

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export const SCORE_NAME_LIMIT = 32;

export type NoteName =
  | 'C3'
  | 'D3'
  | 'E3'
  | 'F3'
  | 'G3'
  | 'A3'
  | 'B3'
  | 'C4'
  | 'D4'
  | 'E4'
  | 'F4'
  | 'G4'
  | 'A4'
  | 'B4'
  | 'C5';

export interface ScoreSummary {
  totalScore: number;
  combo: number;
  maxCombo: number;
  mistakes: number;
  motif: NoteName[];
  durationMs: number;
}

export interface GameSettings {
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.7,
  muted: false,
  reducedMotion: false,
};

export const GAME_SCENES = {
  BOOT: 'Boot',
  PRELOAD: 'Preload',
  MENU: 'Menu',
  PLAY: 'Play',
  GAME_OVER: 'GameOver',
} as const;

export type SceneKey = (typeof GAME_SCENES)[keyof typeof GAME_SCENES];
