import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pngjs';

const { PNG } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const atlasSize = { width: 512, height: 256 };
const frameSize = 128;

const colors = {
  ebony: { r: 18, g: 18, b: 18, a: 255 },
  ebonySoft: { r: 28, g: 28, b: 31, a: 255 },
  ivory: { r: 250, g: 247, b: 240, a: 255 },
  brass: { r: 193, g: 164, b: 100, a: 255 },
  brassSoft: { r: 216, g: 186, b: 122, a: 255 },
  brassHighlight: { r: 255, g: 210, b: 127, a: 255 },
  teal: { r: 30, g: 138, b: 158, a: 255 },
  tealBright: { r: 42, g: 169, b: 185, a: 255 },
  royalRed: { r: 156, g: 28, b: 43, a: 255 },
  royalRedBright: { r: 199, g: 47, b: 60, a: 255 },
  sourShadow: { r: 52, g: 38, b: 64, a: 224 },
  dustBrown: { r: 68, g: 36, b: 24, a: 200 },
  dustFleck: { r: 68, g: 36, b: 24, a: 160 },
  highlight: { r: 255, g: 210, b: 127, a: 220 },
  shadow: { r: 7, g: 7, b: 8, a: 160 },
  transparentGlow: { r: 42, g: 169, b: 185, a: 140 },
  spark: { r: 255, g: 210, b: 127, a: 255 },
  sparkTrail: { r: 255, g: 210, b: 127, a: 120 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ri = (value) => Math.round(value);

function createPng(width, height) {
  return new PNG({ width, height, colorType: 6 });
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }
  const idx = (png.width * y + x) << 2;
  const srcA = (color.a ?? 255) / 255;
  const dstA = png.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) {
    return;
  }
  const srcR = (color.r ?? 0) / 255;
  const srcG = (color.g ?? 0) / 255;
  const srcB = (color.b ?? 0) / 255;
  const dstR = png.data[idx] / 255;
  const dstG = png.data[idx + 1] / 255;
  const dstB = png.data[idx + 2] / 255;
  const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
  const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
  const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;
  png.data[idx] = clamp(Math.round(outR * 255), 0, 255);
  png.data[idx + 1] = clamp(Math.round(outG * 255), 0, 255);
  png.data[idx + 2] = clamp(Math.round(outB * 255), 0, 255);
  png.data[idx + 3] = clamp(Math.round(outA * 255), 0, 255);
}

function fillRect(png, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(png, px, py, color);
    }
  }
}

function fillRectGradient(png, x, y, width, height, colorTop, colorBottom) {
  for (let py = 0; py < height; py += 1) {
    const t = py / Math.max(1, height - 1);
    const color = {
      r: Math.round(colorTop.r * (1 - t) + colorBottom.r * t),
      g: Math.round(colorTop.g * (1 - t) + colorBottom.g * t),
      b: Math.round(colorTop.b * (1 - t) + colorBottom.b * t),
      a: Math.round((colorTop.a ?? 255) * (1 - t) + (colorBottom.a ?? 255) * t),
    };
    for (let px = x; px < x + width; px += 1) {
      setPixel(png, px, y + py, color);
    }
  }
}

function fillCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let py = -radius; py <= radius; py += 1) {
    for (let px = -radius; px <= radius; px += 1) {
      if (px * px + py * py <= r2) {
        setPixel(png, cx + px, cy + py, color);
      }
    }
  }
}

function fillEllipse(png, cx, cy, rx, ry, color) {
  for (let py = -ry; py <= ry; py += 1) {
    for (let px = -rx; px <= rx; px += 1) {
      if ((px * px) / (rx * rx) + (py * py) / (ry * ry) <= 1) {
        setPixel(png, cx + px, cy + py, color);
      }
    }
  }
}

function fillQuarterCircle(png, cx, cy, radius, quadrant, color) {
  const r2 = radius * radius;
  const xDir = quadrant === 0 || quadrant === 3 ? -1 : 1;
  const yDir = quadrant < 2 ? -1 : 1;
  for (let py = 0; py <= radius; py += 1) {
    for (let px = 0; px <= radius; px += 1) {
      if (px * px + py * py <= r2) {
        const targetX = cx + px * xDir;
        const targetY = cy + py * yDir;
        setPixel(png, targetX, targetY, color);
      }
    }
  }
}

function fillRoundedRect(png, x, y, width, height, radius, color) {
  const r = Math.min(Math.round(radius), Math.floor(width / 2), Math.floor(height / 2));
  fillRect(png, x + r, y, width - 2 * r, height, color);
  fillRect(png, x, y + r, r, height - 2 * r, color);
  fillRect(png, x + width - r, y + r, r, height - 2 * r, color);
  fillQuarterCircle(png, x + r - 1, y + r - 1, r, 0, color);
  fillQuarterCircle(png, x + width - r, y + r - 1, r, 1, color);
  fillQuarterCircle(png, x + r - 1, y + height - r, r, 3, color);
  fillQuarterCircle(png, x + width - r, y + height - r, r, 2, color);
}

function drawPianoFrame(png, offsetX, offsetY, options) {
  const { shine = colors.brassSoft, stroke = colors.brass } = options;
  fillRoundedRect(png, offsetX + 12, offsetY + 34, 96, 60, 18, colors.ebonySoft);
  fillRoundedRect(png, offsetX + 12, offsetY + 34, 96, 60, 18, { ...shine, a: 60 });
  fillRoundedRect(png, offsetX + 22, offsetY + 44, 76, 18, 6, colors.ivory);
  const keyOffsets = [0, 10, 20, 30, 40, 50, 60, 70];
  keyOffsets.forEach((kx) => {
    fillRoundedRect(png, offsetX + 24 + kx, offsetY + 46, 6, 12, 2, colors.ebony);
  });
  fillRoundedRect(png, offsetX + 22, offsetY + 70, 76, 12, 6, colors.brassSoft);
  fillRoundedRect(png, offsetX + 22, offsetY + 70, 76, 12, 6, { ...colors.brassHighlight, a: 80 });
  fillEllipse(png, offsetX + 34, offsetY + 108 + (options.shadowOffset ?? 0), 14, 6, { ...colors.shadow, a: 180 });
  fillEllipse(png, offsetX + 92, offsetY + 108 + (options.shadowOffset ?? 0), 14, 6, { ...colors.shadow, a: 180 });
  fillRoundedRect(png, offsetX + 12, offsetY + 34, 96, 60, 18, { ...stroke, a: 120 });
}

function drawGoodNote(png, offsetX, offsetY) {
  fillEllipse(png, offsetX + 64, offsetY + 60, 38, 40, { ...colors.transparentGlow, a: 90 });
  fillCircle(png, offsetX + 64, offsetY + 60, 40, colors.teal);
  fillCircle(png, offsetX + 64, offsetY + 52, 24, colors.tealBright);
  fillCircle(png, offsetX + 64, offsetY + 44, 14, colors.ivory);
  fillRoundedRect(png, offsetX + 60, offsetY + 44, 8, 44, 4, colors.ivory);
  fillEllipse(png, offsetX + 64, offsetY + 108, 24, 10, { ...colors.shadow, a: 130 });
}

function drawSourNote(png, offsetX, offsetY) {
  fillCircle(png, offsetX + 60, offsetY + 64, 38, { ...colors.dustBrown, a: 180 });
  fillCircle(png, offsetX + 52, offsetY + 52, 22, { ...colors.dustBrown, a: 220 });
  fillCircle(png, offsetX + 72, offsetY + 76, 18, { ...colors.dustFleck, a: 200 });
  fillRoundedRect(png, offsetX + 52, offsetY + 34, 16, 44, 6, colors.sourShadow);
  fillRoundedRect(png, offsetX + 46, offsetY + 54, 32, 12, 6, colors.sourShadow);
}

function drawPedalToken(png, offsetX, offsetY) {
  fillRoundedRect(png, offsetX + 30, offsetY + 44, 76, 48, 18, colors.brassSoft);
  fillRoundedRect(png, offsetX + 30, offsetY + 44, 76, 48, 18, { ...colors.brassHighlight, a: 90 });
  fillRoundedRect(png, offsetX + 38, offsetY + 54, 60, 14, 7, { ...colors.royalRed, a: 200 });
  fillRoundedRect(png, offsetX + 52, offsetY + 70, 32, 14, 6, colors.shadow);
}

function drawRestToken(png, offsetX, offsetY) {
  fillRoundedRect(png, offsetX + 36, offsetY + 48, 68, 52, 20, colors.royalRed);
  fillRoundedRect(png, offsetX + 36, offsetY + 48, 68, 52, 20, { ...colors.royalRedBright, a: 120 });
  const points = [
    [offsetX + 52, offsetY + 72],
    [offsetX + 64, offsetY + 58],
    [offsetX + 86, offsetY + 58],
    [offsetX + 92, offsetY + 76],
    [offsetX + 84, offsetY + 80],
    [offsetX + 72, offsetY + 70],
    [offsetX + 64, offsetY + 86],
    [offsetX + 58, offsetY + 104],
    [offsetX + 48, offsetY + 100],
    [offsetX + 58, offsetY + 78],
  ];
  points.forEach(([px, py]) => fillCircle(png, px, py, 4, colors.ivory));
  fillEllipse(png, offsetX + 72, offsetY + 108, 24, 10, { ...colors.shadow, a: 120 });
}

function drawSpark(png, offsetX, offsetY) {
  const cx = offsetX + 64;
  const cy = offsetY + 64;
  const arms = [
    [0, -28],
    [0, 28],
    [-28, 0],
    [28, 0],
    [-18, -18],
    [18, 18],
    [18, -18],
    [-18, 18],
  ];
  arms.forEach(([dx, dy]) => {
    fillRoundedRect(png, cx + dx - 4, cy + dy - 12, 8, 24, 4, colors.spark);
  });
  fillCircle(png, cx, cy, 18, colors.spark);
  fillCircle(png, cx, cy, 24, colors.sparkTrail);
}

function createAtlas() {
  const atlas = createPng(atlasSize.width, atlasSize.height);
  drawPianoFrame(atlas, 8, 16, { shadowOffset: 0, stroke: colors.brass });
  drawPianoFrame(atlas, 136, 20, { shadowOffset: 4, stroke: colors.brassHighlight });
  drawPianoFrame(atlas, 264, 28, { shadowOffset: -2, stroke: colors.royalRedBright });
  drawGoodNote(atlas, 384, 0);
  drawSourNote(atlas, 0, 128);
  drawPedalToken(atlas, 128, 128);
  drawRestToken(atlas, 256, 128);
  drawSpark(atlas, 384, 128);
  return atlas;
}

function frameEntry(name, col, row) {
  return {
    frame: {
      x: col * frameSize,
      y: row * frameSize,
      w: frameSize,
      h: frameSize,
    },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: frameSize, h: frameSize },
    sourceSize: { w: frameSize, h: frameSize },
    pivot: { x: 0.5, y: 0.5 },
  };
}

const atlasFrames = {
  player_idle_0: frameEntry('player_idle_0', 0, 0),
  player_idle_1: frameEntry('player_idle_1', 1, 0),
  player_hit: frameEntry('player_hit', 2, 0),
  note_good: frameEntry('note_good', 3, 0),
  note_sour: frameEntry('note_sour', 0, 1),
  note_pedal: frameEntry('note_pedal', 1, 1),
  note_rest: frameEntry('note_rest', 2, 1),
  spark: frameEntry('spark', 3, 1),
};

function createBackground(width, height, layers) {
  const png = createPng(width, height);
  layers.forEach((layer) => {
    layer(png, width, height);
  });
  return png;
}

function drawBackgroundLayers() {
  const width = 1280;
  const height = 720;
  const back = createBackground(width, height, [
    (png) => fillRectGradient(png, 0, 0, width, height, { r: 16, g: 26, b: 48, a: 255 }, { r: 7, g: 7, b: 8, a: 255 }),
    (png) => fillEllipse(png, ri(width / 2), ri(height * 0.2), ri(width * 0.45), ri(height * 0.35), {
      r: 40,
      g: 45,
      b: 70,
      a: 60,
    }),
    (png) => {
      for (let i = 0; i < 6; i += 1) {
        const cx = ri((width / 5) * i + 80);
        fillRoundedRect(png, cx - 90, ri(height * 0.65), 180, 60, 22, { r: 28, g: 28, b: 31, a: 230 });
      }
    },
  ]);
  const mid = createBackground(width, height, [
    (png) => fillRectGradient(png, 0, 0, width, height, { r: 22, g: 18, b: 28, a: 255 }, { r: 14, g: 12, b: 18, a: 255 }),
    (png) => {
      const x = ri(width * 0.1);
      const y = ri(height * 0.55);
      const w = ri(width * 0.8);
      const h = ri(height * 0.35);
      fillRoundedRect(png, x, y, w, h, 30, { r: 32, g: 30, b: 40, a: 255 });
      fillRoundedRect(png, x, y, w, h, 30, { r: 90, g: 70, b: 40, a: 60 });
    },
    (png) => {
      const step = width / 6;
      for (let i = 0; i <= 6; i += 1) {
        fillRoundedRect(
          png,
          ri(width * 0.1 + i * step - 6),
          ri(height * 0.55),
          12,
          ri(height * 0.35),
          6,
          { r: 25, g: 20, b: 30, a: 220 },
        );
      }
    },
  ]);
  const front = createBackground(width, height, [
    (png) => fillRectGradient(png, 0, 0, width, height, { r: 12, g: 12, b: 14, a: 255 }, { r: 7, g: 7, b: 8, a: 255 }),
    (png) => {
      fillRoundedRect(png, 0, ri(height * 0.75), width, ri(height * 0.25), 0, { r: 18, g: 18, b: 18, a: 255 });
      fillRoundedRect(
        png,
        ri(width * 0.25),
        ri(height * 0.68),
        ri(width * 0.5),
        ri(height * 0.12),
        22,
        { r: 193, g: 164, b: 100, a: 140 },
      );
    },
    (png) => {
      for (let i = 0; i < 5; i += 1) {
        const x = ri((width / 4) * i + width * 0.05);
        fillEllipse(png, x + 60, ri(height * 0.78), 60, 16, { r: 7, g: 7, b: 8, a: 200 });
        fillRoundedRect(png, x + 40, ri(height * 0.66), 40, 36, 12, { r: 156, g: 28, b: 43, a: 200 });
      }
    },
  ]);
  const vignette = createBackground(width, height, [
    (png) => {
      const centerX = width / 2;
      const centerY = height * 0.55;
      const maxR = Math.max(width, height) * 0.6;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = clamp((dist - maxR * 0.5) / (maxR * 0.5), 0, 1);
          const alpha = Math.round(t * 180);
          setPixel(png, x, y, { r: 7, g: 7, b: 8, a: alpha });
        }
      }
    },
  ]);
  return { back, mid, front, vignette };
}

async function writePng(png, targetPath) {
  await mkdir(dirname(targetPath), { recursive: true });
  await new Promise((resolvePromise, reject) => {
    png
      .pack()
      .pipe(createWriteStream(targetPath))
      .on('finish', resolvePromise)
      .on('error', reject);
  });
}

async function run() {
  const atlas = createAtlas();
  const atlasPath = resolve(__dirname, '../game/public/assets/atlas/workshop_atlas.png');
  await writePng(atlas, atlasPath);
  const atlasJson = {
    frames: atlasFrames,
    meta: {
      image: 'workshop_atlas.png',
      scale: '1',
      format: 'RGBA8888',
      size: { w: atlasSize.width, h: atlasSize.height },
    },
  };
  await writeFile(
    resolve(__dirname, '../game/public/assets/atlas/workshop_atlas.json'),
    JSON.stringify(atlasJson, null, 2),
    'utf8',
  );

  const backgrounds = drawBackgroundLayers();
  await writePng(
    backgrounds.back,
    resolve(__dirname, '../game/public/assets/atlas/background_back.png'),
  );
  await writePng(
    backgrounds.mid,
    resolve(__dirname, '../game/public/assets/atlas/background_mid.png'),
  );
  await writePng(
    backgrounds.front,
    resolve(__dirname, '../game/public/assets/atlas/background_front.png'),
  );
  await writePng(
    backgrounds.vignette,
    resolve(__dirname, '../game/public/assets/atlas/background_vignette.png'),
  );
}

run().catch((error) => {
  console.error('Failed to generate art assets', error);
  process.exitCode = 1;
});
