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

type Vector2 = [number, number];
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
const MIN_TWO_HAND_COVERAGE = 0.35;
const MIN_VISIBLE_DURATION_MS = 400;
const POSE_DOMINANT_CENTRAL_EXTENT = 0.2;
const TWO_HAND_REFERENCE_RATIO = 0.6;
const MIN_ATTEMPT_WINDOW_RATIO = 0.55;
const MAX_ATTEMPT_BOUNDARY_TRIM_RATIO = 0.3;
const MAX_BOUNDARY_CANDIDATES = 20;

export function scoreGesture(
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
): GestureScore {
  const rawReference = prepareSequence(referenceFrames);
  const rawAttempt = prepareSequence(attemptFrames);
  const requiredHandCount = getRequiredHandCountFromPrepared(rawReference);
  const primaryHandedness = getPrimaryHandedness(rawReference);
  const reference = selectRequiredHands(
    rawReference,
    requiredHandCount,
    primaryHandedness,
  ).filter((frame) => frame.hands.length === requiredHandCount);
  const directAttempt = selectRequiredHands(
    rawAttempt,
    requiredHandCount,
    primaryHandedness,
  );
  const visibleAttemptFrames = directAttempt.filter(
    (frame) => frame.hands.length === requiredHandCount,
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
    !hasEnoughDuration(visibleAttemptFrames) ||
    coverage < (requiredHandCount === 2 ? MIN_TWO_HAND_COVERAGE : MIN_COVERAGE)
  ) {
    return emptyScore(
      detectionQuality,
      requiredHandCount === 2
        ? 'Kedua tangan belum terlihat cukup lama. Pastikan keduanya masuk ke dalam bingkai selama gerakan.'
        : 'Tangan belum terlihat cukup lama. Pastikan seluruh gerakan masuk ke dalam bingkai.',
    );
  }
  // Visibility gaps have already reduced quality above. An undetected frame has
  // no hand geometry to compare; treating it as a shape/orientation error makes
  // even the demo fail when one extraction briefly loses tracking.
  const sampledReference = resampleSequence(reference);
  const direct = scoreAttemptWindows(
    sampledReference,
    visibleAttemptFrames,
    detectionQuality,
  );
  // A change of dominant hand swaps the roles of BOTH hands together. Choose
  // one assignment for the entire gesture, never a different swap per frame.
  if (requiredHandCount === 1) return direct;
  const swapped = scoreAttemptWindows(
    sampledReference,
    selectRequiredHands(
      swapHandedness(rawAttempt),
      requiredHandCount,
      primaryHandedness,
    ).filter((frame) => frame.hands.length === requiredHandCount),
    detectionQuality,
  );
  return swapped.overall > direct.overall ? swapped : direct;
}

function scoreAttemptWindows(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  detectionQuality: number,
) {
  return getAttemptWindows(attempt)
    .map((window) =>
      scorePrepared(
        reference,
        resampleSequence(window),
        detectionQuality,
        window,
      ),
    )
    .reduce((best, result) => (result.overall > best.overall ? result : best));
}

function getAttemptWindows(sequence: PreparedFrame[]) {
  const minimumFrames = Math.max(
    MIN_VISIBLE_FRAMES,
    Math.ceil(sequence.length * MIN_ATTEMPT_WINDOW_RATIO),
  );
  const windows: PreparedFrame[][] = [];
  const maximumTrim = Math.floor(
    sequence.length * MAX_ATTEMPT_BOUNDARY_TRIM_RATIO,
  );
  const step = Math.max(
    1,
    Math.ceil((maximumTrim + 1) / MAX_BOUNDARY_CANDIDATES),
  );
  const trimCandidates = Array.from(
    { length: Math.floor(maximumTrim / step) + 1 },
    (_, index) => index * step,
  );
  if (trimCandidates.at(-1) !== maximumTrim) trimCandidates.push(maximumTrim);

  for (const startTrim of trimCandidates) {
    for (const endTrim of trimCandidates) {
      const start = startTrim;
      const end = sequence.length - endTrim;
      const candidate = sequence.slice(start, end);
      if (
        candidate.length >= minimumFrames &&
        hasEnoughDuration(candidate) &&
        !windows.some(
          (window) =>
            window[0] === candidate[0] &&
            window[window.length - 1] === candidate[candidate.length - 1],
        )
      ) {
        windows.push(candidate);
      }
    }
  }
  return windows.length ? windows : [sequence];
}

function scorePrepared(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  detectionQuality: number,
  rawAttempt = attempt,
): GestureScore {
  const poseDominant = isPoseDominantGesture(reference);
  const referenceMovement = movementSequence(reference);
  const attemptMovement = movementSequence(attempt);
  const comparePosition = (a: PreparedFrame, b: PreparedFrame) =>
    compareHands(a, b, (hand) => hand.position);
  const components: Components = {
    handshape: errorToScore(
      robustPoseError(reference, attempt, (a, b) =>
        compareHands(a, b, (hand) => hand.shape),
      ),
      0.7,
    ),
    position: errorToScore(
      poseDominant
        ? robustPoseError(reference, attempt, comparePosition)
        : dtwError(reference, attempt, comparePosition),
      0.3,
    ),
    orientation: errorToScore(
      robustPoseError(reference, attempt, compareOrientation),
      0.42,
    ),
    movement: errorToScore(
      poseDominant
        ? poseHoldError(reference, rawAttempt)
        : Math.max(
            dtwError(referenceMovement, attemptMovement, compareMovement),
            movementDirectionError(referenceMovement, attemptMovement),
          ),
      0.35,
    ),
    coordination: errorToScore(
      coordinationSequenceError(reference, attempt),
      0.24,
    ),
  };

  const weighted =
    components.handshape * 0.35 +
    components.movement * 0.25 +
    components.orientation * 0.2 +
    components.position * 0.1 +
    components.coordination * 0.1;
  // Coverage is already enforced before scoring. Multiplying by it again would
  // punish detector occlusion twice, especially when two hands overlap.
  const weightedScore = roundScore(weighted);
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
  const requiredHandCount = getRequiredHandCountFromPrepared(prepared);
  const visibleFrames = selectRequiredHands(
    prepared,
    requiredHandCount,
    getPrimaryHandedness(prepared),
  ).filter((frame) => frame.hands.length === requiredHandCount);
  return (
    visibleFrames.length >= MIN_VISIBLE_FRAMES &&
    hasEnoughDuration(visibleFrames) &&
    visibleFrames.length / prepared.length >= MIN_COVERAGE
  );
}

export function getRequiredHandCount(frames: GestureFrame[]) {
  return getRequiredHandCountFromPrepared(prepareSequence(frames));
}

function getRequiredHandCountFromPrepared(frames: PreparedFrame[]) {
  const visibleFrames = frames.filter((frame) => frame.hands.length > 0);
  if (!visibleFrames.length) return 1;
  const twoHandFrames = visibleFrames.filter(
    (frame) => frame.hands.length >= 2,
  ).length;
  return twoHandFrames / visibleFrames.length >= TWO_HAND_REFERENCE_RATIO
    ? 2
    : 1;
}

function getPrimaryHandedness(frames: PreparedFrame[]) {
  const counts = { left: 0, right: 0 };
  const singleHandFrames = frames.filter((frame) => frame.hands.length === 1);
  for (const frame of singleHandFrames.length ? singleHandFrames : frames) {
    for (const hand of frame.hands) counts[hand.handedness] += 1;
  }
  return counts.left > counts.right ? ('left' as const) : ('right' as const);
}

function selectRequiredHands(
  frames: PreparedFrame[],
  requiredHandCount: number,
  primaryHandedness: PreparedHand['handedness'],
) {
  return frames.map((frame) => {
    if (requiredHandCount === 2) {
      return {
        ...frame,
        hands: frame.hands.length >= 2 ? frame.hands.slice(0, 2) : [],
      };
    }
    const primary =
      frame.hands.find((hand) => hand.handedness === primaryHandedness) ??
      (frame.hands.length === 1 ? frame.hands[0] : undefined);
    return { ...frame, hands: primary ? [primary] : [] };
  });
}

function swapHandedness(frames: PreparedFrame[]): PreparedFrame[] {
  return frames.map((frame) => ({
    ...frame,
    hands: frame.hands.map((hand) => ({
      ...hand,
      handedness:
        hand.handedness === 'left' ? ('right' as const) : ('left' as const),
    })),
  }));
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
            orientation: normalizeVector(
              mix(hand.orientation, next.orientation),
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
  // MediaPipe's inferred world depth changes considerably with camera angle and
  // partial occlusion against the torso. The visible 2D skeleton is the stable
  // evidence this camera checker can actually compare across different users.
  const source = hand.landmarks.map((point) => ({
    ...point,
    x: mirror ? 1 - point.x : point.x,
  }));
  const wrist = source[0];
  const indexMcp = source[5];
  const middleMcp = source[9];
  const pinkyMcp = source[17];
  if (
    distance2(indexMcp, pinkyMcp) < 0.0001 ||
    distance2(wrist, middleMcp) < 0.0001
  )
    return null;
  const side = normalize2([indexMcp.x - pinkyMcp.x, indexMcp.y - pinkyMcp.y]);
  const forward = normalize2([middleMcp.x - wrist.x, middleMcp.y - wrist.y]);
  const scale = Math.max(
    0.0001,
    (distance2(indexMcp, pinkyMcp) + distance2(wrist, middleMcp)) / 2,
  );
  const shape = source.flatMap((landmark) => {
    const relative: Vector2 = [landmark.x - wrist.x, landmark.y - wrist.y];
    return [dot2(relative, side) / scale, dot2(relative, forward) / scale];
  });
  const screenWrist = source[0];
  const screenMiddle = source[9];
  const physicalScreenWrist = hand.landmarks[0];
  const screenScale = Math.max(0.001, distance2(screenWrist, screenMiddle));

  return {
    handedness,
    shape,
    position: [screenWrist.x, screenWrist.y],
    orientation: [...side, ...forward],
    wrist: [screenWrist.x, screenWrist.y],
    // Inter-hand distances must stay in one shared, unmirrored coordinate space.
    physicalWrist: [physicalScreenWrist.x, physicalScreenWrist.y],
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

function robustPoseError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  distance: (left: PreparedFrame, right: PreparedFrame) => number,
) {
  const sequenceError = dtwError(reference, attempt, distance);
  // A learner can start with a relaxed hand and then hold the correct sign.
  // Require a sustained matching portion instead of grading preparation frames
  // as if they were part of the sign's handshape or orientation.
  const nearestErrors = attempt
    .map((frame) =>
      Math.min(
        ...reference.map((referenceFrame) => distance(referenceFrame, frame)),
      ),
    )
    .sort((a, b) => a - b);
  const sustainedFrames = Math.max(4, Math.ceil(nearestErrors.length * 0.25));
  return Math.min(
    sequenceError,
    average(nearestErrors.slice(0, sustainedFrames)),
  );
}

function coordinationSequenceError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
) {
  if (reference.every((frame) => frame.hands.length < 2)) return 0;
  const distanceProfile = (sequence: PreparedFrame[]) =>
    sequence.flatMap((frame) => {
      if (frame.hands.length < 2) return [];
      return [
        distanceArrays(
          frame.hands[0].physicalWrist,
          frame.hands[1].physicalWrist,
        ) / average([frame.hands[0].screenScale, frame.hands[1].screenScale]),
      ];
    });
  const referenceDistances = distanceProfile(reference);
  const attemptDistances = distanceProfile(attempt);
  if (!referenceDistances.length || !attemptDistances.length) return 4;
  // A tracking gap can leave a sparse subset of otherwise valid distances.
  // Grade each observed attempt distance against the nearest reference state;
  // the two wrist trajectories still enforce that the full motion occurred.
  const nearestStateError = average(
    attemptDistances.map((distance) =>
      Math.min(
        ...referenceDistances.map((reference) =>
          Math.abs(reference - distance),
        ),
      ),
    ),
  );
  const referenceDelta = linearTrend(referenceDistances);
  const attemptDelta = linearTrend(attemptDistances);
  const oppositeSpacingDirection =
    Math.abs(referenceDelta) >= 0.2 &&
    Math.abs(attemptDelta) >= 0.2 &&
    Math.sign(referenceDelta) !== Math.sign(attemptDelta);
  return oppositeSpacingDirection
    ? Math.max(0.4, nearestStateError)
    : nearestStateError;
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

function isPoseDominantGesture(sequence: PreparedFrame[]) {
  const start = Math.floor(sequence.length * 0.25);
  const end = Math.ceil(sequence.length * 0.75);
  return (
    motionExtent(sequence.slice(start, end)) < POSE_DOMINANT_CENTRAL_EXTENT
  );
}

function poseHoldError(reference: PreparedFrame[], attempt: PreparedFrame[]) {
  const referenceExtent = sustainedMotionExtent(reference);
  const attemptExtent = sustainedMotionExtent(attempt);
  // Entry and exit motion around a held sign belongs to the recording setup.
  // Require one stable held portion instead of matching those boundary paths.
  return Math.max(
    0,
    attemptExtent - Math.max(POSE_DOMINANT_CENTRAL_EXTENT, referenceExtent * 2),
  );
}

function sustainedMotionExtent(sequence: PreparedFrame[]) {
  const windowSize = Math.max(4, Math.ceil(sequence.length * 0.25));
  let smallest = Number.POSITIVE_INFINITY;
  for (let start = 0; start <= sequence.length - windowSize; start += 1) {
    smallest = Math.min(
      smallest,
      motionExtent(sequence.slice(start, start + windowSize)),
    );
  }
  return Number.isFinite(smallest) ? smallest : 4;
}

function motionExtent(sequence: PreparedFrame[]) {
  const identities = ['left', 'right'] as const;
  const extents = identities.flatMap((identity) => {
    const hands = sequence.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === identity,
      );
      return hand ? [hand] : [];
    });
    if (hands.length < Math.max(2, sequence.length * 0.75)) return [];
    const scale = median(hands.map((hand) => hand.screenScale));
    const xs = hands.map((hand) => hand.wrist[0]);
    const ys = hands.map((hand) => hand.wrist[1]);
    return [
      Math.hypot(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      ) / scale,
    ];
  });
  return extents.length ? average(extents) : 4;
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

function movementDirectionError(
  reference: MovementFrame[],
  attempt: MovementFrame[],
) {
  const errors = ['left', 'right'].flatMap((handedness) => {
    const referencePath = reference.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === handedness,
      );
      return hand ? [hand.trajectory] : [];
    });
    const attemptPath = attempt.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === handedness,
      );
      return hand ? [hand.trajectory] : [];
    });
    if (referencePath.length < 2 || attemptPath.length < 2) return [];

    const referenceDelta = [
      referencePath.at(-1)![0] - referencePath[0][0],
      referencePath.at(-1)![1] - referencePath[0][1],
    ];
    const attemptDelta = [
      attemptPath.at(-1)![0] - attemptPath[0][0],
      attemptPath.at(-1)![1] - attemptPath[0][1],
    ];
    const referenceMagnitude = Math.hypot(...referenceDelta);
    const attemptMagnitude = Math.hypot(...attemptDelta);
    // Closed or nearly stationary paths have no meaningful start-to-end
    // direction. Their shape is already covered by DTW above.
    if (referenceMagnitude < POSE_DOMINANT_CENTRAL_EXTENT) return [];
    if (attemptMagnitude < 0.05) return [4];
    const cosine = clamp(
      (referenceDelta[0] * attemptDelta[0] +
        referenceDelta[1] * attemptDelta[1]) /
        (referenceMagnitude * attemptMagnitude),
      -1,
      1,
    );
    return [Math.max(0, (1 - cosine) * 0.25)];
  });
  return errors.length ? average(errors) : 0;
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
function linearTrend(values: number[]) {
  if (values.length < 2) return 0;
  const center = (values.length - 1) / 2;
  let covariance = 0;
  let variance = 0;
  for (const [index, value] of values.entries()) {
    const offset = index - center;
    covariance += offset * value;
    variance += offset * offset;
  }
  return variance ? (covariance / variance) * (values.length - 1) : 0;
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
function normalizeVector(point: number[]) {
  const magnitude = Math.hypot(...point) || 1;
  return point.map((value) => value / magnitude);
}
function normalize2(point: Vector2): Vector2 {
  const magnitude = Math.hypot(...point) || 1;
  return [point[0] / magnitude, point[1] / magnitude];
}
function dot2(a: Vector2, b: Vector2) {
  return a[0] * b[0] + a[1] * b[1];
}
function distance2(a: Point3, b: Point3) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function distanceArrays(a: number[], b: number[]) {
  return Math.hypot(...a.map((value, index) => value - b[index]));
}
