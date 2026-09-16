export type Point3 = { x: number; y: number; z: number };
export type HandObservation = {
  landmarks: Point3[];
  worldLandmarks?: Point3[];
  handedness: string;
  confidence: number;
};
export type GestureFrame = {
  timeMs: number;
  hands: HandObservation[];
  poseLandmarks?: Point3[];
};
export type GestureKind = 'pose' | 'motion';
export type GestureComponent =
  | 'handshape'
  | 'position'
  | 'orientation'
  | 'movement'
  | 'coordination';
export type GestureScore = {
  overall: number;
  handshape: number;
  position: number;
  orientation: number;
  movement: number;
  coordination: number;
  detectionQuality: number;
  assessable: boolean;
  passed: boolean;
  feedback: string;
  gestureKind: GestureKind;
  requiredHandCount: 1 | 2;
  positionRelativeToBody: boolean;
  criticalMismatch: GestureComponent | null;
  confusableWith: string | null;
};

type Vector2 = [number, number];
type PreparedHand = {
  handedness: 'left' | 'right';
  shape: number[];
  position: number[];
  bodyPosition?: number[];
  orientation: number[];
  wrist: [number, number];
  physicalWrist: [number, number];
  physicalLandmarks: Vector2[];
  screenScale: number;
};
type PreparedFrame = { timeMs: number; hands: PreparedHand[] };
type BodyAnchor = {
  centerX: number;
  shoulderY: number;
  scale: number;
};
type MovementFrame = {
  hands: Array<{ handedness: string; trajectory: number[]; extent: number }>;
};
type Components = Pick<
  GestureScore,
  'handshape' | 'position' | 'orientation' | 'movement' | 'coordination'
>;

const PASS_THRESHOLD = 75;
const MIN_COMPONENT_SCORE = 50;
const MIN_HANDSHAPE_SCORE = PASS_THRESHOLD;
const MIN_HANDSHAPE_MATCH_RATIO = 0.6;
const MIN_TWO_HAND_HANDSHAPE_MATCH_RATIO = 0.4;
const MIN_MOVEMENT_SCORE = 70;
const MIN_BODY_POSITION_SCORE = 60;
const MIN_TWO_HAND_SHAPE_SCORE = 85;
const MIN_TWO_HAND_JOINT_MOVEMENT_SCORE = 85;
const MIN_TWO_HAND_ORIENTATION_SCORE = 85;
const MIN_TWO_HAND_COORDINATION_SCORE = 90;
const MIN_ALTERNATIVE_ADVANTAGE = 3;
const MIN_BODY_POSITION_COVERAGE = 0.8;
const MAX_BODY_OWNER_ERROR = 0.9;
const SEQUENCE_SAMPLES = 32;
const MIN_VISIBLE_FRAMES = 6;
const MIN_COVERAGE = 0.6;
const MIN_TWO_HAND_COVERAGE = 0.35;
const MIN_VISIBLE_DURATION_MS = 400;
const POSE_DOMINANT_CENTRAL_EXTENT = 0.2;
const TWO_HAND_REFERENCE_RATIO = 0.6;
const MIN_ATTEMPT_WINDOW_RATIO = 0.65;
const MAX_ATTEMPT_BOUNDARY_TRIM_RATIO = 0.3;
const MAX_BOUNDARY_CANDIDATES = 20;
const MAX_REFERENCE_BOUNDARY_SCAN_RATIO = 0.35;
const MIN_REFERENCE_CORE_RATIO = 0.55;
const REFERENCE_SETTLED_STEP_SCALE = 0.8;
const REFERENCE_SETTLED_STEPS = 2;
const MIN_REFERENCE_BOUNDARY_TRAVEL_SCALE = 1.5;
const MIN_EXTRA_HAND_FRAME_RATIO = 0.35;
const EXTRA_HAND_SIGNING_REGION_SCALE = 3.5;
const EXTRA_HAND_MOTION_SCALE = 0.8;
const HANDSHAPE_FEATURES_PER_FINGER = 7;
const HANDSHAPE_FEATURE_COUNT = HANDSHAPE_FEATURES_PER_FINGER * 5;
const INTER_HAND_CONTACT_DISTANCE = 0.75;
const MIN_REFERENCE_CONTACT_RATIO = 0.55;
const MIN_ATTEMPT_CONTACT_RATIO = 0.4;

export function smoothLiveHandObservations(
  currentHands: HandObservation[],
  previousHands: HandObservation[],
): HandObservation[] {
  if (!previousHands.length) return currentHands;

  const wristDistance = (currentIndex: number, previousIndex: number) => {
    const current = currentHands[currentIndex]?.landmarks[0];
    const previous = previousHands[previousIndex]?.landmarks[0];
    if (!current || !previous) return Number.POSITIVE_INFINITY;
    return Math.hypot(current.x - previous.x, current.y - previous.y);
  };
  const previousForCurrent = new Map<number, number>();

  if (currentHands.length === 2 && previousHands.length === 2) {
    const direct = wristDistance(0, 0) + wristDistance(1, 1);
    const swapped = wristDistance(0, 1) + wristDistance(1, 0);
    if (direct <= swapped) {
      previousForCurrent.set(0, 0);
      previousForCurrent.set(1, 1);
    } else {
      previousForCurrent.set(0, 1);
      previousForCurrent.set(1, 0);
    }
  } else {
    const candidates = currentHands.flatMap((_, currentIndex) =>
      previousHands.map((__, previousIndex) => ({
        currentIndex,
        previousIndex,
        distance: wristDistance(currentIndex, previousIndex),
      })),
    );
    const usedCurrent = new Set<number>();
    const usedPrevious = new Set<number>();
    for (const candidate of candidates.sort(
      (left, right) => left.distance - right.distance,
    )) {
      if (
        usedCurrent.has(candidate.currentIndex) ||
        usedPrevious.has(candidate.previousIndex)
      )
        continue;
      previousForCurrent.set(candidate.currentIndex, candidate.previousIndex);
      usedCurrent.add(candidate.currentIndex);
      usedPrevious.add(candidate.previousIndex);
    }
  }

  return currentHands.map((hand, currentIndex) => {
    const previousIndex = previousForCurrent.get(currentIndex);
    const previous =
      previousIndex === undefined ? undefined : previousHands[previousIndex];
    if (!previous || previous.landmarks.length !== hand.landmarks.length)
      return hand;

    const wrist = hand.landmarks[0];
    const previousWrist = previous.landmarks[0];
    const middleMcp = hand.landmarks[9];
    const indexMcp = hand.landmarks[5];
    const pinkyMcp = hand.landmarks[17];
    if (!wrist || !previousWrist || !middleMcp || !indexMcp || !pinkyMcp)
      return hand;

    const palmScale = Math.max(
      0.001,
      (Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y) +
        Math.hypot(indexMcp.x - pinkyMcp.x, indexMcp.y - pinkyMcp.y)) /
        2,
    );
    const wristMovement = Math.hypot(
      wrist.x - previousWrist.x,
      wrist.y - previousWrist.y,
    );
    const movementRatio = wristMovement / palmScale;
    const motionAlpha = Math.min(0.82, 0.35 + movementRatio * 0.8);
    const otherHand = currentHands.find((_, index) => index !== currentIndex);
    const otherWrist = otherHand?.landmarks[0];
    const handsOverlap =
      currentHands.length === 2 &&
      previousHands.length === 2 &&
      otherWrist &&
      Math.hypot(wrist.x - otherWrist.x, wrist.y - otherWrist.y) <
        palmScale * 3.2;
    const previousLabels = new Set(
      previousHands.map((candidate) => candidate.handedness.toLowerCase()),
    );

    return {
      ...hand,
      // MediaPipe can swap left/right labels for a few frames when the hands
      // cross. Wrist continuity is more reliable once both tracks exist.
      handedness:
        currentHands.length === 2 &&
        previousHands.length === 2 &&
        previousLabels.size === 2
          ? previous.handedness
          : hand.handedness,
      landmarks: hand.landmarks.map((landmark, index) => {
        const previousLandmark = previous.landmarks[index];
        const relativeJump = Math.hypot(
          landmark.x - wrist.x - (previousLandmark.x - previousWrist.x),
          landmark.y - wrist.y - (previousLandmark.y - previousWrist.y),
        );
        // Overlap failures usually move an individual joint much farther than
        // the wrist or its neighboring palm. Hold most of the prior skeleton
        // for that single frame, while genuine whole-hand motion stays quick.
        const isJointSpike = handsOverlap
          ? relativeJump > palmScale * 0.35 && wristMovement < palmScale * 0.7
          : relativeJump > palmScale * 0.75 && wristMovement < palmScale * 0.5;
        const alpha = isJointSpike ? (handsOverlap ? 0.08 : 0.15) : motionAlpha;
        return {
          x: previousLandmark.x + (landmark.x - previousLandmark.x) * alpha,
          y: previousLandmark.y + (landmark.y - previousLandmark.y) * alpha,
          z: previousLandmark.z + (landmark.z - previousLandmark.z) * alpha,
        };
      }),
    };
  });
}

export function selectBodyPoseLandmarks(
  candidatePoses: Point3[][],
  hands: HandObservation[],
): Point3[] | undefined {
  const ranked = candidatePoses
    .map((pose) => ({ pose, error: bodyPoseOwnershipError(pose, hands) }))
    .filter(({ error }) => Number.isFinite(error))
    .sort((left, right) => left.error - right.error);
  const best = ranked[0];
  return best && best.error <= MAX_BODY_OWNER_ERROR ? best.pose : undefined;
}

export function scoreGesture(
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
): GestureScore {
  const rawReference = prepareSequence(referenceFrames);
  const rawAttempt = prepareSequence(attemptFrames);
  const requiredHandCount = getRequiredHandCountFromPrepared(rawReference);
  const primaryHandedness = getPrimaryHandedness(rawReference);
  const selectedReference = selectRequiredHands(
    rawReference,
    requiredHandCount,
    primaryHandedness,
  ).filter((frame) => frame.hands.length === requiredHandCount);
  const reference = trimReferenceSetupAndExit(selectedReference);
  const gestureKind: GestureKind = isPoseDominantGesture(reference)
    ? 'pose'
    : 'motion';
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
      gestureKind,
      requiredHandCount,
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
      gestureKind,
      requiredHandCount,
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
  if (requiredHandCount === 1) {
    return hasSustainedExtraHand(rawAttempt, directAttempt)
      ? {
          ...direct,
          overall: Math.min(PASS_THRESHOLD - 1, direct.overall),
          passed: false,
          criticalMismatch: 'coordination',
          feedback:
            'Tangan kedua ikut aktif saat contoh memakai satu tangan. Ulangi dengan tangan yang digunakan pada contoh.',
        }
      : direct;
  }
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

export function scoreGestureWithAlternatives(
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
  alternatives: Array<{ label: string; frames: GestureFrame[] }>,
): GestureScore {
  const target = scoreGesture(referenceFrames, attemptFrames);
  if (!target.passed) return target;

  const closestAlternative = alternatives
    .map(({ label, frames }) => ({
      label,
      score: scoreGesture(frames, attemptFrames),
    }))
    .filter(({ score }) => score.assessable && score.passed)
    .sort((a, b) => b.score.overall - a.score.overall)[0];
  if (
    !closestAlternative ||
    closestAlternative.score.overall - target.overall <
      MIN_ALTERNATIVE_ADVANTAGE
  )
    return target;

  return {
    ...target,
    overall: Math.min(PASS_THRESHOLD - 1, target.overall),
    passed: false,
    criticalMismatch: 'handshape',
    confusableWith: closestAlternative.label,
    feedback: `Gerakan juga mirip tanda “${closestAlternative.label}”. Coba lagi dan perjelas ciri pembeda dari tanda yang diminta.`,
  };
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
    .reduce((best, result) => {
      if (result.passed !== best.passed) return result.passed ? result : best;
      if (result.overall !== best.overall)
        return result.overall > best.overall ? result : best;
      return weightedComponentScore(result, result.requiredHandCount) >
        weightedComponentScore(best, best.requiredHandCount)
        ? result
        : best;
    });
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
  const gestureKind: GestureKind = poseDominant ? 'pose' : 'motion';
  const requiredHandCount = getRequiredHandCountFromPrepared(reference);
  const positionRelativeToBody =
    hasBodyPositionCoverage(reference) && hasBodyPositionCoverage(attempt);
  const referenceMovement = movementSequence(reference);
  const attemptMovement = movementSequence(attempt);
  const comparePosition = (a: PreparedFrame, b: PreparedFrame) =>
    compareHandPositions(a, b, positionRelativeToBody);
  const handshapeMatch = robustHandshapeMetrics(
    reference,
    attempt,
    requiredHandCount,
  );
  const rawHandshapeScore = errorToScore(handshapeMatch.error, 0.7);
  const minimumHandshapeMatchRatio = handshapeMatch.minimumMatchRatio;
  const handshapeFrameMatchRatio = handshapeMatch.matchRatio;
  // Keep the displayed component aligned with the pass gate. A brief match
  // cannot appear "Baik" when most of the recorded sign had another shape.
  const handshapeScore =
    handshapeFrameMatchRatio < minimumHandshapeMatchRatio
      ? Math.min(rawHandshapeScore, roundScore(handshapeFrameMatchRatio * 100))
      : rawHandshapeScore;
  const components: Components = {
    handshape: handshapeScore,
    position: errorToScore(
      poseDominant
        ? robustPoseError(reference, attempt, comparePosition)
        : dtwError(reference, attempt, comparePosition),
      requiredHandCount === 2 ? 0.45 : 0.3,
    ),
    orientation: errorToScore(
      robustPoseError(reference, attempt, compareOrientation),
      0.62,
    ),
    movement: errorToScore(
      poseDominant
        ? poseHoldError(reference, rawAttempt)
        : Math.max(
            dtwError(referenceMovement, attemptMovement, compareMovement),
            movementDirectionError(referenceMovement, attemptMovement),
            movementExtentError(referenceMovement, attemptMovement),
          ),
      0.35,
    ),
    coordination: errorToScore(
      coordinationSequenceError(reference, attempt),
      0.24,
    ),
  };

  // Coordination is not evidence for a one-hand sign. Renormalize the useful
  // components instead of letting an automatic 100 inflate its total.
  const weighted = weightedComponentScore(components, requiredHandCount);
  // Coverage is already enforced before scoring. Multiplying by it again would
  // punish detector occlusion twice, especially when two hands overlap.
  const weightedScore = roundScore(weighted);
  const weakest = weakestComponent(components);
  const weakestCore = weakestComponent({
    ...components,
    position: positionRelativeToBody ? components.position : 100,
    coordination: requiredHandCount === 2 ? components.coordination : 100,
  });
  // A severe mismatch must not be hidden by perfect unrelated components.
  // Screen position alone cannot establish placement relative to the body.
  // Position becomes a required semantic component only when both recordings
  // have a stable shoulder/torso anchor from Pose Landmarker.
  const handshapeMismatch =
    components.handshape < MIN_HANDSHAPE_SCORE ||
    handshapeFrameMatchRatio < minimumHandshapeMatchRatio;
  const twoHandWeakness =
    requiredHandCount === 2
      ? components.handshape < MIN_TWO_HAND_SHAPE_SCORE
        ? 'handshape'
        : components.coordination < MIN_TWO_HAND_COORDINATION_SCORE &&
            components.movement < MIN_TWO_HAND_JOINT_MOVEMENT_SCORE
          ? 'movement'
          : components.coordination < MIN_TWO_HAND_COORDINATION_SCORE &&
              components.orientation < MIN_TWO_HAND_ORIENTATION_SCORE
            ? 'coordination'
            : null
      : null;
  const criticalWeakness = handshapeMismatch
    ? 'handshape'
    : twoHandWeakness
      ? twoHandWeakness
      : positionRelativeToBody && components.position < MIN_BODY_POSITION_SCORE
        ? 'position'
        : components.movement < MIN_MOVEMENT_SCORE
          ? 'movement'
          : components[weakestCore] < MIN_COMPONENT_SCORE
            ? weakestCore
            : null;
  const overall = criticalWeakness
    ? Math.min(PASS_THRESHOLD - 1, weightedScore)
    : weightedScore;

  return {
    overall,
    ...components,
    detectionQuality,
    assessable: true,
    passed: overall >= PASS_THRESHOLD,
    feedback: feedbackFor(
      overall,
      criticalWeakness ?? weakest,
      gestureKind,
      positionRelativeToBody,
    ),
    gestureKind,
    requiredHandCount,
    positionRelativeToBody,
    criticalMismatch: criticalWeakness,
    confusableWith: null,
  };
}

function weightedComponentScore(
  components: Components,
  requiredHandCount: 1 | 2,
) {
  return requiredHandCount === 2
    ? components.handshape * 0.35 +
        components.movement * 0.25 +
        components.orientation * 0.2 +
        components.position * 0.1 +
        components.coordination * 0.1
    : components.handshape * 0.39 +
        components.movement * 0.28 +
        components.orientation * 0.22 +
        components.position * 0.11;
}

function hasSustainedExtraHand(
  rawAttempt: PreparedFrame[],
  selectedAttempt: PreparedFrame[],
) {
  const extraFrames = rawAttempt.flatMap((frame, index) => {
    const primary = selectedAttempt[index]?.hands[0];
    if (!primary || frame.hands.length !== 2) return [];
    const extra = frame.hands.find(
      (hand) => hand.handedness !== primary.handedness,
    );
    return extra ? [{ timeMs: frame.timeMs, primary, extra }] : [];
  });
  if (
    extraFrames.length < MIN_VISIBLE_FRAMES ||
    extraFrames.length / rawAttempt.length < MIN_EXTRA_HAND_FRAME_RATIO ||
    extraFrames.at(-1)!.timeMs - extraFrames[0].timeMs < MIN_VISIBLE_DURATION_MS
  )
    return false;

  const scales = extraFrames.map(({ extra }) => extra.screenScale);
  const scale = Math.max(0.001, median(scales));
  const closeToSigningHand =
    extraFrames.filter(
      ({ primary, extra }) =>
        distanceArrays(primary.physicalWrist, extra.physicalWrist) <=
        EXTRA_HAND_SIGNING_REGION_SCALE *
          average([primary.screenScale, extra.screenScale]),
    ).length /
      extraFrames.length >=
    0.5;
  const wrists = extraFrames.map(({ extra }) => extra.physicalWrist);
  const wristMotion =
    Math.hypot(
      percentile(
        wrists.map(([x]) => x),
        0.9,
      ) -
        percentile(
          wrists.map(([x]) => x),
          0.1,
        ),
      percentile(
        wrists.map(([, y]) => y),
        0.9,
      ) -
        percentile(
          wrists.map(([, y]) => y),
          0.1,
        ),
    ) /
      scale >=
    EXTRA_HAND_MOTION_SCALE;
  return closeToSigningHand || wristMotion;
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
  const identityStableFrames = stabilizeHandIdentities(frames);
  const prepared = identityStableFrames.map((frame) => {
    const bodyAnchor = prepareBodyAnchor(frame.poseLandmarks, frame.hands);
    const hands = frame.hands
      .map((hand) => prepareHand(hand, bodyAnchor))
      .filter((hand): hand is PreparedHand => hand !== null)
      .sort((a, b) => a.handedness.localeCompare(b.handedness));
    let resolvedHands = hands;
    if (
      hands.length === 2 &&
      hands[0].handedness === hands[1].handedness &&
      Math.abs(hands[0].physicalWrist[0] - hands[1].physicalWrist[0]) > 0.04
    ) {
      const sortedByX = [...hands].sort(
        (a, b) => a.physicalWrist[0] - b.physicalWrist[0],
      );
      resolvedHands = [
        { ...sortedByX[0], handedness: 'left' },
        { ...sortedByX[1], handedness: 'right' },
      ];
    }
    return {
      timeMs: frame.timeMs,
      // Ambiguous duplicate identities cannot be matched reliably.
      hands:
        new Set(resolvedHands.map((hand) => hand.handedness)).size ===
        resolvedHands.length
          ? resolvedHands
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

function stabilizeHandIdentities(frames: GestureFrame[]): GestureFrame[] {
  const twoHandStabilized = stabilizeTwoHandIdentities(frames);

  // If the sequence is predominantly single-hand, stabilize the single hand's identity
  // to avoid MediaPipe's palm-up / edge-on handedness jitter (which flips 'Left'/'Right'
  // between frames, causing sporadic horizontal mirroring inside the same sign).
  const singleHandFrames = twoHandStabilized.filter(
    (f) => f.hands.length === 1,
  );
  if (!singleHandFrames.length) return twoHandStabilized;

  const twoHandFrames = twoHandStabilized.filter((f) => f.hands.length >= 2);
  const isPredominantlySingleHand =
    singleHandFrames.length > twoHandFrames.length;

  if (isPredominantlySingleHand) {
    const counts = { left: 0, right: 0 };
    for (const frame of singleHandFrames) {
      const label = frame.hands[0].handedness.toLowerCase();
      if (label === 'left' || label === 'right') {
        counts[label] += 1;
      }
    }
    const dominant = counts.right >= counts.left ? 'Right' : 'Left';
    return twoHandStabilized.map((frame) => {
      if (frame.hands.length === 1) {
        return {
          ...frame,
          hands: [{ ...frame.hands[0], handedness: dominant }],
        };
      }
      return frame;
    });
  }

  // In a two-hand sequence, resolve single-hand frames based on proximity to previous positions
  let lastKnown: Record<'left' | 'right', Vector2> | null = null;
  return twoHandStabilized.map((frame) => {
    if (frame.hands.length === 2) {
      const leftHand = frame.hands.find(
        (h) => h.handedness.toLowerCase() === 'left',
      );
      const rightHand = frame.hands.find(
        (h) => h.handedness.toLowerCase() === 'right',
      );
      if (leftHand?.landmarks[0] && rightHand?.landmarks[0]) {
        lastKnown = {
          left: [leftHand.landmarks[0].x, leftHand.landmarks[0].y],
          right: [rightHand.landmarks[0].x, rightHand.landmarks[0].y],
        };
      }
      return frame;
    }
    if (frame.hands.length === 1 && lastKnown) {
      const wrist = frame.hands[0].landmarks[0];
      if (wrist && Number.isFinite(wrist.x) && Number.isFinite(wrist.y)) {
        const dLeft = distanceArrays([wrist.x, wrist.y], lastKnown.left);
        const dRight = distanceArrays([wrist.x, wrist.y], lastKnown.right);
        const assigned = dLeft <= dRight ? 'Left' : 'Right';
        lastKnown[assigned.toLowerCase() as 'left' | 'right'] = [
          wrist.x,
          wrist.y,
        ];
        return {
          ...frame,
          hands: [{ ...frame.hands[0], handedness: assigned }],
        };
      }
    }
    return frame;
  });
}

function stabilizeTwoHandIdentities(frames: GestureFrame[]): GestureFrame[] {
  let previous: Record<'left' | 'right', Vector2> | null = null;

  return frames.map((frame) => {
    if (frame.hands.length !== 2) return frame;
    const wrists = frame.hands.map((hand) => {
      const wrist = hand.landmarks[0];
      return wrist && Number.isFinite(wrist.x) && Number.isFinite(wrist.y)
        ? ([wrist.x, wrist.y] as Vector2)
        : null;
    });
    if (!wrists[0] || !wrists[1]) return frame;

    let leftIndex: number;
    let rightIndex: number;
    const labels = frame.hands.map((hand) => hand.handedness.toLowerCase());
    const detectedLeft = labels.indexOf('left');
    const detectedRight = labels.indexOf('right');
    const hasDistinctDetectedLabels = detectedLeft >= 0 && detectedRight >= 0;
    if (previous) {
      const directCost =
        distanceArrays(wrists[0], previous.left) +
        distanceArrays(wrists[1], previous.right);
      const swappedCost =
        distanceArrays(wrists[1], previous.left) +
        distanceArrays(wrists[0], previous.right);
      if (
        hasDistinctDetectedLabels &&
        Math.abs(directCost - swappedCost) < 0.01
      ) {
        [leftIndex, rightIndex] = [detectedLeft, detectedRight];
      } else {
        [leftIndex, rightIndex] = directCost <= swappedCost ? [0, 1] : [1, 0];
      }
    } else {
      if (hasDistinctDetectedLabels) {
        [leftIndex, rightIndex] = [detectedLeft, detectedRight];
      } else if (distanceArrays(wrists[0], wrists[1]) > 0.04) {
        [leftIndex, rightIndex] =
          wrists[0][0] <= wrists[1][0] ? [0, 1] : [1, 0];
      } else {
        // Two near-identical detections with the same label are commonly a
        // duplicate of one hand. Leave them ambiguous so they cannot turn a
        // one-hand sign into a two-hand reference.
        return frame;
      }
    }

    previous = {
      left: wrists[leftIndex]!,
      right: wrists[rightIndex]!,
    };
    return {
      ...frame,
      hands: [
        { ...frame.hands[leftIndex], handedness: 'Left' },
        { ...frame.hands[rightIndex], handedness: 'Right' },
      ],
    };
  });
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
  if (!prepared.length) return false;
  const requiredHandCount = getRequiredHandCountFromPrepared(prepared);
  const minCoverage =
    requiredHandCount === 2 ? MIN_TWO_HAND_COVERAGE : MIN_COVERAGE;
  const visibleFrames = selectRequiredHands(
    prepared,
    requiredHandCount,
    getPrimaryHandedness(prepared),
  ).filter((frame) => frame.hands.length === requiredHandCount);
  return (
    visibleFrames.length >= MIN_VISIBLE_FRAMES &&
    hasEnoughDuration(visibleFrames) &&
    visibleFrames.length / prepared.length >= minCoverage
  );
}

export function getRequiredHandCount(frames: GestureFrame[]) {
  return getRequiredHandCountFromPrepared(prepareSequence(frames));
}

export function getReferenceGestureWindow(frames: GestureFrame[]) {
  const prepared = prepareSequence(frames);
  if (!prepared.length) return null;
  const requiredHandCount = getRequiredHandCountFromPrepared(prepared);
  const selected = selectRequiredHands(
    prepared,
    requiredHandCount,
    getPrimaryHandedness(prepared),
  ).filter((frame) => frame.hands.length === requiredHandCount);
  const gesture = trimReferenceSetupAndExit(selected);
  if (gesture.length < 2) return null;
  return {
    startMs: gesture[0].timeMs,
    endMs: gesture[gesture.length - 1].timeMs,
  };
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

function trimReferenceSetupAndExit(sequence: PreparedFrame[]) {
  if (sequence.length < MIN_VISIBLE_FRAMES + REFERENCE_SETTLED_STEPS * 2)
    return sequence;

  const handScale = median(
    sequence.flatMap((frame) => frame.hands.map((hand) => hand.screenScale)),
  );
  const positions = sequence.map(
    (frame) =>
      [
        average(frame.hands.map((hand) => hand.wrist[0])),
        average(frame.hands.map((hand) => hand.wrist[1])),
      ] as Vector2,
  );
  const settledStep = handScale * REFERENCE_SETTLED_STEP_SCALE;
  const minimumBoundaryTravel = handScale * MIN_REFERENCE_BOUNDARY_TRAVEL_SCALE;
  const scanFrames = Math.min(
    Math.floor(sequence.length * MAX_REFERENCE_BOUNDARY_SCAN_RATIO),
    sequence.length - MIN_VISIBLE_FRAMES,
  );

  const isSettledAfter = (index: number) =>
    Array.from({ length: REFERENCE_SETTLED_STEPS }, (_, offset) =>
      distanceArrays(positions[index + offset], positions[index + offset + 1]),
    ).every((distance) => distance <= settledStep);
  const isSettledBefore = (index: number) =>
    Array.from({ length: REFERENCE_SETTLED_STEPS }, (_, offset) =>
      distanceArrays(positions[index - offset], positions[index - offset - 1]),
    ).every((distance) => distance <= settledStep);

  let start = 0;
  for (let index = 1; index <= scanFrames; index += 1) {
    if (
      index + REFERENCE_SETTLED_STEPS < sequence.length &&
      positions[0][1] - positions[index][1] > minimumBoundaryTravel &&
      isSettledAfter(index)
    ) {
      start = index;
      break;
    }
  }

  let end = sequence.length - 1;
  for (
    let index = sequence.length - 2;
    index >= sequence.length - 1 - scanFrames;
    index -= 1
  ) {
    if (
      index - REFERENCE_SETTLED_STEPS >= 0 &&
      positions[sequence.length - 1][1] - positions[index][1] >
        minimumBoundaryTravel &&
      isSettledBefore(index)
    ) {
      end = index;
      break;
    }
  }

  // Reference videos start and end with the signer lifting a relaxed hand from
  // below the camera. Remove those transitions only when they travel clearly
  // upward/downward by more than a palm-sized distance. This keeps lexical
  // motion, including signs that intentionally move down, inside the window.
  const trimStart =
    start > 0 && positions[0][1] - positions[start][1] >= minimumBoundaryTravel
      ? start
      : 0;
  const trimEnd =
    end < sequence.length - 1 &&
    positions.at(-1)![1] - positions[end][1] >= minimumBoundaryTravel
      ? end
      : sequence.length - 1;
  const candidate = sequence.slice(trimStart, trimEnd + 1);
  return candidate.length >=
    Math.max(
      MIN_VISIBLE_FRAMES,
      Math.ceil(sequence.length * MIN_REFERENCE_CORE_RATIO),
    ) && hasEnoughDuration(candidate)
    ? candidate
    : sequence;
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
            bodyPosition:
              hand.bodyPosition && next.bodyPosition
                ? mix(hand.bodyPosition, next.bodyPosition)
                : undefined,
            orientation: normalizeVector(
              mix(hand.orientation, next.orientation),
            ),
            wrist: mix(hand.wrist, next.wrist) as [number, number],
            physicalWrist: mix(hand.physicalWrist, next.physicalWrist) as [
              number,
              number,
            ],
            physicalLandmarks: hand.physicalLandmarks.map(
              (point, pointIndex) =>
                mix(point, next.physicalLandmarks[pointIndex]) as Vector2,
            ),
            screenScale:
              hand.screenScale + (next.screenScale - hand.screenScale) * weight,
          },
        ];
      }),
    };
  });
}

function prepareBodyAnchor(
  landmarks: Point3[] | undefined,
  hands: HandObservation[],
): BodyAnchor | null {
  const anchor = bodyAnchorGeometry(landmarks);
  if (!anchor || !landmarks) return null;
  return bodyPoseOwnershipError(landmarks, hands) <= MAX_BODY_OWNER_ERROR
    ? anchor
    : null;
}

function bodyAnchorGeometry(
  landmarks: Point3[] | undefined,
): BodyAnchor | null {
  if (!landmarks || landmarks.length < 25) return null;
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  if (
    [leftShoulder, rightShoulder, leftHip, rightHip].some(
      (point) => !point || ![point.x, point.y, point.z].every(Number.isFinite),
    )
  )
    return null;

  const shoulderWidth = distance2(leftShoulder, rightShoulder);
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const torsoHeight = Math.abs(hipY - shoulderY);
  const scale = Math.max(shoulderWidth, torsoHeight * 0.55);
  if (shoulderWidth < 0.04 || scale < 0.05) return null;

  return {
    centerX: (leftShoulder.x + rightShoulder.x) / 2,
    shoulderY,
    scale,
  };
}

function bodyPoseOwnershipError(landmarks: Point3[], hands: HandObservation[]) {
  const anchor = bodyAnchorGeometry(landmarks);
  if (!anchor || !hands.length || landmarks.length < 17)
    return Number.POSITIVE_INFINITY;
  const handWrists = hands
    .map((hand) => hand.landmarks[0])
    .filter(
      (point): point is Point3 =>
        Boolean(point) && [point.x, point.y].every(Number.isFinite),
    )
    .slice(0, 2);
  const poseWrists = [landmarks[15], landmarks[16]].filter(
    (point): point is Point3 =>
      Boolean(point) && [point.x, point.y].every(Number.isFinite),
  );
  if (!handWrists.length || poseWrists.length < 2)
    return Number.POSITIVE_INFINITY;

  const normalizedDistance = (hand: Point3, wrist: Point3) =>
    distance2(hand, wrist) / anchor.scale;
  if (handWrists.length === 1)
    return Math.min(
      ...poseWrists.map((wrist) => normalizedDistance(handWrists[0], wrist)),
    );

  return Math.min(
    average([
      normalizedDistance(handWrists[0], poseWrists[0]),
      normalizedDistance(handWrists[1], poseWrists[1]),
    ]),
    average([
      normalizedDistance(handWrists[0], poseWrists[1]),
      normalizedDistance(handWrists[1], poseWrists[0]),
    ]),
  );
}

function prepareHand(
  hand: HandObservation,
  bodyAnchor: BodyAnchor | null,
): PreparedHand | null {
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
  const horizontalBodyOffset = bodyAnchor
    ? (physicalScreenWrist.x - bodyAnchor.centerX) / bodyAnchor.scale
    : null;

  return {
    handedness,
    shape: handshapeFeatures(shape),
    position: [screenWrist.x, screenWrist.y],
    bodyPosition:
      bodyAnchor && horizontalBodyOffset !== null
        ? [
            handedness === 'left'
              ? -horizontalBodyOffset
              : horizontalBodyOffset,
            (physicalScreenWrist.y - bodyAnchor.shoulderY) / bodyAnchor.scale,
          ]
        : undefined,
    orientation: [...side, ...forward],
    wrist: [screenWrist.x, screenWrist.y],
    // Inter-hand distances must stay in one shared, unmirrored coordinate space.
    physicalWrist: [physicalScreenWrist.x, physicalScreenWrist.y],
    physicalLandmarks: hand.landmarks.map((landmark) => [
      landmark.x,
      landmark.y,
    ]),
    screenScale,
  };
}

function handshapeFeatures(localCoordinates: number[]) {
  const points = Array.from({ length: 21 }, (_, index) =>
    localCoordinates.slice(index * 2, index * 2 + 2),
  ) as Vector2[];
  const fingers = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [0, 9, 10, 11, 12],
    [0, 13, 14, 15, 16],
    [0, 17, 18, 19, 20],
  ] as const;
  return fingers.flatMap((finger) => {
    const jointAngles = [1, 2, 3].map((index) => {
      const incoming: Vector2 = [
        points[finger[index]][0] - points[finger[index - 1]][0],
        points[finger[index]][1] - points[finger[index - 1]][1],
      ];
      const outgoing: Vector2 = [
        points[finger[index + 1]][0] - points[finger[index]][0],
        points[finger[index + 1]][1] - points[finger[index]][1],
      ];
      return dot2(normalize2(incoming), normalize2(outgoing));
    });
    const boneLength = finger
      .slice(1)
      .reduce<number>((total, pointIndex, index) => {
        const previous = points[finger[index]];
        const point = points[pointIndex];
        return (
          total + Math.hypot(point[0] - previous[0], point[1] - previous[1])
        );
      }, 0);
    const base = points[finger[1]];
    const tip = points[finger[4]];
    const extension = boneLength
      ? Math.hypot(tip[0] - base[0], tip[1] - base[1]) / boneLength
      : 0;
    const tipDirection = normalize2([tip[0], tip[1]]);
    // The normalized fingertip radius is stable when an inner joint flickers
    // behind the other hand, but it changes when the finger is truly folded or
    // extended. It gives overlap recovery a semantic anchor.
    return [
      ...jointAngles,
      extension,
      ...tipDirection,
      Math.hypot(tip[0], tip[1]),
    ];
  });
}

function compareHands(
  a: PreparedFrame,
  b: PreparedFrame,
  select: (hand: PreparedHand) => number[],
) {
  return compareMatchedHands(a, b, (hand, matched) =>
    vectorRms(select(hand), select(matched)),
  );
}

function compareHandPositions(
  a: PreparedFrame,
  b: PreparedFrame,
  relativeToBody: boolean,
) {
  return compareMatchedHands(a, b, (hand, matched) => {
    const referencePosition =
      relativeToBody && hand.bodyPosition ? hand.bodyPosition : hand.position;
    const attemptPosition =
      relativeToBody && matched.bodyPosition
        ? matched.bodyPosition
        : matched.position;
    return vectorRms(referencePosition, attemptPosition);
  });
}

function compareMatchedHands(
  a: PreparedFrame,
  b: PreparedFrame,
  compare: (hand: PreparedHand, matched: PreparedHand) => number,
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
    return matched ? compare(hand, matched) : 4;
  });
  return average(errors) + Math.abs(a.hands.length - b.hands.length) * 0.5;
}

function hasBodyPositionCoverage(sequence: PreparedFrame[]) {
  const hands = sequence.flatMap((frame) => frame.hands);
  if (!hands.length) return false;
  return (
    hands.filter((hand) => hand.bodyPosition).length / hands.length >=
    MIN_BODY_POSITION_COVERAGE
  );
}

function robustHandshapeMetrics(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  requiredHandCount: 1 | 2,
) {
  const allowIndependentFrameRecovery =
    requiredHandCount === 2 &&
    hasSustainedHandOverlap(reference) &&
    hasSustainedHandOverlap(attempt);
  if (requiredHandCount === 1 || !allowIndependentFrameRecovery) {
    const metrics = robustPoseMetrics(reference, attempt, compareHandshape);
    return {
      error: metrics.error,
      matchRatio:
        metrics.nearestErrors.filter(
          (error) => errorToScore(error, 0.7) >= MIN_HANDSHAPE_SCORE,
        ).length / metrics.nearestErrors.length,
      minimumMatchRatio: MIN_HANDSHAPE_MATCH_RATIO,
    };
  }

  // Overlapping hands are rarely reliable in the same video frame: MediaPipe
  // often gets one skeleton right while the other flickers, then swaps which
  // one is clean. Grade each physical hand across time before combining them.
  // This still requires BOTH hands to show the expected shape for a sustained
  // portion of the recording, so one correct hand cannot hide a consistently
  // different second hand.
  const perHand = (['left', 'right'] as const).map((handedness) => {
    const referenceHands = reference.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === handedness,
      );
      return hand ? [hand] : [];
    });
    const nearestErrors = attempt.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === handedness,
      );
      if (!hand || !referenceHands.length) return [];
      return [
        Math.min(
          ...referenceHands.map((referenceHand) =>
            handshapeDistance(referenceHand.shape, hand.shape, 0.08),
          ),
        ),
      ];
    });
    if (!nearestErrors.length) return { error: 4, matchRatio: 0 };
    const reliableCount = Math.max(
      1,
      Math.ceil(nearestErrors.length * MIN_TWO_HAND_HANDSHAPE_MATCH_RATIO),
    );
    const reliableErrors = [...nearestErrors]
      .sort((left, right) => left - right)
      .slice(0, reliableCount);
    return {
      error: average(reliableErrors),
      matchRatio:
        nearestErrors.filter(
          (error) => errorToScore(error, 0.7) >= MIN_TWO_HAND_SHAPE_SCORE,
        ).length / nearestErrors.length,
    };
  });

  return {
    error: Math.max(...perHand.map((metrics) => metrics.error)),
    matchRatio: Math.min(...perHand.map((metrics) => metrics.matchRatio)),
    minimumMatchRatio: MIN_TWO_HAND_HANDSHAPE_MATCH_RATIO,
  };
}

function hasSustainedHandOverlap(sequence: PreparedFrame[]) {
  const twoHandFrames = sequence.filter((frame) => frame.hands.length === 2);
  if (!twoHandFrames.length) return false;
  const overlappingFrames = twoHandFrames.filter((frame) => {
    const [first, second] = frame.hands;
    const scale = average([first.screenScale, second.screenScale]);
    return (
      distanceArrays(first.physicalWrist, second.physicalWrist) / scale < 3.2
    );
  });
  return overlappingFrames.length / twoHandFrames.length >= 0.5;
}

function compareHandshape(a: PreparedFrame, b: PreparedFrame) {
  if (a.hands.length < 2) {
    const source = a.hands[0];
    const matched = b.hands[0];
    return source && matched
      ? handshapeDistance(source.shape, matched.shape, 0)
      : 4;
  }
  // One incorrect hand must not be concealed by a perfect other hand.
  return Math.max(
    ...a.hands.map((hand) => {
      const matched = b.hands.find(
        (candidate) => candidate.handedness === hand.handedness,
      );
      return matched ? handshapeDistance(hand.shape, matched.shape, 0.08) : 4;
    }),
  );
}

function handshapeDistance(
  reference: number[],
  attempt: number[],
  occlusionRecoveryPenalty: number,
) {
  if (
    reference.length !== HANDSHAPE_FEATURE_COUNT ||
    attempt.length !== HANDSHAPE_FEATURE_COUNT
  )
    return 4;
  const perFinger = Array.from({ length: 5 }, (_, index) =>
    vectorRms(
      reference.slice(
        index * HANDSHAPE_FEATURES_PER_FINGER,
        index * HANDSHAPE_FEATURES_PER_FINGER + HANDSHAPE_FEATURES_PER_FINGER,
      ),
      attempt.slice(
        index * HANDSHAPE_FEATURES_PER_FINGER,
        index * HANDSHAPE_FEATURES_PER_FINGER + HANDSHAPE_FEATURES_PER_FINGER,
      ),
    ),
  );
  const detailedDistance = Math.max(
    vectorRms(reference, attempt),
    Math.max(...perFinger) * 0.7,
  );

  // Joint angles become noisy when curled fingers overlap or the camera sees
  // the hand edge-on. The base-to-tip extension pattern remains much more
  // stable and still distinguishes which fingers are open or closed. Allow a
  // matching extension pattern to recover from noisy inner joints, while the
  // largest per-finger mismatch keeps a missing/extra extended finger strict.
  const extensionDifferences = Array.from({ length: 5 }, (_, index) =>
    Math.abs(
      reference[index * HANDSHAPE_FEATURES_PER_FINGER + 3] -
        attempt[index * HANDSHAPE_FEATURES_PER_FINGER + 3],
    ),
  );
  const tipDirectionDistance = vectorRms(
    Array.from({ length: 5 }, (_, index) =>
      reference.slice(
        index * HANDSHAPE_FEATURES_PER_FINGER + 4,
        index * HANDSHAPE_FEATURES_PER_FINGER + 6,
      ),
    ).flat(),
    Array.from({ length: 5 }, (_, index) =>
      attempt.slice(
        index * HANDSHAPE_FEATURES_PER_FINGER + 4,
        index * HANDSHAPE_FEATURES_PER_FINGER + 6,
      ),
    ).flat(),
  );
  const tipRadiusDifferences = Array.from({ length: 5 }, (_, index) =>
    Math.abs(
      reference[index * HANDSHAPE_FEATURES_PER_FINGER + 6] -
        attempt[index * HANDSHAPE_FEATURES_PER_FINGER + 6],
    ),
  );
  const extensionPatternDistance = Math.max(
    Math.sqrt(
      average(extensionDifferences.map((difference) => difference ** 2)),
    ),
    Math.max(...extensionDifferences) * 0.8,
    tipDirectionDistance * 0.25,
    Math.sqrt(
      average(tipRadiusDifferences.map((difference) => difference ** 2)),
    ) * 0.65,
    Math.max(...tipRadiusDifferences) * 0.5,
  );
  return Math.min(
    detailedDistance,
    extensionPatternDistance + occlusionRecoveryPenalty,
  );
}

function compareOrientation(a: PreparedFrame, b: PreparedFrame) {
  return compareHands(a, b, (hand) => hand.orientation);
}

function robustPoseError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  distance: (left: PreparedFrame, right: PreparedFrame) => number,
) {
  return robustPoseMetrics(reference, attempt, distance).error;
}

function robustPoseMetrics(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  distance: (left: PreparedFrame, right: PreparedFrame) => number,
) {
  const sequenceError = dtwError(reference, attempt, distance);
  // A learner can start with a relaxed hand and then hold the correct sign.
  // Require a sustained matching portion instead of grading preparation frames
  // as if they were part of the sign's handshape or orientation.
  const nearestErrors = attempt.map((frame) =>
    Math.min(
      ...reference.map((referenceFrame) => distance(referenceFrame, frame)),
    ),
  );
  // A short accidental match must not certify an otherwise different sign.
  // Boundary trimming already handles reaction and rest time; require the
  // selected gesture as a whole to retain the expected pose.
  return {
    error: Math.min(sequenceError, average(nearestErrors)),
    nearestErrors,
  };
}

function coordinationSequenceError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
) {
  if (reference.every((frame) => frame.hands.length < 2)) return 0;
  const contactRatio = (sequence: PreparedFrame[]) => {
    const distances = sequence.flatMap((frame) => {
      const distance = interHandContactDistance(frame);
      return distance === null ? [] : [distance];
    });
    return distances.length
      ? distances.filter((distance) => distance < INTER_HAND_CONTACT_DISTANCE)
          .length / distances.length
      : 0;
  };
  const referenceContactRatio = contactRatio(reference);
  if (referenceContactRatio >= MIN_REFERENCE_CONTACT_RATIO) {
    // For contact signs such as Teman, exact wrist spacing is signer-specific.
    // What matters is that the expected fingertip/hand contact is sustained;
    // each hand's trajectory and orientation are graded separately.
    const attemptContactRatio = contactRatio(attempt);
    const requiredContactRatio = Math.max(
      MIN_ATTEMPT_CONTACT_RATIO,
      referenceContactRatio - 0.25,
    );
    return attemptContactRatio >= requiredContactRatio
      ? 0
      : (requiredContactRatio - attemptContactRatio) * 0.8;
  }
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

function interHandContactDistance(frame: PreparedFrame) {
  if (frame.hands.length < 2) return null;
  const [first, second] = frame.hands;
  const scale = average([first.screenScale, second.screenScale]);
  let closest = Number.POSITIVE_INFINITY;
  for (const firstPoint of first.physicalLandmarks) {
    for (const secondPoint of second.physicalLandmarks) {
      closest = Math.min(closest, distanceArrays(firstPoint, secondPoint));
    }
  }
  return closest / scale;
}

function movementSequence(sequence: PreparedFrame[]): MovementFrame[] {
  const anchors = new Map<
    string,
    {
      x: number;
      y: number;
      handScale: number;
      pathScale: number;
      extent: number;
    }
  >();
  for (const identity of ['left', 'right']) {
    const hands = sequence.flatMap((frame) =>
      frame.hands.filter((hand) => hand.handedness === identity),
    );
    if (hands.length) {
      const handScale = median(hands.map((hand) => hand.screenScale));
      const xs = hands.map((hand) => hand.wrist[0]);
      const ys = hands.map((hand) => hand.wrist[1]);
      const extent =
        Math.hypot(
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
        ) / handScale;
      anchors.set(identity, {
        x: median(xs),
        y: median(ys),
        handScale,
        pathScale: Math.max(POSE_DOMINANT_CENTRAL_EXTENT, extent),
        extent,
      });
    }
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
            (hand.wrist[0] - anchor.x) / (anchor.handScale * anchor.pathScale),
            (hand.wrist[1] - anchor.y) / (anchor.handScale * anchor.pathScale),
          ],
          extent: anchor.extent,
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

function movementExtentError(
  reference: MovementFrame[],
  attempt: MovementFrame[],
) {
  const compareExtents = (referenceExtent: number, attemptExtent: number) => {
    if (referenceExtent >= POSE_DOMINANT_CENTRAL_EXTENT) {
      if (attemptExtent < 0.05) return 4;
      return (
        Math.abs(Math.log((attemptExtent + 0.1) / (referenceExtent + 0.1))) *
        0.12
      );
    }
    return Math.max(
      0,
      attemptExtent -
        Math.max(POSE_DOMINANT_CENTRAL_EXTENT, referenceExtent * 2),
    );
  };
  if (
    reference.every((frame) => frame.hands.length <= 1) &&
    attempt.every((frame) => frame.hands.length <= 1)
  ) {
    const referenceHand = reference.find((frame) => frame.hands.length)
      ?.hands[0];
    const attemptHand = attempt.find((frame) => frame.hands.length)?.hands[0];
    return referenceHand && attemptHand
      ? compareExtents(referenceHand.extent, attemptHand.extent)
      : 4;
  }
  const errors = ['left', 'right'].flatMap((handedness) => {
    const referenceHand = reference
      .flatMap((frame) => frame.hands)
      .find((hand) => hand.handedness === handedness);
    const attemptHand = attempt
      .flatMap((frame) => frame.hands)
      .find((hand) => hand.handedness === handedness);
    if (!referenceHand || !attemptHand) return [];
    return [compareExtents(referenceHand.extent, attemptHand.extent)];
  });
  return errors.length ? average(errors) : 4;
}

function movementDirectionError(
  reference: MovementFrame[],
  attempt: MovementFrame[],
) {
  const directionError = (
    referencePath: number[][],
    attemptPath: number[][],
  ) => {
    if (referencePath.length < 2 || attemptPath.length < 2) return null;
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
    if (referenceMagnitude < POSE_DOMINANT_CENTRAL_EXTENT) return null;
    if (attemptMagnitude < 0.05) return 4;
    const cosine = clamp(
      (referenceDelta[0] * attemptDelta[0] +
        referenceDelta[1] * attemptDelta[1]) /
        (referenceMagnitude * attemptMagnitude),
      -1,
      1,
    );
    return Math.max(0, (1 - cosine) * 0.25);
  };
  if (
    reference.every((frame) => frame.hands.length <= 1) &&
    attempt.every((frame) => frame.hands.length <= 1)
  ) {
    return (
      directionError(
        reference.flatMap((frame) =>
          frame.hands[0] ? [frame.hands[0].trajectory] : [],
        ),
        attempt.flatMap((frame) =>
          frame.hands[0] ? [frame.hands[0].trajectory] : [],
        ),
      ) ?? 0
    );
  }
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
    const error = directionError(referencePath, attemptPath);
    return error === null ? [] : [error];
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

function feedbackFor(
  overall: number,
  weakest: keyof Components,
  gestureKind: GestureKind,
  positionRelativeToBody: boolean,
) {
  const advice = {
    handshape: 'Periksa kembali bentuk dan jarak antarruas jari.',
    position: positionRelativeToBody
      ? 'Sesuaikan letak tangan terhadap kepala, bahu, dan dada dengan contoh.'
      : 'Sesuaikan posisi tangan di dalam bingkai dengan video contoh.',
    orientation:
      'Putar telapak dan pergelangan lebih dekat ke orientasi contoh.',
    movement:
      gestureKind === 'pose'
        ? 'Pertahankan bentuk dan posisi akhir tanda selama rekaman.'
        : 'Ikuti arah serta lintasan gerakan dari awal sampai akhir.',
    coordination: 'Samakan waktu dan jarak gerak kedua tangan.',
  }[weakest];
  if (overall >= 88) return `Gerakan sangat dekat dengan contoh. ${advice}`;
  if (overall >= PASS_THRESHOLD)
    return `Gerakan melewati ambang latihan. ${advice}`;
  return `Tanda belum sesuai dengan contoh. ${advice}`;
}

function emptyScore(
  detectionQuality: number,
  feedback: string,
  gestureKind: GestureKind,
  requiredHandCount: 1 | 2,
): GestureScore {
  return {
    overall: 0,
    handshape: 0,
    position: 0,
    orientation: 0,
    movement: 0,
    coordination: 0,
    detectionQuality,
    assessable: false,
    passed: false,
    feedback,
    gestureKind,
    requiredHandCount,
    positionRelativeToBody: false,
    criticalMismatch: null,
    confusableWith: null,
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
function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  return (
    sorted[lower] +
    (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower)
  );
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
