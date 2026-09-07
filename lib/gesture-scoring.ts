export type Point3 = { x: number; y: number; z: number };
export type HandObservation = {
  landmarks: Point3[];
  worldLandmarks?: Point3[];
  handedness: string;
  confidence: number;
};
export type GestureFrame = { timeMs: number; hands: HandObservation[] };
export type GestureScore = {
  overall: number;
  handshape: number;
  position: number;
  orientation: number;
  movement: number;
  coordination: number;
  detectionQuality: number;
  passed: boolean;
  feedback: string;
};

type Vector3 = [number, number, number];
type PreparedHand = {
  handedness: 'left' | 'right';
  shape: number[];
  position: number[];
  orientation: number[];
  wrist: [number, number];
  physicalWrist: [number, number];
  screenScale: number;
};
type PreparedFrame = { timeMs: number; hands: PreparedHand[] };
type MovementFrame = {
  hands: Array<{ handedness: string; trajectory: number[] }>;
};
type Components = Pick<
  GestureScore,
  'handshape' | 'position' | 'orientation' | 'movement' | 'coordination'
>;

const PASS_THRESHOLD = 75;
const MIN_COMPONENT_SCORE = 50;
const SEQUENCE_SAMPLES = 32;
const MIN_VISIBLE_FRAMES = 6;
const MIN_COVERAGE = 0.6;
const MIN_VISIBLE_DURATION_MS = 400;

export function scoreGesture(
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
): GestureScore {
  const rawReference = prepareSequence(referenceFrames);
  const rawAttempt = prepareSequence(attemptFrames);
  const visibleAttemptFrames = rawAttempt.filter(
    (frame) => frame.hands.length > 0,
  );
  const coverage = rawAttempt.length
    ? visibleAttemptFrames.length / rawAttempt.length
    : 0;
  // MediaPipe handedness confidence is confidence in left/right classification,
  // not landmark accuracy. Quality here measures usable hand visibility only.
  const detectionQuality =
    visibleAttemptFrames.length >= MIN_VISIBLE_FRAMES &&
    hasEnoughDuration(rawAttempt)
      ? roundScore(100 * coverage)
      : 0;

  if (!hasUsableReference(referenceFrames)) {
    return emptyScore(
      detectionQuality,
      'Referensi gerakan tidak cukup jelas untuk dinilai. Muat ulang referensi lalu coba lagi.',
    );
  }
  if (
    visibleAttemptFrames.length < MIN_VISIBLE_FRAMES ||
    !hasEnoughDuration(rawAttempt) ||
    coverage < MIN_COVERAGE
  ) {
    return emptyScore(
      detectionQuality,
      'Tangan belum terlihat cukup lama. Pastikan seluruh gerakan masuk ke dalam bingkai.',
    );
  }
  // Visibility gaps have already reduced quality above. An undetected frame has
  // no hand geometry to compare; treating it as a shape/orientation error makes
  // even the demo fail when one extraction briefly loses tracking.
  const reference = resampleSequence(
    rawReference.filter((frame) => frame.hands.length > 0),
  );
  const attempt = resampleSequence(visibleAttemptFrames);
  const direct = scorePrepared(reference, attempt, detectionQuality);
  // A change of dominant hand swaps the roles of BOTH hands together. Choose
  // one assignment for the entire gesture, never a different swap per frame.
  const swapped = scorePrepared(
    reference,
    attempt.map((frame) => ({
      ...frame,
      hands: frame.hands.map((hand) => ({
        ...hand,
        handedness: hand.handedness === 'left' ? 'right' : 'left',
      })),
    })),
    detectionQuality,
  );
  return swapped.overall > direct.overall ? swapped : direct;
}

function scorePrepared(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  detectionQuality: number,
): GestureScore {
  const components: Components = {
    handshape: errorToScore(
      dtwError(reference, attempt, (a, b) =>
        compareHands(a, b, (hand) => hand.shape),
      ),
      0.7,
    ),
    position: errorToScore(
      dtwError(reference, attempt, (a, b) =>
        compareHands(a, b, (hand) => hand.position),
      ),
      0.3,
    ),
    orientation: errorToScore(
      dtwError(reference, attempt, compareOrientation),
      0.42,
    ),
    movement: errorToScore(
      dtwError(
        movementSequence(reference),
        movementSequence(attempt),
        compareMovement,
      ),
      0.3,
    ),
    coordination: errorToScore(
      dtwError(reference, attempt, compareCoordination),
      0.5,
    ),
  };

  const weighted =
    components.handshape * 0.35 +
    components.movement * 0.25 +
    components.orientation * 0.2 +
    components.position * 0.1 +
    components.coordination * 0.1;
  const weightedScore = roundScore(
    weighted * (0.72 + 0.28 * (detectionQuality / 100)),
  );
  const weakest = weakestComponent(components);
  const weakestCore = weakestComponent({ ...components, position: 100 });
  // A severe mismatch must not be hidden by perfect unrelated components.
  // Screen position alone cannot establish incorrect placement relative to the
  // body: we only have hand landmarks, not a tracked shoulder/torso anchor.
  const overall =
    components[weakestCore] < MIN_COMPONENT_SCORE
      ? Math.min(PASS_THRESHOLD - 1, weightedScore)
      : weightedScore;

  return {
    overall,
    ...components,
    detectionQuality,
    passed: overall >= PASS_THRESHOLD,
    feedback: feedbackFor(
      overall,
      components[weakestCore] < MIN_COMPONENT_SCORE ? weakestCore : weakest,
    ),
  };
}

function prepareSequence(frames: GestureFrame[]): PreparedFrame[] {
  if (
    frames.some(
      (frame, index) =>
        !Number.isFinite(frame.timeMs) ||
        (index > 0 && frame.timeMs <= frames[index - 1].timeMs),
    )
  )
    return [];
  const prepared = frames.map((frame) => {
    const hands = frame.hands
      .map(prepareHand)
      .filter((hand): hand is PreparedHand => hand !== null)
      .sort((a, b) => a.handedness.localeCompare(b.handedness));
    return {
      timeMs: frame.timeMs,
      // Ambiguous duplicate identities cannot be matched reliably.
      hands:
        new Set(hands.map((hand) => hand.handedness)).size === hands.length
          ? hands
          : [],
    };
  });
  // The demo and the recording include setup/rest time with hands out of frame.
  // Compare the visible gesture, while preserving detection gaps INSIDE it.
  const first = prepared.findIndex((frame) => frame.hands.length > 0);
  if (first < 0) return [];
  let last = prepared.length - 1;
  while (!prepared[last].hands.length) last -= 1;
  return prepared.slice(first, last + 1);
}

function hasEnoughDuration(frames: PreparedFrame[]): boolean {
  return (
    frames.length > 1 &&
    frames[frames.length - 1].timeMs - frames[0].timeMs >=
      MIN_VISIBLE_DURATION_MS
  );
}

export function hasUsableReference(frames: GestureFrame[]): boolean {
  const prepared = prepareSequence(frames);
  const visible = prepared.filter((frame) => frame.hands.length > 0).length;
  return (
    visible >= MIN_VISIBLE_FRAMES &&
    hasEnoughDuration(prepared) &&
    visible / prepared.length >= MIN_COVERAGE
  );
}

function resampleSequence(frames: PreparedFrame[]): PreparedFrame[] {
  const start = frames[0].timeMs;
  const duration = frames[frames.length - 1].timeMs - start;
  let cursor = 0;
  return Array.from({ length: SEQUENCE_SAMPLES }, (_, index) => {
    const progress = index / (SEQUENCE_SAMPLES - 1);
    const time = start + progress * duration;
    while (cursor < frames.length - 2 && frames[cursor + 1].timeMs < time)
      cursor += 1;
    const a = frames[cursor];
    const b = frames[cursor + 1];
    const weight = (time - a.timeMs) / (b.timeMs - a.timeMs);
    const mix = (left: number[], right: number[]) =>
      left.map((value, i) => value + (right[i] - value) * weight);
    if (weight <= 0) return { ...a, timeMs: progress };
    if (weight >= 1) return { ...b, timeMs: progress };
    return {
      // Normalized time makes the same complete gesture comparable at any speed.
      timeMs: progress,
      hands: a.hands.flatMap((hand) => {
        const next = b.hands.find(
          (candidate) => candidate.handedness === hand.handedness,
        );
        if (!next) return [];
        return [
          {
            handedness: hand.handedness,
            shape: mix(hand.shape, next.shape),
            position: mix(hand.position, next.position),
            orientation: normalize3(
              mix(hand.orientation, next.orientation) as Vector3,
            ),
            wrist: mix(hand.wrist, next.wrist) as [number, number],
            physicalWrist: mix(hand.physicalWrist, next.physicalWrist) as [
              number,
              number,
            ],
            screenScale:
              hand.screenScale + (next.screenScale - hand.screenScale) * weight,
          },
        ];
      }),
    };
  });
}

function prepareHand(hand: HandObservation): PreparedHand | null {
  const validPoints = (points: Point3[]) =>
    points.length === 21 &&
    points.every((point) => [point.x, point.y, point.z].every(Number.isFinite));
  const handedness = hand.handedness.toLowerCase();
  if (
    !validPoints(hand.landmarks) ||
    (handedness !== 'left' && handedness !== 'right')
  )
    return null;
  const mirror = handedness === 'left';
  // Reflect geometry BEFORE deriving the palm basis. Reflecting only the wrist
  // reverses the palm normal and leaves mirrored fingers incorrectly penalized.
  const source = (
    hand.worldLandmarks && validPoints(hand.worldLandmarks)
      ? hand.worldLandmarks
      : hand.landmarks
  ).map((point) => ({ ...point, x: mirror ? -point.x : point.x }));
  const wrist = source[0];
  const indexMcp = source[5];
  const middleMcp = source[9];
  const pinkyMcp = source[17];
  if (
    distance3(indexMcp, pinkyMcp) < 0.0001 ||
    distance3(wrist, middleMcp) < 0.0001
  )
    return null;
  const side = normalize3(subtract3(indexMcp, pinkyMcp));
  const forward = normalize3(subtract3(middleMcp, wrist));
  const normal = normalize3(cross(side, forward));
  const scale = Math.max(
    0.0001,
    (distance3(indexMcp, pinkyMcp) + distance3(wrist, middleMcp)) / 2,
  );
  const shape = source.flatMap((landmark) => {
    const relative = subtract3(landmark, wrist);
    return [
      dot(relative, side) / scale,
      dot(relative, forward) / scale,
      dot(relative, normal) / scale,
    ];
  });
  const screenWrist = hand.landmarks[0];
  const screenMiddle = hand.landmarks[9];
  const screenScale = Math.max(0.001, distance2(screenWrist, screenMiddle));

  return {
    handedness,
    shape,
    position: [mirror ? 1 - screenWrist.x : screenWrist.x, screenWrist.y],
    orientation: normal,
    wrist: [mirror ? 1 - screenWrist.x : screenWrist.x, screenWrist.y],
    // Inter-hand distances must stay in one shared, unmirrored coordinate space.
    physicalWrist: [screenWrist.x, screenWrist.y],
    screenScale,
  };
}

function compareHands(
  a: PreparedFrame,
  b: PreparedFrame,
  select: (hand: PreparedHand) => number[],
) {
  const count = Math.min(a.hands.length, b.hands.length);
  if (!a.hands.length && !b.hands.length) return 0;
  if (!count) return 4;
  const errors = Array.from({ length: count }, (_, index) => {
    const hand = a.hands[index];
    const matched =
      a.hands.length === 1 && b.hands.length === 1
        ? b.hands[0]
        : b.hands.find((candidate) => candidate.handedness === hand.handedness);
    return matched ? vectorRms(select(hand), select(matched)) : 4;
  });
  return average(errors) + Math.abs(a.hands.length - b.hands.length) * 0.5;
}

function compareOrientation(a: PreparedFrame, b: PreparedFrame) {
  return compareHands(a, b, (hand) => hand.orientation);
}

function compareCoordination(a: PreparedFrame, b: PreparedFrame) {
  if (a.hands.length !== b.hands.length) return 1;
  if (a.hands.length < 2) return 0;
  const distanceA =
    distanceArrays(a.hands[0].physicalWrist, a.hands[1].physicalWrist) /
    average([a.hands[0].screenScale, a.hands[1].screenScale]);
  const distanceB =
    distanceArrays(b.hands[0].physicalWrist, b.hands[1].physicalWrist) /
    average([b.hands[0].screenScale, b.hands[1].screenScale]);
  return Math.abs(distanceA - distanceB);
}

function movementSequence(sequence: PreparedFrame[]): MovementFrame[] {
  const anchors = new Map<string, { x: number; y: number; scale: number }>();
  for (const identity of ['left', 'right']) {
    const hands = sequence.flatMap((frame) =>
      frame.hands.filter((hand) => hand.handedness === identity),
    );
    if (hands.length)
      anchors.set(identity, {
        x: median(hands.map((hand) => hand.wrist[0])),
        y: median(hands.map((hand) => hand.wrist[1])),
        scale: median(hands.map((hand) => hand.screenScale)),
      });
  }
  // Compare the ordered wrist path, not its frame-to-frame derivative. A
  // derivative amplifies landmark jitter and onset detection differences; DTW
  // on the centered path preserves direction while allowing local speed changes.
  return sequence.map((frame) => {
    return {
      hands: frame.hands.map((hand) => {
        const anchor = anchors.get(hand.handedness)!;
        return {
          handedness: hand.handedness,
          trajectory: [
            (hand.wrist[0] - anchor.x) / anchor.scale,
            (hand.wrist[1] - anchor.y) / anchor.scale,
          ],
        };
      }),
    };
  });
}

function compareMovement(a: MovementFrame, b: MovementFrame) {
  if (!a.hands.length && !b.hands.length) return 0;
  if (!a.hands.length || !b.hands.length) return 4;
  const errors = a.hands.map((hand) => {
    const matched =
      a.hands.length === 1 && b.hands.length === 1
        ? b.hands[0]
        : b.hands.find((candidate) => candidate.handedness === hand.handedness);
    return matched ? vectorRms(hand.trajectory, matched.trajectory) : 4;
  });
  return average(errors) + Math.abs(a.hands.length - b.hands.length);
}

function dtwError<T>(a: T[], b: T[], distance: (left: T, right: T) => number) {
  if (!a.length || !b.length) return 4;
  const costs = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(Number.POSITIVE_INFINITY),
  );
  const lengths = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  costs[0][0] = 0;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const candidates = [
        { cost: costs[i - 1][j], length: lengths[i - 1][j] },
        { cost: costs[i][j - 1], length: lengths[i][j - 1] },
        { cost: costs[i - 1][j - 1], length: lengths[i - 1][j - 1] },
      ];
      const best = candidates.reduce((current, candidate) =>
        candidate.cost < current.cost ? candidate : current,
      );
      costs[i][j] = best.cost + distance(a[i - 1], b[j - 1]);
      lengths[i][j] = best.length + 1;
    }
  }
  return costs[a.length][b.length] / Math.max(1, lengths[a.length][b.length]);
}

function weakestComponent(components: Components) {
  return (
    Object.entries(components) as Array<[keyof Components, number]>
  ).reduce((weakest, current) =>
    current[1] < weakest[1] ? current : weakest,
  )[0];
}

function feedbackFor(overall: number, weakest: keyof Components) {
  const advice = {
    handshape: 'Periksa kembali bentuk dan jarak antarruas jari.',
    position: 'Sesuaikan posisi tangan di dalam bingkai dengan video contoh.',
    orientation:
      'Putar telapak dan pergelangan lebih dekat ke orientasi contoh.',
    movement: 'Ikuti arah serta lintasan gerakan dari awal sampai akhir.',
    coordination: 'Samakan waktu dan jarak gerak kedua tangan.',
  }[weakest];
  if (overall >= 88) return `Gerakan sangat dekat dengan contoh. ${advice}`;
  if (overall >= PASS_THRESHOLD)
    return `Gerakan melewati ambang latihan. ${advice}`;
  return `Gerakan masih perlu diulang. ${advice}`;
}

function emptyScore(detectionQuality: number, feedback: string): GestureScore {
  return {
    overall: 0,
    handshape: 0,
    position: 0,
    orientation: 0,
    movement: 0,
    coordination: 0,
    detectionQuality,
    passed: false,
    feedback,
  };
}

function errorToScore(error: number, tolerance: number) {
  return roundScore(100 * Math.exp(-error / tolerance));
}
function roundScore(value: number) {
  return Math.round(clamp(value, 0, 100));
}
function vectorRms(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (!length || a.length !== b.length) return 4;
  return Math.sqrt(
    a
      .slice(0, length)
      .reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / length,
  );
}
function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
function subtract3(a: Point3, b: Point3): Vector3 {
  return [a.x - b.x, a.y - b.y, a.z - b.z];
}
function dot(a: Vector3, b: Vector3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function normalize3(point: Vector3): Vector3 {
  const magnitude = Math.hypot(...point) || 1;
  return point.map((value) => value / magnitude) as Vector3;
}
function distance3(a: Point3, b: Point3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function distance2(a: Point3, b: Point3) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function distanceArrays(a: number[], b: number[]) {
  return Math.hypot(...a.map((value, index) => value - b[index]));
}
