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
  shape: number[];
  position: number[];
  orientation: number[];
  wrist: [number, number];
  screenScale: number;
  confidence: number;
};
type PreparedFrame = { hands: PreparedHand[] };
type Components = Pick<
  GestureScore,
  'handshape' | 'position' | 'orientation' | 'movement' | 'coordination'
>;

const PASS_THRESHOLD = 75;

export function scoreGesture(
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
): GestureScore {
  const reference = prepareSequence(referenceFrames);
  const attempt = prepareSequence(attemptFrames);
  const visibleAttemptFrames = attemptFrames.filter(
    (frame) => frame.hands.length > 0,
  );
  const coverage = attemptFrames.length
    ? visibleAttemptFrames.length / attemptFrames.length
    : 0;
  const confidence = average(
    visibleAttemptFrames.flatMap((frame) =>
      frame.hands.map((hand) => hand.confidence),
    ),
  );
  const detectionQuality = roundScore(100 * coverage * clamp(confidence, 0, 1));

  if (reference.length < 6 || attempt.length < 6) {
    return emptyScore(
      detectionQuality,
      'Tangan belum terlihat cukup lama. Pastikan seluruh gerakan masuk ke dalam bingkai.',
    );
  }

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
        vectorRms,
      ),
      0.18,
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
  const overall = roundScore(
    weighted * (0.72 + 0.28 * (detectionQuality / 100)),
  );
  const weakest = weakestComponent(components);

  return {
    overall,
    ...components,
    detectionQuality,
    passed: overall >= PASS_THRESHOLD,
    feedback: feedbackFor(overall, weakest),
  };
}

function prepareSequence(frames: GestureFrame[]): PreparedFrame[] {
  const prepared = frames
    .filter((frame) => frame.hands.length > 0)
    .map((frame) => ({
      hands: frame.hands
        .map(prepareHand)
        .filter((hand): hand is PreparedHand => hand !== null)
        .sort((a, b) => b.confidence - a.confidence),
    }))
    .filter((frame) => frame.hands.length > 0);
  const step = Math.max(1, Math.ceil(prepared.length / 48));
  return prepared.filter((_, index) => index % step === 0);
}

function prepareHand(hand: HandObservation): PreparedHand | null {
  if (hand.landmarks.length < 21) return null;
  const source =
    hand.worldLandmarks && hand.worldLandmarks.length >= 21
      ? hand.worldLandmarks
      : hand.landmarks;
  const wrist = source[0];
  const indexMcp = source[5];
  const middleMcp = source[9];
  const pinkyMcp = source[17];
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
  const mirror = hand.handedness.toLowerCase().includes('left');

  return {
    shape,
    position: [mirror ? 1 - screenWrist.x : screenWrist.x, screenWrist.y],
    orientation: normal,
    wrist: [mirror ? 1 - screenWrist.x : screenWrist.x, screenWrist.y],
    screenScale,
    confidence: clamp(hand.confidence, 0, 1),
  };
}

function compareHands(
  a: PreparedFrame,
  b: PreparedFrame,
  select: (hand: PreparedHand) => number[],
) {
  const count = Math.min(a.hands.length, b.hands.length);
  if (!count) return 4;
  const errors = Array.from({ length: count }, (_, index) =>
    vectorRms(select(a.hands[index]), select(b.hands[index])),
  );
  return average(errors) + Math.abs(a.hands.length - b.hands.length) * 0.5;
}

function compareOrientation(a: PreparedFrame, b: PreparedFrame) {
  return compareHands(a, b, (hand) => hand.orientation);
}

function compareCoordination(a: PreparedFrame, b: PreparedFrame) {
  if (a.hands.length !== b.hands.length) return 1;
  if (a.hands.length < 2) return 0;
  const distanceA =
    distanceArrays(a.hands[0].wrist, a.hands[1].wrist) /
    average([a.hands[0].screenScale, a.hands[1].screenScale]);
  const distanceB =
    distanceArrays(b.hands[0].wrist, b.hands[1].wrist) /
    average([b.hands[0].screenScale, b.hands[1].screenScale]);
  return Math.abs(distanceA - distanceB);
}

function movementSequence(sequence: PreparedFrame[]): number[][] {
  return sequence.slice(1).map((frame, index) => {
    const previous = sequence[index];
    const count = Math.min(frame.hands.length, previous.hands.length);
    return Array.from({ length: count }, (_, handIndex) => {
      const currentHand = frame.hands[handIndex];
      const previousHand = previous.hands[handIndex];
      const scale = average([
        currentHand.screenScale,
        previousHand.screenScale,
      ]);
      return [
        (currentHand.wrist[0] - previousHand.wrist[0]) / scale,
        (currentHand.wrist[1] - previousHand.wrist[1]) / scale,
      ];
    }).flat();
  });
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
