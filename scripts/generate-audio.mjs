import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sampleRate = 44_100;
const noteDuration = 0.8;
const noteFrequencies = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
};

const tracks = [
  {
    id: 'prelude_c',
    title: 'Prelude in C Fragment',
    composer: 'J.S. Bach',
    bpm: 96,
    barLength: 4,
    beats: 16,
    sequence: [
      ['C3', 0],
      ['E3', 0.5],
      ['G3', 1],
      ['C4', 1.5],
      ['E3', 2],
      ['G3', 2.5],
      ['C4', 3],
      ['E4', 3.5],
      ['F3', 4],
      ['A3', 4.5],
      ['C4', 5],
      ['F4', 5.5],
      ['A3', 6],
      ['C4', 6.5],
      ['F4', 7],
      ['A4', 7.5],
      ['G3', 8],
      ['B3', 8.5],
      ['D4', 9],
      ['G4', 9.5],
      ['B3', 10],
      ['D4', 10.5],
      ['G4', 11],
      ['B4', 11.5],
      ['C3', 12],
      ['E3', 12.5],
      ['G3', 13],
      ['C4', 13.5],
      ['E4', 14],
      ['G4', 14.5],
      ['C5', 15],
      ['E4', 15.5],
    ],
  },
  {
    id: 'ode_to_joy',
    title: 'Ode to Joy Theme',
    composer: 'L. van Beethoven',
    bpm: 104,
    barLength: 4,
    beats: 16,
    sequence: [
      ['E4', 0],
      ['E4', 0.5],
      ['F4', 1],
      ['G4', 1.5],
      ['G4', 2.5],
      ['F4', 3],
      ['E4', 3.5],
      ['D4', 4],
      ['C4', 5],
      ['C4', 5.5],
      ['D4', 6],
      ['E4', 6.5],
      ['E4', 7.5],
      ['D4', 8],
      ['D4', 8.5],
      ['E4', 9.5],
      ['F4', 10],
      ['E4', 10.5],
      ['D4', 11],
      ['C4', 12],
      ['C4', 12.5],
      ['D4', 13],
      ['E4', 13.5],
      ['D4', 14.5],
      ['C4', 15],
    ],
  },
  {
    id: 'pachelbel',
    title: 'Pachelbel Progression',
    composer: 'J. Pachelbel',
    bpm: 90,
    barLength: 4,
    beats: 16,
    sequence: [
      ['C3', 0],
      ['G3', 0.5],
      ['A3', 1],
      ['E3', 1.5],
      ['F3', 2],
      ['C4', 2.5],
      ['F3', 3],
      ['G3', 3.5],
      ['C3', 4],
      ['G3', 4.5],
      ['A3', 5],
      ['E3', 5.5],
      ['F3', 6],
      ['C4', 6.5],
      ['F3', 7],
      ['G3', 7.5],
      ['A3', 8],
      ['E3', 8.5],
      ['F3', 9],
      ['C4', 9.5],
      ['F3', 10],
      ['G3', 10.5],
      ['C4', 11],
      ['E4', 11.5],
      ['F3', 12],
      ['C4', 12.5],
      ['D4', 13],
      ['A3', 13.5],
      ['G3', 14],
      ['D4', 14.5],
      ['G3', 15],
      ['B3', 15.5],
    ],
  },
];

function envelope(t, duration) {
  const attack = Math.min(0.02, duration * 0.15);
  const release = Math.min(0.2, duration * 0.3);
  if (t < attack) {
    return t / attack;
  }
  if (t > duration - release) {
    return Math.max(0, (duration - t) / release);
  }
  return 1;
}

function createWave(samplesLength) {
  return new Float32Array(samplesLength);
}

function addTone(buffer, frequency, startTime, duration, gain = 0.8, harmonics = [1, 0.3, 0.15]) {
  const startSample = Math.floor(startTime * sampleRate);
  const totalSamples = Math.floor(duration * sampleRate);
  for (let i = 0; i < totalSamples; i += 1) {
    const index = startSample + i;
    if (index >= buffer.length) {
      break;
    }
    const localTime = i / sampleRate;
    const env = envelope(localTime, duration);
    let sample = 0;
    let weight = 0;
    harmonics.forEach((amp, idx) => {
      const harmonic = idx + 1;
      sample += Math.sin(2 * Math.PI * frequency * harmonic * (startTime + localTime)) * amp;
      weight += amp;
    });
    const normalised = weight > 0 ? sample / weight : sample;
    buffer[index] += normalised * gain * env;
  }
}

function normalise(buffer) {
  const max = buffer.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0.001);
  const scale = 1 / max;
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = Math.max(-1, Math.min(1, buffer[i] * scale * 0.8));
  }
}

function toWavData(buffer) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * bytesPerSample;
  const wavBuffer = Buffer.alloc(44 + dataSize);
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(1, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < buffer.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    wavBuffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
  }
  return wavBuffer;
}

async function encodeAudio(inputPath, outputPath, args) {
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', inputPath, ...args, outputPath]);
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with ${code}`));
      }
    });
  });
}

async function writeSample(note, frequency) {
  const buffer = createWave(Math.floor(noteDuration * sampleRate));
  addTone(buffer, frequency, 0, noteDuration, 0.8, [1, 0.3, 0.12]);
  addTone(buffer, frequency * 2, 0, noteDuration * 0.8, 0.2, [1]);
  normalise(buffer);
  const wavPath = resolve(__dirname, '../game/public/assets/audio/tmp', `${note}.wav`);
  await mkdir(dirname(wavPath), { recursive: true });
  await writeFile(wavPath, toWavData(buffer));
  const targetDir = resolve(__dirname, '../game/public/assets/audio/notes');
  await mkdir(targetDir, { recursive: true });
  const oggPath = resolve(targetDir, `${note}.ogg`);
  const mp3Path = resolve(targetDir, `${note}.mp3`);
  await encodeAudio(wavPath, oggPath, ['-c:a', 'libvorbis', '-q:a', '4']);
  await encodeAudio(wavPath, mp3Path, ['-c:a', 'libmp3lame', '-q:a', '4']);
  await rm(wavPath);
}

async function writeTrack(track) {
  const secondsPerBeat = 60 / track.bpm;
  const duration = secondsPerBeat * track.beats;
  const buffer = createWave(Math.floor(duration * sampleRate));
  track.sequence.forEach(([note, offsetBeats]) => {
    const frequency = noteFrequencies[note];
    if (!frequency) {
      return;
    }
    const startTime = offsetBeats * secondsPerBeat;
    addTone(buffer, frequency, startTime, secondsPerBeat * 0.9, 0.65, [1, 0.2, 0.12]);
    addTone(buffer, frequency / 2, startTime, secondsPerBeat * 0.9, 0.2, [1]);
  });
  normalise(buffer);
  const wavPath = resolve(__dirname, '../assets/music/tmp', `${track.id}.wav`);
  await mkdir(dirname(wavPath), { recursive: true });
  await writeFile(wavPath, toWavData(buffer));
  const targetDir = resolve(__dirname, '../game/public/assets/music');
  await mkdir(targetDir, { recursive: true });
  const oggPath = resolve(targetDir, `${track.id}.ogg`);
  const mp3Path = resolve(targetDir, `${track.id}.mp3`);
  await encodeAudio(wavPath, oggPath, ['-c:a', 'libvorbis', '-q:a', '4']);
  await encodeAudio(wavPath, mp3Path, ['-c:a', 'libmp3lame', '-q:a', '4']);
  await rm(wavPath);
}

async function run() {
  await Promise.all(
    Object.entries(noteFrequencies).map(([note, freq]) => writeSample(note, freq)),
  );
  for (const track of tracks) {
    await writeTrack(track);
  }
  const metadata = tracks.map(({ id, title, composer, bpm, barLength }) => ({
    id,
    title,
    composer,
    bpm,
    barLength,
  }));
  const tracksJson = JSON.stringify(metadata, null, 2);
  await writeFile(resolve(__dirname, '../game/public/assets/music/tracks.json'), tracksJson, 'utf8');
  await writeFile(resolve(__dirname, '../game/src/audio/tracks.json'), tracksJson, 'utf8');
}

run().catch((error) => {
  console.error('Failed to generate audio assets', error);
  process.exitCode = 1;
});
