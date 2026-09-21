import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createObjectCoverProjection } from '../lib/landmark-overlay.ts';

void test('landmark projection follows vertical crop from a 4:3 camera into 16:9', () => {
  const project = createObjectCoverProjection(640, 480, 640, 360);

  assert.deepEqual(project({ x: 0.5, y: 0.5 }), { x: 320, y: 180 });
  assert.deepEqual(project({ x: 0, y: 0 }), { x: 0, y: -60 });
  assert.deepEqual(project({ x: 1, y: 1 }), { x: 640, y: 420 });
});

void test('landmark projection follows horizontal crop from 16:9 into a square panel', () => {
  const project = createObjectCoverProjection(1280, 720, 400, 400);

  assert.deepEqual(project({ x: 0.5, y: 0.5 }), { x: 200, y: 200 });
  assert.ok(project({ x: 0, y: 0 }).x < 0);
  assert.ok(project({ x: 1, y: 1 }).x > 400);
});
