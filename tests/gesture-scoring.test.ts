import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  scoreGesture,
  type GestureFrame,
  type Point3,
} from '@/lib/gesture-scoring';

function frame(time: number, movementX = 0, deformation = 0): GestureFrame {
  const landmarks: Point3[] = Array.from({ length: 21 }, (_, index) => ({
    x: 0.48 + movementX + (index % 4) * 0.018 + (index === 8 ? deformation : 0),
    y: 0.7 - Math.floor(index / 4) * 0.045,
    z: -index * 0.002,
  }));
  landmarks[0] = { x: 0.5 + movementX, y: 0.72, z: 0 };
  landmarks[5] = { x: 0.54 + movementX, y: 0.61, z: -0.01 };
  landmarks[9] = { x: 0.5 + movementX, y: 0.58, z: -0.015 };
  landmarks[17] = { x: 0.44 + movementX, y: 0.62, z: -0.005 };
  return {
    timeMs: time,
    hands: [
      {
        landmarks,
        worldLandmarks: landmarks,
        handedness: 'Right',
        confidence: 0.98,
      },
    ],
  };
}

function sequence(deformation = 0, direction = 1) {
  return Array.from({ length: 24 }, (_, index) =>
    frame(index * 80, direction * index * 0.004, deformation),
  );
}

void test('identical temporal gestures receive a near-perfect score', () => {
  const result = scoreGesture(sequence(), sequence());
  assert.ok(result.overall >= 99);
  assert.equal(result.passed, true);
});

void test('finger deformation lowers handshape and total score', () => {
  const baseline = scoreGesture(sequence(), sequence());
  const deformed = scoreGesture(sequence(), sequence(0.2));
  assert.ok(deformed.handshape < baseline.handshape);
  assert.ok(deformed.overall < baseline.overall);
});

void test('reversed trajectory lowers movement score', () => {
  const result = scoreGesture(sequence(), sequence(0, -1));
  assert.ok(result.movement < 80);
});

void test('insufficient visibility cannot pass', () => {
  const attempt: GestureFrame[] = Array.from({ length: 20 }, (_, index) => ({
    timeMs: index * 80,
    hands: index < 3 ? sequence()[index].hands : [],
  }));
  const result = scoreGesture(sequence(), attempt);
  assert.equal(result.passed, false);
  assert.equal(result.overall, 0);
  assert.ok(result.detectionQuality < 20);
});
