import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  scoreGesture,
  hasUsableReference,
  type GestureFrame,
  type Point3,
} from '../lib/gesture-scoring.ts';

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
  assert.equal(result.passed, false);
});

function mirror(frames: GestureFrame[]): GestureFrame[] {
  return frames.map((item) => ({
    ...item,
    hands: item.hands.map((hand) => ({
      ...hand,
      handedness: hand.handedness === 'Right' ? 'Left' : 'Right',
      landmarks: hand.landmarks.map((point) => ({ ...point, x: 1 - point.x })),
      worldLandmarks: hand.worldLandmarks?.map((point) => ({
        ...point,
        x: -point.x,
      })),
    })),
  }));
}

function sampledSequence(samples: number, duration = 3000): GestureFrame[] {
  return Array.from({ length: samples }, (_, index) =>
    frame((index / (samples - 1)) * duration, (index / (samples - 1)) * 0.3),
  );
}

void test('mirrored dominant hand preserves shape, orientation and movement', () => {
  const result = scoreGesture(sequence(), mirror(sequence()));
  assert.equal(result.overall, 100);
  assert.equal(result.orientation, 100);
  assert.equal(result.handshape, 100);
  assert.equal(result.movement, 100);
});

void test('two-hand identity survives confidence and array order changes', () => {
  const left = mirror(sequence(0.2));
  const reference = sequence().map((item, index) => ({
    ...item,
    hands: [item.hands[0], { ...left[index].hands[0], confidence: 0.97 }],
  }));
  const attempt = structuredClone(reference).map((item, index) => ({
    ...item,
    hands: item.hands
      .map((hand, handIndex) => ({
        ...hand,
        confidence: (index + handIndex) % 2 ? 0.96 : 0.99,
      }))
      .reverse(),
  }));
  assert.equal(scoreGesture(reference, attempt).overall, 100);
  assert.equal(scoreGesture(reference, mirror(reference)).overall, 100);
});

void test('same path has the same score across frame rates and durations', () => {
  for (const samples of [8, 24, 45, 90]) {
    for (const duration of [1800, 3000, 4500]) {
      const result = scoreGesture(
        sampledSequence(45),
        sampledSequence(samples, duration),
      );
      assert.equal(result.movement, 100, `${samples} frames / ${duration} ms`);
      assert.equal(result.overall, 100);
    }
  }
});

void test('uneven sampling uses timestamps rather than frame indices', () => {
  const attempt = Array.from({ length: 24 }, (_, index) => {
    const progress = (index / 23) ** 2;
    return frame(progress * 3000, progress * 0.3);
  });
  assert.equal(scoreGesture(sampledSequence(45), attempt).movement, 100);
});

void test('mirrored gesture still passes when the person shifts in the camera', () => {
  const attempt = mirror(sequence()).map((item) => ({
    ...item,
    hands: item.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => ({
        ...point,
        x: point.x + 0.2,
        y: point.y + 0.2,
      })),
    })),
  }));
  const result = scoreGesture(sequence(), attempt);
  assert.ok(result.overall >= 90);
  assert.equal(result.passed, true);
});

void test('wrong palm orientation cannot be compensated by other components', () => {
  const attempt = sequence().map((item) => ({
    ...item,
    hands: item.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => {
        const wrist = hand.landmarks[0];
        return {
          ...point,
          x: wrist.x - (point.x - wrist.x),
          y: wrist.y - (point.y - wrist.y),
        };
      }),
      worldLandmarks: hand.worldLandmarks?.map((point) => ({
        ...point,
        y: -point.y,
        z: -point.z,
      })),
    })),
  }));
  const result = scoreGesture(sequence(), attempt);
  assert.equal(result.passed, false);
  assert.ok(result.overall < 75);
});

void test('stationary hands cannot pass a moving reference', () => {
  const attempt = sampledSequence(45).map((item) => frame(item.timeMs));
  assert.equal(scoreGesture(sampledSequence(45), attempt).passed, false);
});

void test('a longer final hold does not hurt a pose-dominant sign', () => {
  const reference = Array.from({ length: 24 }, (_, index) =>
    frame(index * 80, index < 5 ? index * 0.02 : 0.08),
  );
  const attempt = Array.from({ length: 50 }, (_, index) =>
    frame(index * 80, index < 12 ? (index / 11) * 0.08 : 0.08),
  );
  const result = scoreGesture(reference, attempt);
  assert.ok(result.movement >= 95);
  assert.equal(result.passed, true);
});

void test('continuous motion does not satisfy a held sign', () => {
  const reference = Array.from({ length: 24 }, (_, index) =>
    frame(index * 80, index < 5 ? index * 0.02 : 0.08),
  );
  const attempt = Array.from({ length: 50 }, (_, index) =>
    frame(index * 80, index % 2 ? 0.18 : 0),
  );
  assert.ok(scoreGesture(reference, attempt).movement < 50);
});

void test('low visibility cannot pass even with six perfect frames', () => {
  const attempt = sampledSequence(45).map((item, index) => ({
    ...item,
    hands: index < 6 ? item.hands : [],
  }));
  assert.equal(scoreGesture(sampledSequence(45), attempt).passed, false);
});

void test('missing reference reports a reference problem, not learner failure', () => {
  const result = scoreGesture([], sequence());
  assert.match(result.feedback, /referensi/i);
  assert.equal(result.passed, false);
});

void test('handedness confidence is not treated as landmark accuracy', () => {
  const attempt = sequence().map((item) => ({
    ...item,
    hands: item.hands.map((hand) => ({ ...hand, confidence: 0.51 })),
  }));
  assert.equal(scoreGesture(sequence(), attempt).overall, 100);
  assert.equal(scoreGesture(sequence(), attempt).detectionQuality, 100);
});

void test('two-hand spacing is measured in shared image coordinates', () => {
  const left = mirror(sequence());
  const reference = sequence().map((item, index) => ({
    ...item,
    hands: [item.hands[0], left[index].hands[0]],
  }));
  const shifted = reference.map((item) => ({
    ...item,
    hands: item.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => ({
        ...point,
        x: point.x + 0.15,
      })),
    })),
  }));
  assert.equal(scoreGesture(reference, shifted).coordination, 100);
  const wider = reference.map((item) => ({
    ...item,
    hands: item.hands.map((hand, index) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => ({
        ...point,
        x: point.x + (index ? 0.3 : 0),
      })),
    })),
  }));
  assert.ok(scoreGesture(reference, wider).coordination < 50);
  assert.equal(scoreGesture(reference, wider).passed, false);
});

void test('missing second hand cannot pass a two-hand gesture', () => {
  const reference = sequence().map((item, index) => ({
    ...item,
    hands: [item.hands[0], mirror(sequence())[index].hands[0]],
  }));
  assert.equal(scoreGesture(reference, sequence()).passed, false);
});

void test('reference readiness requires usable, chronological landmarks', () => {
  assert.equal(hasUsableReference(sequence()), true);
  assert.equal(hasUsableReference([]), false);
  assert.equal(hasUsableReference(sequence().slice(0, 5)), false);
  assert.equal(
    hasUsableReference(sequence().map((item) => ({ ...item, timeMs: 0 }))),
    false,
  );
});

void test('setup and rest outside the gesture do not count as detection failure', () => {
  const visible = sequence().map((item) => ({
    ...item,
    timeMs: item.timeMs + 800,
  }));
  const padded = [
    ...Array.from({ length: 10 }, (_, index) => ({
      timeMs: index * 80,
      hands: [],
    })),
    ...visible,
    ...Array.from({ length: 10 }, (_, index) => ({
      timeMs: 2800 + index * 80,
      hands: [],
    })),
  ];
  assert.equal(hasUsableReference(padded), true);
  assert.equal(scoreGesture(padded, sequence()).overall, 100);
  assert.equal(scoreGesture(sequence(), padded).overall, 100);
});

void test('dropouts inside the gesture still count against visibility', () => {
  const attempt = sequence().map((item, index) => ({
    ...item,
    hands: index % 3 ? [] : item.hands,
  }));
  assert.equal(scoreGesture(sequence(), attempt).passed, false);
  assert.ok(scoreGesture(sequence(), attempt).detectionQuality < 60);
});

void test('a brief reference tracking failure is not a learner shape error', () => {
  const reference = sequence().map((item, index) => ({
    ...item,
    hands: index === 8 ? [] : item.hands,
  }));
  const result = scoreGesture(reference, sequence());
  assert.equal(result.overall, 100);
  const dropoutAttempt = scoreGesture(sequence(), reference);
  assert.ok(dropoutAttempt.detectionQuality < 100);
  assert.equal(dropoutAttempt.handshape, 100);
  assert.equal(dropoutAttempt.orientation, 100);
  assert.equal(dropoutAttempt.passed, true);
});

void test('duplicate detection of the same hand cannot turn reference into two-hand sign', () => {
  const reference = sequence().map((item, index) => ({
    ...item,
    hands: index === 8 ? [item.hands[0], item.hands[0]] : item.hands,
  }));
  assert.equal(scoreGesture(reference, sequence()).overall, 100);
});

void test('small landmark jitter does not swamp the movement signal', () => {
  const attempt = sequence().map((item, index) => ({
    ...item,
    hands: item.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => ({
        ...point,
        x: point.x + (index % 2 ? 0.001 : -0.001),
      })),
    })),
  }));
  const result = scoreGesture(sequence(), attempt);
  assert.ok(result.movement >= 90);
  assert.equal(result.passed, true);
});

void test('camera depth estimation does not distort an identical visible hand pose', () => {
  const attempt = sequence().map((item, frameIndex) => ({
    ...item,
    hands: item.hands.map((hand) => ({
      ...hand,
      worldLandmarks: hand.worldLandmarks?.map((point, pointIndex) => ({
        x: point.x * (1.4 + frameIndex * 0.01),
        y: point.y * 0.7,
        z: point.z + Math.sin(pointIndex) * 0.18,
      })),
    })),
  }));
  const result = scoreGesture(sequence(), attempt);
  assert.equal(result.handshape, 100);
  assert.equal(result.orientation, 100);
  assert.equal(result.passed, true);
});

void test('a sustained matching pose is not rejected by preparation frames', () => {
  const attempt = sequence().map((item, index) =>
    index < 16 ? frame(item.timeMs, index * 0.004, 0.2) : item,
  );
  const result = scoreGesture(sequence(), attempt);
  assert.ok(result.handshape >= 90);
  assert.equal(result.passed, true);
});

void test('wrong visible hand direction still fails orientation', () => {
  const attempt = sequence().map((item) => ({
    ...item,
    hands: item.hands.map((hand) => {
      const wrist = hand.landmarks[0];
      return {
        ...hand,
        landmarks: hand.landmarks.map((point) => ({
          ...point,
          x: wrist.x - (point.y - wrist.y),
          y: wrist.y + (point.x - wrist.x),
        })),
      };
    }),
  }));
  const result = scoreGesture(sequence(), attempt);
  assert.ok(result.orientation < 50);
  assert.equal(result.passed, false);
});

void test('invalid landmarks and timestamps produce a finite non-passing score', () => {
  for (const attempt of [
    sequence().map((item) => ({ ...item, timeMs: 0 })),
    sequence().map((item) => ({
      ...item,
      hands: item.hands.map((hand) => ({
        ...hand,
        landmarks: hand.landmarks.map((point) => ({ ...point, x: NaN })),
      })),
    })),
  ]) {
    const result = scoreGesture(sequence(), attempt);
    assert.equal(result.passed, false);
    assert.ok(Number.isFinite(result.overall));
  }
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
