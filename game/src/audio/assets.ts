import type { NoteName } from '@melody-dash/shared';
import trackData from './tracks.json';

export interface TrackMetadata {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  barLength: number;
}

export const musicTracks = trackData as TrackMetadata[];

export const trackSources: Record<string, { ogg: string; mp3: string }> = musicTracks.reduce(
  (acc, track) => ({
    ...acc,
    [track.id]: {
      ogg: `/assets/music/${track.id}.ogg`,
      mp3: `/assets/music/${track.id}.mp3`,
    },
  }),
  {} as Record<string, { ogg: string; mp3: string }>,
);

const noteNames: NoteName[] = [
  'C3',
  'D3',
  'E3',
  'F3',
  'G3',
  'A3',
  'B3',
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5',
];

export const noteSources: Record<NoteName, { ogg: string; mp3: string }> = noteNames.reduce(
  (acc, note) => ({
    ...acc,
    [note]: {
      ogg: `/assets/audio/notes/${note}.ogg`,
      mp3: `/assets/audio/notes/${note}.mp3`,
    },
  }),
  {} as Record<NoteName, { ogg: string; mp3: string }>,
);

export const AUTO_TRACK_ID = 'auto';
