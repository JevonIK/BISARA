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
  smoothLiveHandObservations,
  type GestureFrame,
} from '../lib/gesture-scoring.ts';
import {
  getPracticePreviewVideoUrl,
  selectReferenceWindow,
} from '../lib/reference-window.ts';

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
  return selectReferenceWindow(filename, manifest.frames[filename]);
}

void test('Keluarga reference starts at the performed sign, after setup', () => {
  const frames = reference('keluarga');
  assert.equal(frames[0].timeMs, 528);
  assert.equal(frames.at(-1)?.timeMs, 1122);
  const attempt = structuredClone(frames);
  assert.equal(scoreGesture(frames, attempt).passed, true);
});

void test('Keluarga practice loops the same excerpt as the checker', async () => {
  const source = getSign('keluarga').videoSrc;
  const preview = getPracticePreviewVideoUrl(`${source}?v=test`);
  assert.ok(preview.endsWith('signer2_label26_sample3-practice.mp4?v=test'));
  assert.notEqual(preview, `${source}?v=test`);
  const bytes = await readFile(
    new URL(`../public${preview.split('?')[0]}`, import.meta.url),
  );
  assert.ok(bytes.byteLength > 1000);
});

void test('Keluarga accepts one complete articulation cycle', () => {
  const frames = reference('keluarga');
  const oneCycle = frames.slice(0, -1);
  const correct = scoreGesture(frames, oneCycle);
  assert.equal(correct.passed, true, JSON.stringify(correct));
});

void test('Kapan tolerates the trajectory uncertainty of its tiny reference hand', () => {
  const frames = reference('kapan');
  const attempt = structuredClone(frames).map((frame, index) => {
    const progress = index / Math.max(1, frames.length - 1);
    const deltaX = Math.sin(progress * Math.PI * 2) * 0.04 + 0.24;
    const deltaY = Math.sin(progress * Math.PI * 3) * 0.04;
    return {
      ...frame,
      hands: frame.hands.map((hand) => {
        const transform = (points: typeof hand.landmarks) => {
          const wrist = points[0];
          return points.map((point) => ({
            ...point,
            x: wrist.x + (point.x - wrist.x) * 0.45 + deltaX,
            y: wrist.y + (point.y - wrist.y) * 0.75 + deltaY,
          }));
        };
        return {
          ...hand,
          landmarks: transform(hand.landmarks),
          worldLandmarks: hand.worldLandmarks
            ? transform(hand.worldLandmarks)
            : undefined,
        };
      }),
    };
  });
  const result = scoreGesture(frames, attempt);
  assert.ok(result.movement >= 65, JSON.stringify(result));
  assert.equal(result.orientationAssessable, false, JSON.stringify(result));
  assert.equal(
    result.handshapeEvidence?.requiredMatchingFrameRatio,
    0,
    JSON.stringify(result),
  );
  assert.ok(result.overall >= 75, JSON.stringify(result));
  assert.equal(result.passed, true, JSON.stringify(result));
});

void test('Kapan still rejects a stationary hand', () => {
  const frames = reference('kapan');
  const visible = frames.filter((frame) => frame.hands.length);
  const heldFrame = visible[Math.floor(visible.length / 2)];
  const attempt = visible.map((frame) => ({
    ...structuredClone(heldFrame),
    timeMs: frame.timeMs,
  }));
  const result = scoreGesture(frames, attempt);
  assert.equal(result.movement, 0, JSON.stringify(result));
  assert.equal(result.passed, false, JSON.stringify(result));
  assert.equal(result.criticalMismatch, 'movement', JSON.stringify(result));
});

void test('Di mana uses degraded-reference recovery without weakening Apa', () => {
  const diMana = scoreGesture(reference('di-mana'), reference('di-mana'));
  const apa = scoreGesture(reference('apa'), reference('apa'));
  assert.equal(diMana.orientationAssessable, false, JSON.stringify(diMana));
  assert.equal(
    diMana.handshapeEvidence?.requiredMatchingFrameRatio,
    0,
    JSON.stringify(diMana),
  );
  assert.equal(apa.orientationAssessable, true, JSON.stringify(apa));
  assert.ok(
    (apa.handshapeEvidence?.requiredMatchingFrameRatio ?? 0) > 0,
    JSON.stringify(apa),
  );
});

void test('degraded Di mana recovery cannot unfairly veto a valid Apa score', () => {
  const apa = reference('apa');
  const diMana = reference('di-mana');
  const degradedAlternative = scoreGesture(diMana, apa);
  assert.ok(
    degradedAlternative.overall >
      (degradedAlternative.comparisonScore ?? degradedAlternative.overall),
    JSON.stringify(degradedAlternative),
  );

  const target = {
    ...scoreGesture(apa, apa),
    overall: 84,
    comparisonScore: 84,
  };
  const result = scoreGestureWithAlternatives(
    apa,
    apa,
    [{ label: 'Di mana', frames: diMana }],
    target,
  );
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.confusableWith, null, JSON.stringify(result));
});

void test('specialized Keluarga movement cannot unfairly veto a valid Mengapa score', () => {
  const mengapa = reference('mengapa');
  const keluarga = reference('keluarga');
  const specializedAlternative = scoreGesture(keluarga, mengapa);
  assert.equal(
    specializedAlternative.movementMode,
    'palm',
    JSON.stringify(specializedAlternative),
  );
  assert.ok(
    specializedAlternative.overall >
      (specializedAlternative.comparisonScore ??
        specializedAlternative.overall),
    JSON.stringify(specializedAlternative),
  );

  const target = {
    ...scoreGesture(mengapa, mengapa),
    overall: 78,
    comparisonScore: 78,
  };
  const result = scoreGestureWithAlternatives(
    mengapa,
    mengapa,
    [{ label: 'Keluarga', frames: keluarga }],
    target,
  );
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.confusableWith, null, JSON.stringify(result));
});

void test('Di mana still rejects a stationary hand', () => {
  const frames = reference('di-mana');
  const visible = frames.filter((frame) => frame.hands.length);
  const heldFrame = visible[Math.floor(visible.length / 2)];
  const attempt = visible.map((frame) => ({
    ...structuredClone(heldFrame),
    timeMs: frame.timeMs,
  }));
  const result = scoreGesture(frames, attempt);
  assert.equal(result.movement, 0, JSON.stringify(result));
  assert.equal(result.passed, false, JSON.stringify(result));
  assert.equal(result.criticalMismatch, 'movement', JSON.stringify(result));
});

void test('Keluarga accepts a complete sweep performed three times slower', () => {
  const frames = reference('keluarga');
  const slower = frames.flatMap((frame, index) =>
    [0, 1, 2].map((repeat) => ({
      ...frame,
      timeMs: (index * 3 + repeat) * 66,
    })),
  );
  const result = scoreGesture(frames, slower);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.movement >= 70, JSON.stringify(result));
});

void test('Keluarga finger movement is not tied to one wrist angle', () => {
  const frames = reference('keluarga');
  const angle = (50 * Math.PI) / 180;
  const rotated = frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => {
      const wrist = hand.landmarks[0];
      return {
        ...hand,
        landmarks: hand.landmarks.map((point) => {
          const x = point.x - wrist.x;
          const y = point.y - wrist.y;
          return {
            ...point,
            x: wrist.x + x * Math.cos(angle) - y * Math.sin(angle),
            y: wrist.y + x * Math.sin(angle) + y * Math.cos(angle),
          };
        }),
      };
    }),
  }));
  const result = scoreGesture(frames, rotated);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.movement >= 70, JSON.stringify(result));
});

void test('Keluarga accepts the opposite signing hand', () => {
  const frames = reference('keluarga');
  const result = scoreGesture(frames, mirrorDominantHand(frames));
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.movement >= 70, JSON.stringify(result));
});

function scaleKeluargaPalmSweep(frames: GestureFrame[], factor: number) {
  const palmAngle = (hand: GestureFrame['hands'][number]) =>
    Math.atan2(
      hand.landmarks[5].y - hand.landmarks[17].y,
      hand.landmarks[5].x - hand.landmarks[17].x,
    );
  const startingAngle = palmAngle(frames[0].hands[0]);
  return frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => {
      const wrist = hand.landmarks[0];
      const rotation = (factor - 1) * (palmAngle(hand) - startingAngle);
      return {
        ...hand,
        landmarks: hand.landmarks.map((point) => {
          const x = point.x - wrist.x;
          const y = point.y - wrist.y;
          return {
            ...point,
            x: wrist.x + x * Math.cos(rotation) - y * Math.sin(rotation),
            y: wrist.y + x * Math.sin(rotation) + y * Math.cos(rotation),
          };
        }),
      };
    }),
  }));
}

void test('Keluarga accepts a smaller but complete wrist sweep', () => {
  const frames = reference('keluarga');
  const result = scoreGesture(frames, scaleKeluargaPalmSweep(frames, 0.55));
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.movement >= 70, JSON.stringify(result));
});

void test('Keluarga accepts straight fingers seen with shorter projected lengths', () => {
  const frames = reference('keluarga');
  const foreshortened = frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => {
      const landmarks = structuredClone(hand.landmarks);
      for (const finger of [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [17, 18, 19, 20],
      ]) {
        const base = landmarks[finger[0]];
        for (const index of finger.slice(1)) {
          landmarks[index].x = base.x + (landmarks[index].x - base.x) * 0.7;
          landmarks[index].y = base.y + (landmarks[index].y - base.y) * 0.7;
        }
      }
      return { ...hand, landmarks };
    }),
  }));
  const result = scoreGesture(frames, foreshortened);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.handshape >= 75, JSON.stringify(result));
});

void test('Keluarga requires the wrist sweep rather than just the finger pose', () => {
  const frames = reference('keluarga');
  for (const factor of [0, -1]) {
    const result = scoreGesture(frames, scaleKeluargaPalmSweep(frames, factor));
    assert.equal(result.passed, false, JSON.stringify(result));
    assert.ok(result.movement < 70, JSON.stringify(result));
  }
});

void test('Keluarga finger articulation survives live camera smoothing', () => {
  const frames = reference('keluarga');
  let previousHands: GestureFrame['hands'] = [];
  const cameraFrames = frames.map((frame) => {
    const hands = smoothLiveHandObservations(frame.hands, previousHands);
    previousHands = hands;
    return { ...frame, hands };
  });
  const result = scoreGesture(frames, cameraFrames);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.movement >= 85, JSON.stringify(result));
});

void test('Keluarga grades finger motion, not incidental wrist jitter', () => {
  const frames = reference('keluarga');
  const firstHand = frames[0].hands[0];
  const steadyWrist = frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => {
      const deltaX = firstHand.landmarks[0].x - hand.landmarks[0].x;
      const deltaY = firstHand.landmarks[0].y - hand.landmarks[0].y;
      return {
        ...hand,
        landmarks: hand.landmarks.map((point) => ({
          ...point,
          x: point.x + deltaX,
          y: point.y + deltaY,
        })),
      };
    }),
  }));
  const genuineMotion = scoreGesture(frames, steadyWrist);
  assert.equal(genuineMotion.passed, true, JSON.stringify(genuineMotion));
  assert.ok(genuineMotion.movement >= 70, JSON.stringify(genuineMotion));

  const staticFingers = frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => {
      const deltaX = hand.landmarks[0].x - firstHand.landmarks[0].x;
      const deltaY = hand.landmarks[0].y - firstHand.landmarks[0].y;
      return {
        ...hand,
        landmarks: firstHand.landmarks.map((point) => ({
          ...point,
          x: point.x + deltaX,
          y: point.y + deltaY,
        })),
      };
    }),
  }));
  const copiedWristPath = scoreGesture(frames, staticFingers);
  assert.equal(copiedWristPath.passed, false, JSON.stringify(copiedWristPath));
  assert.equal(copiedWristPath.criticalMismatch, 'movement');
});

void test('Keluarga can pass once within a longer recording without accepting another sign', () => {
  const frames = reference('keluarga');
  const rest = reference('makan').find((frame) => frame.hands.length === 1);
  assert.ok(rest);
  const at = (frame: GestureFrame, timeMs: number) => ({
    ...structuredClone(frame),
    timeMs,
  });
  const attempt = [
    ...Array.from({ length: 10 }, (_, index) => at(rest, index * 66)),
    ...frames.map((frame, index) => at(frame, (index + 10) * 66)),
    ...Array.from({ length: 15 }, (_, index) => at(rest, (index + 26) * 66)),
  ];
  const correct = scoreGesture(frames, attempt);
  assert.equal(correct.passed, true, JSON.stringify(correct));
  assert.equal(correct.criticalMismatch, null, JSON.stringify(correct));

  const otherSign = scoreGesture(frames, reference('makan'));
  assert.equal(otherSign.passed, false, JSON.stringify(otherSign));
});

void test('Keluarga tolerates hidden inner joints but still checks visible fingertips', () => {
  const frames = reference('keluarga');
  const noisyInnerJoints = frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point, index) =>
        [2, 3, 6, 7, 10, 11, 14, 15, 18, 19].includes(index)
          ? {
              ...point,
              x: point.x + 0.025 * (index % 2 ? 1 : -1),
              y: point.y + 0.025 * (index % 3 ? 1 : -1),
            }
          : point,
      ),
    })),
  }));
  const recovered = scoreGesture(frames, noisyInnerJoints);
  assert.equal(recovered.passed, true, JSON.stringify(recovered));

  const changedFingertips = frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point, index) =>
        [8, 12, 16, 20].includes(index)
          ? { ...point, ...hand.landmarks[index - 3] }
          : point,
      ),
    })),
  }));
  const differentShape = scoreGesture(frames, changedFingertips);
  assert.equal(differentShape.passed, false, JSON.stringify(differentShape));
  assert.equal(differentShape.criticalMismatch, 'handshape');
  assert.ok(differentShape.handshapeEvidence);
  assert.ok(
    differentShape.handshapeEvidence.rawScore >= differentShape.handshape,
  );
  assert.ok(differentShape.movement >= 70, JSON.stringify(differentShape));
});

void test('Keluarga tolerates chest placement variance but rejects another body region', () => {
  const frames = withBodyPose(reference('keluarga'));
  const chestVariation = scoreGesture(
    frames,
    shiftHandsVertically(frames, -0.1),
  );
  assert.equal(chestVariation.positionRelativeToBody, true);
  assert.ok(chestVariation.position >= 60, JSON.stringify(chestVariation));
  assert.equal(chestVariation.passed, true, JSON.stringify(chestVariation));

  const differentRegion = scoreGesture(
    frames,
    shiftHandsVertically(frames, -0.2),
  );
  assert.equal(differentRegion.positionRelativeToBody, true);
  assert.ok(differentRegion.position < 60, JSON.stringify(differentRegion));
  assert.equal(differentRegion.criticalMismatch, 'position');
  assert.equal(differentRegion.passed, false, JSON.stringify(differentRegion));
});

function mirrorDominantHand(frames: GestureFrame[]) {
  return frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => ({
      ...hand,
      handedness: hand.handedness === 'Right' ? 'Left' : 'Right',
      landmarks: hand.landmarks.map((point) => ({
        ...point,
        x: 1 - point.x,
      })),
      worldLandmarks: hand.worldLandmarks?.map((point) => ({
        ...point,
        x: -point.x,
      })),
    })),
  }));
}

function projectHandsObliquely(frames: GestureFrame[]) {
  const project = (points: GestureFrame['hands'][number]['landmarks']) => {
    const wrist = points[0];
    return points.map((point) => {
      const x = point.x - wrist.x;
      const y = point.y - wrist.y;
      return {
        ...point,
        x: wrist.x + x + y * 0.8,
        y: wrist.y + y * 0.3,
      };
    });
  };

  return structuredClone(frames).map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => ({
      ...hand,
      landmarks: project(hand.landmarks),
      worldLandmarks: hand.worldLandmarks
        ? project(hand.worldLandmarks)
        : undefined,
    })),
  }));
}

void test('Apa accepts the correct finger pattern under strong perspective compression', () => {
  const frames = reference('apa');
  const attempt = projectHandsObliquely(frames);
  const result = scoreGesture(frames, attempt);
  assert.equal(result.orientationAssessable, false, JSON.stringify(result));
  assert.ok(result.handshape >= 75, JSON.stringify(result));
  assert.equal(result.passed, true, JSON.stringify(result));
});

void test('Apa still rejects a folded index finger under perspective compression', () => {
  const frames = reference('apa');
  const attempt = projectHandsObliquely(frames);
  for (const frame of attempt) {
    for (const hand of frame.hands) {
      const base = hand.landmarks[5];
      hand.landmarks[7] = { ...base };
      hand.landmarks[8] = { ...base };
      if (hand.worldLandmarks) {
        const worldBase = hand.worldLandmarks[5];
        hand.worldLandmarks[7] = { ...worldBase };
        hand.worldLandmarks[8] = { ...worldBase };
      }
    }
  }
  const result = scoreGesture(frames, attempt);
  assert.equal(result.passed, false, JSON.stringify(result));
  assert.equal(result.criticalMismatch, 'handshape', JSON.stringify(result));
});

void test('one-hand tracking follows the learner when another hand flashes into view', () => {
  const frames = reference('dengar');
  const mirrored = mirrorDominantHand(frames);
  const attempt = mirrored.map((frame, index) => {
    if (index !== Math.floor(mirrored.length / 2) || !frame.hands.length)
      return frame;
    const extra = structuredClone(frame.hands[0]);
    extra.handedness = extra.handedness === 'Left' ? 'Right' : 'Left';
    extra.landmarks = extra.landmarks.map((point) => ({
      ...point,
      x: Math.min(0.99, point.x + 0.2),
    }));
    return { ...frame, hands: [...frame.hands, extra] };
  });
  const result = scoreGesture(frames, attempt);
  assert.equal(result.passed, true, JSON.stringify(result));
});

void test('a held pose cannot outscore a completed motion using incompatible totals', () => {
  const motionReference = reference('dengar');
  const heldPose = reference('malam');
  const target = {
    ...scoreGesture(motionReference, motionReference),
    overall: 80,
  };
  assert.equal(target.gestureKind, 'motion');
  assert.equal(scoreGesture(heldPose, heldPose).gestureKind, 'pose');
  const result = scoreGestureWithAlternatives(
    motionReference,
    heldPose,
    [{ label: 'Malam', frames: heldPose }],
    target,
  );
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.confusableWith, null);
});

function scaleTwoHandSpacing(frames: GestureFrame[], factor: number) {
  return structuredClone(frames).map((frame) => {
    if (frame.hands.length !== 2) return frame;
    const center = {
      x: (frame.hands[0].landmarks[0].x + frame.hands[1].landmarks[0].x) / 2,
      y: (frame.hands[0].landmarks[0].y + frame.hands[1].landmarks[0].y) / 2,
    };
    return {
      ...frame,
      hands: frame.hands.map((hand) => {
        const wrist = hand.landmarks[0];
        const deltaX = (wrist.x - center.x) * (factor - 1);
        const deltaY = (wrist.y - center.y) * (factor - 1);
        return {
          ...hand,
          landmarks: hand.landmarks.map((point) => ({
            ...point,
            x: point.x + deltaX,
            y: point.y + deltaY,
          })),
        };
      }),
    };
  });
}

function withBodyPose(frames: GestureFrame[]) {
  return structuredClone(frames).map((frame) => {
    if (!frame.hands.length) return frame;
    const poseLandmarks = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.55,
      z: 0,
    }));
    poseLandmarks[11] = { x: 0.35, y: 0.35, z: 0 };
    poseLandmarks[12] = { x: 0.65, y: 0.35, z: 0 };
    poseLandmarks[23] = { x: 0.4, y: 0.75, z: 0 };
    poseLandmarks[24] = { x: 0.6, y: 0.75, z: 0 };
    poseLandmarks[15] = { ...frame.hands[0].landmarks[0] };
    poseLandmarks[16] = {
      ...(frame.hands[1]?.landmarks[0] ?? frame.hands[0].landmarks[0]),
    };
    return { ...frame, poseLandmarks };
  });
}

function shiftHandsVertically(frames: GestureFrame[], deltaY: number) {
  return structuredClone(frames).map((frame) => ({
    ...frame,
    poseLandmarks: frame.poseLandmarks?.map((point, index) =>
      index === 15 || index === 16 ? { ...point, y: point.y + deltaY } : point,
    ),
    hands: frame.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => ({
        ...point,
        y: point.y + deltaY,
      })),
    })),
  }));
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

void test('signs after mission 1 tolerate signing hand, tempo, framing, and brief tracking changes', () => {
  const missionOne = new Set([
    'saya',
    'siapa',
    'teman',
    'terima-kasih',
    'maaf',
  ]);
  for (const id of signIds) {
    if (missionOne.has(id)) continue;
    const frames = reference(id);
    const slower = frames.flatMap((frame, index) =>
      [0, 1].map((repeat) => ({
        ...frame,
        timeMs: (index * 2 + repeat) * 66,
      })),
    );
    const reframed = frames.map((frame) => ({
      ...frame,
      hands: frame.hands.map((hand) => ({
        ...hand,
        landmarks: hand.landmarks.map((point) => ({
          ...point,
          x: 0.5 + (point.x - 0.5) * 0.88 + 0.05,
          y: 0.5 + (point.y - 0.5) * 0.88 - 0.04,
        })),
      })),
    }));
    const briefTrackingGap = frames.map((frame, index) =>
      index % 7 === 0 ? { ...frame, hands: [] } : frame,
    );
    for (const [variation, attempt] of [
      ['opposite hand', mirrorDominantHand(frames)],
      ['slower', slower],
      ['camera position', reframed],
      ['brief tracking gap', briefTrackingGap],
    ] as const) {
      const result = scoreGesture(frames, attempt);
      assert.equal(
        result.passed,
        true,
        `${id} / ${variation}: ${JSON.stringify(result)}`,
      );
    }
  }
});

void test('Siapa tolerates overlap noise on inner curled-finger landmarks', () => {
  const frames = reference('siapa');
  const attempt = structuredClone(frames);
  for (const [frameIndex, frame] of attempt.entries()) {
    for (const hand of frame.hands) {
      const wrist = hand.landmarks[0];
      const middleBase = hand.landmarks[9];
      const handScale = Math.hypot(
        middleBase.x - wrist.x,
        middleBase.y - wrist.y,
      );
      for (const pointIndex of [6, 7, 10, 11, 14, 15, 18, 19]) {
        const direction = (frameIndex + pointIndex) % 2 ? 1 : -1;
        const point = hand.landmarks[pointIndex];
        point.x += handScale * 0.24 * direction;
        point.y += handScale * 0.14 * -direction;
      }
    }
  }
  const alternatives = getSigns(signIds)
    .filter((sign) => sign.id !== 'siapa')
    .map((sign) => ({ label: sign.label, frames: reference(sign.id) }));
  const score = scoreGestureWithAlternatives(frames, attempt, alternatives);
  assert.equal(score.passed, true, JSON.stringify(score));
  assert.ok(score.handshape >= 75, JSON.stringify(score));
});

void test('Siapa and Terima kasih accept the opposite dominant hand', () => {
  for (const id of ['siapa', 'terima-kasih'] as const) {
    const frames = reference(id);
    assert.equal(getRequiredHandCount(frames), 1, id);
    const alternatives = getSigns(signIds)
      .filter((sign) => sign.id !== id)
      .map((sign) => ({ label: sign.label, frames: reference(sign.id) }));
    const score = scoreGestureWithAlternatives(
      frames,
      mirrorDominantHand(frames),
      alternatives,
    );
    assert.equal(score.passed, true, `${id}: ${JSON.stringify(score)}`);
  }
});

void test('Terima kasih stays accepted across small tracking variations', () => {
  const frames = reference('terima-kasih');
  const alternatives = getSigns(signIds)
    .filter((sign) => sign.id !== 'terima-kasih')
    .map((sign) => ({ label: sign.label, frames: reference(sign.id) }));
  for (const seed of [3, 11, 29]) {
    const attempt = frames.map((frame, frameIndex) => ({
      ...frame,
      hands: frame.hands.map((hand, handIndex) => ({
        ...hand,
        landmarks: hand.landmarks.map((point, pointIndex) => ({
          ...point,
          x:
            point.x +
            Math.sin(seed + frameIndex * 13 + pointIndex * 5 + handIndex) *
              0.0015,
          y:
            point.y +
            Math.cos(seed + frameIndex * 17 + pointIndex * 3 + handIndex) *
              0.0015,
        })),
      })),
    }));
    const score = scoreGestureWithAlternatives(frames, attempt, alternatives);
    assert.equal(score.passed, true, `seed ${seed}: ${JSON.stringify(score)}`);
  }
});

void test('Teman tolerates bounded inner-joint noise while hands overlap', () => {
  const frames = reference('teman');
  const attempt = structuredClone(frames);
  for (const [frameIndex, frame] of attempt.entries()) {
    if (frame.hands.length !== 2) continue;
    const hand = frame.hands[frameIndex % 3 === 0 ? 0 : 1];
    const wrist = hand.landmarks[0];
    const middleBase = hand.landmarks[9];
    const handScale = Math.hypot(
      middleBase.x - wrist.x,
      middleBase.y - wrist.y,
    );
    for (const pointIndex of [6, 7, 10, 11, 14, 15, 18, 19]) {
      const direction = (frameIndex + pointIndex) % 2 ? 1 : -1;
      const point = hand.landmarks[pointIndex];
      point.x += handScale * 0.3 * direction;
      point.y += handScale * 0.18 * -direction;
    }
  }
  const score = scoreGesture(frames, attempt);
  assert.equal(score.passed, true, JSON.stringify(score));
  assert.ok(score.handshape >= 85, JSON.stringify(score));
});

void test('Teman ignores simultaneous hidden-joint drift while preserving fingertip evidence', () => {
  const frames = reference('teman');
  const attempt = structuredClone(frames);
  for (const [frameIndex, frame] of attempt.entries()) {
    for (const [handIndex, hand] of frame.hands.entries()) {
      const wrist = hand.landmarks[0];
      const middleBase = hand.landmarks[9];
      const handScale = Math.hypot(
        middleBase.x - wrist.x,
        middleBase.y - wrist.y,
      );
      for (const pointIndex of [2, 3, 6, 7, 10, 11, 14, 15, 18, 19]) {
        const direction = (frameIndex + pointIndex + handIndex) % 2 ? 1 : -1;
        const point = hand.landmarks[pointIndex];
        point.x += handScale * 0.25 * direction;
        point.y += handScale * 0.15 * -direction;
      }
    }
  }

  const alternatives = getSigns(signIds)
    .filter((sign) => sign.id !== 'teman')
    .map((sign) => ({ label: sign.label, frames: reference(sign.id) }));
  const score = scoreGestureWithAlternatives(frames, attempt, alternatives);
  assert.equal(score.passed, true, JSON.stringify(score));
  assert.ok(score.handshape >= 85, JSON.stringify(score));
});

void test('Teman accepts consistent signer variation below the strict unobstructed-hand threshold', () => {
  const frames = reference('teman');
  const attempt = structuredClone(frames);
  for (const frame of attempt) {
    for (const hand of frame.hands) {
      const wrist = hand.landmarks[0];
      const middleBase = hand.landmarks[9];
      const handScale = Math.hypot(
        middleBase.x - wrist.x,
        middleBase.y - wrist.y,
      );
      for (const pointIndex of [4, 8, 12, 16, 20]) {
        const point = hand.landmarks[pointIndex];
        point.x += handScale * 0.085;
        point.y -= handScale * 0.035;
      }
    }
  }

  const score = scoreGesture(frames, attempt);
  assert.equal(score.passed, true, JSON.stringify(score));
  assert.ok(score.handshape >= 70, JSON.stringify(score));
  assert.equal(
    score.handshapeEvidence?.requiredMatchingFrameRatio,
    0.3,
    JSON.stringify(score),
  );
});

void test('Teman grades sustained hand contact instead of exact wrist spacing', () => {
  const frames = reference('teman');
  const naturalSpacing = scoreGesture(frames, scaleTwoHandSpacing(frames, 1.4));
  assert.equal(naturalSpacing.passed, true, JSON.stringify(naturalSpacing));
  assert.ok(naturalSpacing.coordination >= 90, JSON.stringify(naturalSpacing));

  const separatedHands = scoreGesture(frames, scaleTwoHandSpacing(frames, 1.7));
  assert.equal(separatedHands.passed, false, JSON.stringify(separatedHands));
  assert.equal(separatedHands.criticalMismatch, 'coordination');
});

void test('Teman does not reject an intact contact sign for unobservable palm orientation', () => {
  const frames = reference('teman');
  const angle = Math.PI / 3;
  const attempt = structuredClone(frames).map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((point) => {
        const x = point.x - 0.5;
        const y = point.y - 0.55;
        return {
          ...point,
          x: 0.5 + x * Math.cos(angle) - y * Math.sin(angle),
          y: 0.55 + x * Math.sin(angle) + y * Math.cos(angle),
        };
      }),
    })),
  }));
  const alternatives = getSigns(signIds)
    .filter((sign) => sign.id !== 'teman')
    .map((sign) => ({ label: sign.label, frames: reference(sign.id) }));
  const score = scoreGestureWithAlternatives(frames, attempt, alternatives);
  assert.equal(score.orientationAssessable, false);
  assert.ok(score.orientation < 50, JSON.stringify(score));
  assert.equal(score.passed, true, JSON.stringify(score));
  assert.ok(score.movement >= 70 && score.coordination >= 90);
});

void test('Teman follows the fingers approaching despite a different wrist path', () => {
  const frames = reference('teman');
  const attempt = structuredClone(frames).map((frame, index, sequence) => {
    const drift = Math.sin((index / sequence.length) * Math.PI * 2) * 0.1;
    return {
      ...frame,
      hands: frame.hands.map((hand) => ({
        ...hand,
        landmarks: hand.landmarks.map((point) => ({
          ...point,
          x: point.x + drift,
          y: point.y - drift * 0.4,
        })),
      })),
    };
  });
  const score = scoreGesture(frames, attempt);
  assert.equal(score.passed, true, JSON.stringify(score));
  assert.ok(score.movement >= 70, JSON.stringify(score));
});

void test('Teman rejects a static contact even when both hands remain visible', () => {
  const frames = reference('teman');
  const contact = frames.find((frame) => frame.timeMs === 1848);
  assert.ok(contact && contact.hands.length === 2);
  const attempt = structuredClone(frames).map((frame) => ({
    ...frame,
    hands:
      frame.hands.length === 2 ? structuredClone(contact.hands) : frame.hands,
  }));
  const score = scoreGesture(frames, attempt);
  assert.equal(score.passed, false, JSON.stringify(score));
  assert.equal(score.criticalMismatch, 'movement');
});

void test('Teman rejects separating the index fingers instead of bringing them together', () => {
  const frames = reference('teman');
  const reversedHands = frames
    .filter((frame) => frame.hands.length === 2)
    .map((frame) => frame.hands)
    .reverse();
  let visibleIndex = 0;
  const attempt = structuredClone(frames).map((frame) => ({
    ...frame,
    hands:
      frame.hands.length === 2
        ? structuredClone(reversedHands[visibleIndex++])
        : frame.hands,
  }));
  const score = scoreGesture(frames, attempt);
  assert.equal(score.passed, false, JSON.stringify(score));
  assert.equal(score.criticalMismatch, 'movement');
});

void test('Teman accepts normal chest-level placement variance but rejects another body region', () => {
  const frames = withBodyPose(reference('teman'));
  const chestVariation = scoreGesture(
    frames,
    shiftHandsVertically(frames, -0.12),
  );
  assert.equal(chestVariation.positionRelativeToBody, true);
  assert.ok(chestVariation.position >= 60, JSON.stringify(chestVariation));
  assert.equal(chestVariation.passed, true, JSON.stringify(chestVariation));

  const differentRegion = scoreGesture(
    frames,
    shiftHandsVertically(frames, -0.3),
  );
  assert.equal(differentRegion.positionRelativeToBody, true);
  assert.ok(differentRegion.position < 60, JSON.stringify(differentRegion));
  assert.equal(differentRegion.criticalMismatch, 'position');
  assert.equal(differentRegion.passed, false, JSON.stringify(differentRegion));
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
