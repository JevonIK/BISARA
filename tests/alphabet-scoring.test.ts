import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { ALPHABET_TEMPLATE_VERSION, allAlphabetLetters, alphabetVideos, type AlphabetLetter } from '../lib/alphabet-data.ts';
import { scoreAlphabetGesture, scoreAlphabetWithAlternatives } from '../lib/alphabet-scoring.ts';
import type { GestureFrame, Point3 } from '../lib/gesture-scoring.ts';

function example(letter: AlphabetLetter): GestureFrame[] {
  const extended = new Set<number>(
    letter === 'A' ? [0] : letter === 'V' ? [1, 2] : letter === 'W' ? [1, 2, 3] : [0, 1, 2, 3, 4],
  );
  return Array.from({ length: 26 }, (_, frameIndex) => {
    const progress = frameIndex / 25;
    const motionX = letter === 'Z' ? (progress < 0.33 ? progress * 0.9 : progress < 0.66 ? 0.3 - (progress - 0.33) * 0.9 : (progress - 0.66) * 0.9) : letter === 'J' ? Math.sin(progress * Math.PI) * 0.14 : 0;
    const motionY = letter === 'Z' ? progress * 0.14 : letter === 'J' ? progress * 0.7 : 0;
    const points: Point3[] = [{ x: 0.45 + motionX, y: 0.68 + motionY, z: 0 }];
    for (let finger = 0; finger < 5; finger++) {
      const baseX = 0.36 + finger * 0.045 + motionX;
      const baseY = 0.53 + motionY;
      const length = extended.has(finger) ? 0.18 : 0.05;
      for (let joint = 0; joint < 4; joint++) {
        points.push({ x: baseX + (finger === 0 ? -joint * 0.02 : 0), y: baseY - length * joint / 3, z: 0 });
      }
    }
    return {
      timeMs: frameIndex * 66,
      hands: [{ landmarks: points, handedness: 'Right', confidence: 0.9 }],
    };
  });
}

for (const letter of allAlphabetLetters) {
  void test(`huruf ${letter} menerima contoh dan tangan sebaliknya`, () => {
    const reference = example(letter);
    const direct = scoreAlphabetGesture(letter, reference, structuredClone(reference));
    assert.equal(direct.passed, true, JSON.stringify(direct));
    const mirrored = reference.map((frame) => ({
      ...frame,
      hands: frame.hands.map((hand) => ({
        ...hand,
        handedness: 'Left',
        landmarks: hand.landmarks.map((point) => ({ ...point, x: 1 - point.x })),
      })),
    }));
    const opposite = scoreAlphabetGesture(letter, reference, mirrored);
    assert.equal(opposite.passed, true, JSON.stringify(opposite));
  });
}

void test('gerakan J dan Z tetap lolos saat diperagakan lebih lambat', () => {
  for (const letter of ['J', 'Z'] as const) {
    const reference = example(letter);
    const slower = reference.flatMap((frame, index) => [
      { ...frame, timeMs: index * 132 },
      { ...frame, timeMs: index * 132 + 66 },
    ]);
    const result = scoreAlphabetGesture(letter, reference, slower);
    assert.equal(result.passed, true, JSON.stringify(result));
  }
});

void test('bentuk lain, tangan tambahan, dan video tanpa tangan tidak dapat lulus', () => {
  const reference = example('V');
  const wrongShape = example('A');
  assert.equal(scoreAlphabetGesture('V', reference, wrongShape).passed, false);
  const twoHands = reference.map((frame) => ({ ...frame, hands: [frame.hands[0], {
    ...frame.hands[0],
    handedness: 'Left',
    landmarks: frame.hands[0].landmarks.map((point) => ({ ...point, x: point.x + 0.3 })),
  }] }));
  assert.equal(scoreAlphabetGesture('V', reference, twoHands).passed, false);
  const noHands = reference.map((frame) => ({ ...frame, hands: [] }));
  assert.equal(scoreAlphabetGesture('V', reference, noHands).assessable, false);
});

type Manifest = {
  version: string;
  frames: Record<string, GestureFrame[]>;
  variants: Record<string, GestureFrame[][]>;
  sourceSha256: Record<string, string>;
};
const manifest = JSON.parse(await readFile(new URL('../public/data/alphabet-templates-v1.json', import.meta.url), 'utf8')) as Manifest;

void test('26 template berasal dari video pilihan dan masing-masing lolos pemeriksaan', async () => {
  assert.equal(manifest.version, ALPHABET_TEMPLATE_VERSION);
  assert.equal(Object.keys(manifest.frames).length, 26);
  assert.equal(Object.values(manifest.variants).reduce((sum, variants) => sum + variants.length, 0), 52);
  for (const { letter, videoSrc } of alphabetVideos) {
    const filename = videoSrc.split('/').at(-1)!;
    const bytes = await readFile(new URL(`../public${videoSrc}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sourceSha256[filename]);
    const frames = manifest.frames[filename];
    assert.ok(frames?.length, `template ${letter} tidak ada`);
    const result = scoreAlphabetGesture(letter, frames, structuredClone(frames));
    assert.equal(result.passed, true, `${letter}: ${JSON.stringify(result)}`);
  }
});

void test('26 contoh lolos dengan tangan bercermin dan perubahan posisi kamera', () => {
  for (const { letter, videoSrc } of alphabetVideos) {
    const frames = manifest.frames[videoSrc.split('/').at(-1)!];
    const mirrored = frames.map((frame) => ({
      ...frame,
      hands: frame.hands.map((hand) => ({
        ...hand,
        handedness: hand.handedness === 'Left' ? 'Right' : 'Left',
        landmarks: hand.landmarks.map((point) => ({ ...point, x: 1 - point.x })),
      })),
    }));
    const moved = frames.map((frame) => ({
      ...frame,
      hands: frame.hands.map((hand) => ({
        ...hand,
        landmarks: hand.landmarks.map((point) => ({
          ...point,
          x: 0.5 + (point.x - 0.5) * 0.85 + 0.05,
          y: 0.5 + (point.y - 0.5) * 0.85 - 0.03,
        })),
      })),
    }));
    assert.equal(scoreAlphabetGesture(letter, frames, mirrored).passed, true, `mirror ${letter}`);
    assert.equal(scoreAlphabetGesture(letter, frames, moved).passed, true, `kamera ${letter}`);
  }
});

void test('deteksi ganda tangan yang sama tidak menggagalkan huruf dua tangan', () => {
  const frames = manifest.frames['f.mp4'];
  const duplicated = frames.map((frame) => frame.hands.length === 2 ? {
    ...frame,
    hands: [...frame.hands, { ...frame.hands[0], landmarks: structuredClone(frame.hands[0].landmarks) }],
  } : frame);
  assert.equal(scoreAlphabetGesture('F', frames, duplicated).passed, true);

  const extraDistinct = frames.map((frame) => frame.hands.length === 2 ? {
    ...frame,
    hands: [...frame.hands, {
      ...frame.hands[0],
      landmarks: frame.hands[0].landmarks.map((point) => ({ ...point, x: point.x + 0.3 })),
    }],
  } : frame);
  assert.equal(scoreAlphabetGesture('F', frames, extraDistinct).assessable, false);
});

void test('26 × 26 contoh: semua contoh sendiri lulus, huruf lain tidak', () => {
  for (const target of alphabetVideos) {
    const targetFrames = manifest.frames[target.videoSrc.split('/').at(-1)!];
    for (const actual of alphabetVideos) {
      const actualFrames = manifest.frames[actual.videoSrc.split('/').at(-1)!];
      const result = scoreAlphabetWithAlternatives(target.letter, targetFrames, actualFrames, manifest);
      assert.equal(result.passed, target.letter === actual.letter,
        `${target.letter} ← ${actual.letter}: ${JSON.stringify(result)}`);
    }
  }
});

void test('setiap huruf mempunyai satu video contoh lokal', async () => {
  assert.equal(alphabetVideos.length, 26);
  for (const { videoSrc, letter } of alphabetVideos) {
    const bytes = await readFile(new URL(`../public${videoSrc}`, import.meta.url));
    assert.ok(bytes.length > 10_000, `video ${letter} tidak tersedia`);
  }
});
