import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  getSign,
  getSigns,
  signIds,
  SIGN_VIDEO_VERSION,
} from '../lib/curriculum-data.ts';
import {
  getRequiredHandCount,
  hasUsableReference,
  scoreGesture,
  scoreGestureWithAlternatives,
  type GestureFrame,
} from '../lib/gesture-scoring.ts';

type Manifest = {
  version: string;
  frames: Record<string, GestureFrame[]>;
  sourceSha256: Record<string, string>;
};
const manifest = JSON.parse(
  await readFile(
    new URL('../public/data/gesture-templates-v1.json', import.meta.url),
    'utf8',
  ),
) as Manifest;

function reference(id: (typeof signIds)[number]) {
  const filename = getSign(id).videoSrc.split('/').at(-1)!;
  return manifest.frames[filename];
}

void test('all 32 stored references match the current videos and remain usable', async () => {
  assert.equal(manifest.version, SIGN_VIDEO_VERSION);
  assert.equal(Object.keys(manifest.frames).length, signIds.length);
  for (const id of signIds) {
    const videoSrc = getSign(id).videoSrc;
    const filename = videoSrc.split('/').at(-1)!;
    const video = await readFile(
      new URL(`../public${videoSrc}`, import.meta.url),
    );
    assert.equal(
      createHash('sha256').update(video).digest('hex'),
      manifest.sourceSha256[filename],
      `${id}: video berubah tanpa memperbarui landmark`,
    );
    const frames = reference(id);
    assert.ok(frames && hasUsableReference(frames), id);
    assert.equal(scoreGesture(frames, frames).passed, true, id);
  }
});

void test('all 32 signs tolerate small landmark jitter', () => {
  for (const id of signIds) {
    const frames = reference(id);
    const attempt = frames.map((frame, frameIndex) => ({
      timeMs: frame.timeMs,
      hands: frame.hands.map((hand, handIndex) => ({
        ...hand,
        landmarks: hand.landmarks.map((point, pointIndex) => ({
          ...point,
          x:
            point.x +
            Math.sin(frameIndex * 17 + pointIndex * 3 + handIndex) * 0.001,
          y:
            point.y +
            Math.cos(frameIndex * 13 + pointIndex * 7 + handIndex) * 0.001,
        })),
      })),
    }));
    assert.equal(
      scoreGesture(frames, attempt).passed,
      true,
      `${id}: a small tracking fluctuation should not fail the correct sign`,
    );
  }
});

void test('all four two-hand signs reject a changed second hand', () => {
  for (const id of ['motor', 'bagaimana', 'teman', 'rumah'] as const) {
    const frames = reference(id);
    assert.equal(getRequiredHandCount(frames), 2, id);
    const attempt = structuredClone(frames);
    for (const frame of attempt) {
      if (frame.hands.length !== 2) continue;
      const hand = frame.hands[1];
      for (const finger of [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [17, 18, 19, 20],
      ]) {
        const base = hand.landmarks[finger[0]];
        for (const pointIndex of finger.slice(1)) {
          const point = hand.landmarks[pointIndex];
          point.x = base.x + (point.x - base.x) * 0.15;
          point.y = base.y + (point.y - base.y) * 0.15;
        }
      }
    }
    const result = scoreGesture(frames, attempt);
    assert.equal(result.passed, false, `${id}: ${JSON.stringify(result)}`);
  }
});

void test('two-hand signs reject a copied or stationary second hand', () => {
  for (const id of ['motor', 'bagaimana', 'teman', 'rumah'] as const) {
    const frames = reference(id);
    const duplicate = structuredClone(frames);
    const frozen = structuredClone(frames);
    const firstSecondWrist = frozen.find((frame) => frame.hands.length === 2)!
      .hands[1].landmarks[0];
    for (const frame of duplicate) {
      if (frame.hands.length !== 2) continue;
      const [first, second] = frame.hands;
      const dx = second.landmarks[0].x - first.landmarks[0].x;
      const dy = second.landmarks[0].y - first.landmarks[0].y;
      second.landmarks = first.landmarks.map((point) => ({
        ...point,
        x: point.x + dx,
        y: point.y + dy,
      }));
    }
    for (const frame of frozen) {
      if (frame.hands.length !== 2) continue;
      const second = frame.hands[1];
      const dx = firstSecondWrist.x - second.landmarks[0].x;
      const dy = firstSecondWrist.y - second.landmarks[0].y;
      second.landmarks = second.landmarks.map((point) => ({
        ...point,
        x: point.x + dx,
        y: point.y + dy,
      }));
    }
    assert.equal(scoreGesture(frames, duplicate).passed, false, `${id}: copy`);
    assert.equal(scoreGesture(frames, frozen).passed, false, `${id}: frozen`);
  }
});

void test('a different word from another mission is rejected by vocabulary comparison', () => {
  const expected = reference('pagi');
  const performed = reference('siang');
  const alternatives = getSigns(signIds)
    .filter((sign) => sign.id !== 'pagi')
    .map((sign) => ({ label: sign.label, frames: reference(sign.id) }));
  assert.equal(scoreGesture(expected, performed).passed, true);
  assert.equal(
    scoreGestureWithAlternatives(expected, performed, alternatives).passed,
    false,
  );
  assert.equal(
    scoreGestureWithAlternatives(expected, expected, alternatives).passed,
    true,
  );
});

void test('Siapa rejects a rock-like hand even with the correct wrist movement', () => {
  const frames = reference('siapa');
  const attempt = structuredClone(frames);
  for (const frame of attempt) {
    for (const hand of frame.hands) {
      for (const tip of [4, 12, 16]) {
        const base = hand.landmarks[tip - 3];
        for (const pointIndex of [tip - 1, tip]) {
          const point = hand.landmarks[pointIndex];
          point.x = base.x + (point.x - base.x) * 0.12;
          point.y = base.y + (point.y - base.y) * 0.12;
        }
      }
    }
  }
  const score = scoreGesture(frames, attempt);
  assert.equal(score.passed, false, JSON.stringify(score));
  assert.ok(score.handshape < 75, JSON.stringify(score));
});
