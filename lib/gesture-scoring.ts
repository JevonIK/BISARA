export type Point3 = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};
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
  orientationAssessable: boolean;
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
  handshapeEvidence?: {
    rawScore: number;
    matchingFrameRatio: number;
    requiredMatchingFrameRatio: number;
  };
};

type Vector2 = [number, number];
type PreparedHand = {
  handedness: 'left' | 'right';
  shape: number[];
  position: number[];
  bodyPosition?: number[];
  orientation: number[];
  orientationReliability: number;
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
const MIN_CONTACT_HANDSHAPE_SCORE = 70;
const MIN_TWO_HAND_JOINT_MOVEMENT_SCORE = 85;
const MIN_TWO_HAND_ORIENTATION_SCORE = 85;
const MIN_TWO_HAND_COORDINATION_SCORE = 90;
const MIN_ALTERNATIVE_ADVANTAGE = 3;
const MIN_BODY_POSITION_COVERAGE = 0.8;
const MAX_BODY_OWNER_ERROR = 0.9;
const MIN_BODY_ANCHOR_VISIBILITY = 0.5;
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
const HANDSHAPE_FEATURES_PER_FINGER = 8;
const HANDSHAPE_FEATURE_COUNT = HANDSHAPE_FEATURES_PER_FINGER * 5;
const INTER_HAND_CONTACT_DISTANCE = 0.75;
const MIN_REFERENCE_CONTACT_RATIO = 0.55;
const MIN_ATTEMPT_CONTACT_RATIO = 0.4;
const CONTACT_SIGN_BODY_POSITION_DEAD_ZONE = 0.22;
// A one-hand sign articulated mostly by the fingers can be performed a little
// higher or lower in front of the torso without changing its meaning.
const FINGER_MOTION_BODY_POSITION_DEAD_ZONE = 0.15;
const MAX_CONTACT_FINGER_SPAN_ERROR = 0.18;
const MIN_CONTACT_FINGER_SPAN_MATCH_RATIO = 0.3;

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
    const fingertipSteps = [8, 12, 16, 20].map((index) => {
      const currentTip = hand.landmarks[index];
      const previousTip = previous.landmarks[index];
      return [
        currentTip.x - wrist.x - (previousTip.x - previousWrist.x),
        currentTip.y - wrist.y - (previousTip.y - previousWrist.y),
      ] as Vector2;
    });
    const movingFingertips = fingertipSteps.filter(
      (step) => Math.hypot(...step) > palmScale * 0.3,
    );
    const totalFingertipTravel = movingFingertips.reduce(
      (total, step) => total + Math.hypot(...step),
      0,
    );
    const commonDirection = totalFingertipTravel
      ? Math.hypot(
          movingFingertips.reduce((sum, step) => sum + step[0], 0),
          movingFingertips.reduce((sum, step) => sum + step[1], 0),
        ) / totalFingertipTravel
      : 0;
    // A one-hand sign can articulate several fingers while keeping its wrist
    // still. That is real movement, not four independent tracking spikes.
    // Preserve it without weakening the single-joint and two-hand overlap
    // spike filter below.
    const coordinatedFingerMotion =
      currentHands.length === 1 &&
      previousHands.length === 1 &&
      movingFingertips.length >= 3 &&
      commonDirection >= 0.7;
    const fingerMovementRatio = coordinatedFingerMotion
      ? totalFingertipTravel / movingFingertips.length / palmScale
      : 0;
    const motionAlpha = Math.min(
      0.82,
      0.35 + Math.max(movementRatio, fingerMovementRatio) * 0.8,
    );
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
        const isJointSpike =
          !coordinatedFingerMotion &&
          (handsOverlap
            ? relativeJump > palmScale * 0.35 && wristMovement < palmScale * 0.7
            : relativeJump > palmScale * 0.75 &&
              wristMovement < palmScale * 0.5);
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
    // The learner may sign with the opposite hand. If a one-hand recording
    // briefly detects a second hand, keep following the learner's dominant
    // track instead of jumping to the hand used by the reference signer.
    requiredHandCount === 1
      ? getPrimaryHandedness(rawAttempt)
      : primaryHandedness,
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
  const direct = scoreAttemptWindows(
    reference,
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
    reference,
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
  alternatives: Array<{
    label: string;
    frames: GestureFrame[];
    requiredHandCount?: 1 | 2;
  }>,
  targetScore?: GestureScore,
): GestureScore {
  const target = targetScore ?? scoreGesture(referenceFrames, attemptFrames);
  if (!target.passed) return target;

  // Scores are capped at 100, so no alternative can clear the required margin.
  if (!canAlternativeOutscore(target)) return target;

  let closestAlternative: { label: string; score: GestureScore } | undefined;
  for (const { label, frames, requiredHandCount } of alternatives) {
    // A passing attempt for a one-hand sign rejects an active extra hand;
    // a two-hand sign requires both. Compare signs with the same hand count.
    if (
      (requiredHandCount ?? getRequiredHandCount(frames)) !==
      target.requiredHandCount
    )
      continue;
    const score = scoreGesture(frames, attemptFrames);
    // Pose-only templates can score a held frame as perfect movement, while
    // motion templates must match an actual path. Their totals are not
    // comparable; a static alternative must not veto a completed motion.
    if (score.gestureKind !== target.gestureKind) continue;
    if (
      score.assessable &&
      score.passed &&
      (!closestAlternative || score.overall > closestAlternative.score.overall)
    ) {
      closestAlternative = { label, score };
      if (score.overall === 100) break;
    }
  }
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

export function canAlternativeOutscore(target: GestureScore): boolean {
  return target.passed && target.overall <= 100 - MIN_ALTERNATIVE_ADVANTAGE;
}

function scoreAttemptWindows(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  detectionQuality: number,
) {
  const sampledReference = resampleSequence(reference);
  const palmRotationDominant = isPalmRotationDominantGesture(sampledReference);
  return getAttemptWindows(attempt, reference)
    .map((window) =>
      scorePrepared(
        sampledReference,
        resampleSequence(window),
        detectionQuality,
        window,
      ),
    )
    .reduce((best, result) => {
      if (result.passed !== best.passed) return result.passed ? result : best;
      if (result.overall !== best.overall)
        return result.overall > best.overall ? result : best;
      return weightedComponentScore(
        result,
        result.requiredHandCount,
        result.orientationAssessable,
        palmRotationDominant,
      ) >
        weightedComponentScore(
          best,
          best.requiredHandCount,
          best.orientationAssessable,
          palmRotationDominant,
        )
        ? result
        : best;
    });
}

function getAttemptWindows(
  sequence: PreparedFrame[],
  reference: PreparedFrame[],
) {
  const referenceDuration =
    reference[reference.length - 1].timeMs - reference[0].timeMs;
  const attemptDuration =
    sequence[sequence.length - 1].timeMs - sequence[0].timeMs;
  if (
    referenceDuration <= 1500 &&
    attemptDuration > referenceDuration * 1.8 &&
    (isFingerMotionDominantGesture(reference) ||
      isPalmRotationDominantGesture(reference))
  ) {
    // A short finger-articulated sign can occupy only one of several seconds
    // recorded for preparation and a final hold. Comparing most of the whole
    // recording rejects a correctly performed sign because the hand rests in
    // a different shape before and after it. Find one continuous attempt of
    // comparable duration; movement and handshape gates still apply to it.
    const windows: PreparedFrame[][] = [sequence];
    const step = Math.max(1, Math.floor(sequence.length / 20));
    for (let start = 0; start < sequence.length; start += step) {
      // The preview can be watched at half speed; a learner may perform the
      // same short sweep over two to three reference durations. Keep a full
      // contiguous candidate instead of grading only its first half.
      for (const factor of [0.75, 1, 1.35, 1.8, 2.4, 3.2]) {
        const targetEnd = sequence[start].timeMs + referenceDuration * factor;
        const end = sequence.findIndex(
          (frame, index) => index > start && frame.timeMs >= targetEnd,
        );
        if (end < 0) continue;
        const candidate = sequence.slice(start, end + 1);
        if (
          candidate.length >= MIN_VISIBLE_FRAMES &&
          hasEnoughDuration(candidate)
        ) {
          windows.push(candidate);
        }
      }
    }
    return windows;
  }

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
  const contactDominant = hasSustainedInterHandContact(reference);
  const indexApproachDominant =
    contactDominant && hasIndexFingerApproach(reference);
  const fingerMotionDominant =
    requiredHandCount === 1 && isFingerMotionDominantGesture(reference);
  const palmRotationDominant =
    requiredHandCount === 1 && isPalmRotationDominantGesture(reference);
  // A contact reference may show almost no unobstructed palm. MediaPipe's
  // inferred palm axes then come from overlapping fingers and are not reliable
  // evidence for rejecting a learner. Require enough separated frames on both
  // sides before grading orientation; keep handshape, approach and contact as
  // the decisive evidence when those frames do not exist.
  const separatedReference = contactDominant
    ? reference.filter((frame) => !hasInterHandContact(frame))
    : reference;
  const separatedAttempt = contactDominant
    ? attempt.filter((frame) => !hasInterHandContact(frame))
    : attempt;
  const orientationAssessable =
    requiredHandCount === 1
      ? hasReliableOrientationCoverage(reference) &&
        hasReliableOrientationCoverage(attempt)
      : !contactDominant ||
        (separatedReference.length >= MIN_VISIBLE_FRAMES &&
          separatedAttempt.length >= MIN_VISIBLE_FRAMES);
  const positionRelativeToBody =
    hasBodyPositionCoverage(reference) && hasBodyPositionCoverage(attempt);
  const referenceMovement = movementSequence(reference);
  const attemptMovement = movementSequence(attempt);
  const comparePosition = (a: PreparedFrame, b: PreparedFrame) =>
    compareHandPositions(
      a,
      b,
      positionRelativeToBody,
      positionRelativeToBody && requiredHandCount === 2 && contactDominant
        ? CONTACT_SIGN_BODY_POSITION_DEAD_ZONE
        : positionRelativeToBody && fingerMotionDominant
          ? FINGER_MOTION_BODY_POSITION_DEAD_ZONE
          : 0,
    );
  const handshapeMatch = robustHandshapeMetrics(
    reference,
    attempt,
    requiredHandCount,
    contactDominant,
    fingerMotionDominant,
    palmRotationDominant,
  );
  const handshapeTolerance = palmRotationDominant ? 0.8 : 0.7;
  const rawHandshapeScore = errorToScore(
    handshapeMatch.error,
    handshapeTolerance,
  );
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
      robustPoseError(
        orientationAssessable ? separatedReference : reference,
        orientationAssessable ? separatedAttempt : attempt,
        compareOrientation,
      ),
      0.62,
    ),
    movement: errorToScore(
      poseDominant
        ? poseHoldError(reference, rawAttempt)
        : indexApproachDominant
          ? contactApproachError(reference, attempt)
          : palmRotationDominant
            ? palmRotationError(reference, attempt)
            : fingerMotionDominant
              ? fingerMotionError(reference, attempt)
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
  const weighted = weightedComponentScore(
    components,
    requiredHandCount,
    orientationAssessable,
    palmRotationDominant,
  );
  // Coverage is already enforced before scoring. Multiplying by it again would
  // punish detector occlusion twice, especially when two hands overlap.
  const weightedScore = roundScore(weighted);
  const weakest = weakestComponent({
    ...components,
    orientation: orientationAssessable ? components.orientation : 100,
  });
  const weakestCore = weakestComponent({
    ...components,
    orientation: orientationAssessable ? components.orientation : 100,
    position: positionRelativeToBody ? components.position : 100,
    coordination: requiredHandCount === 2 ? components.coordination : 100,
  });
  // A severe mismatch must not be hidden by perfect unrelated components.
  // Screen position alone cannot establish placement relative to the body.
  // Position becomes a required semantic component only when both recordings
  // have a stable shoulder/torso anchor from Pose Landmarker.
  const handshapeMismatch =
    components.handshape <
      (requiredHandCount === 2 && contactDominant
        ? MIN_CONTACT_HANDSHAPE_SCORE
        : MIN_HANDSHAPE_SCORE) ||
    handshapeFrameMatchRatio < minimumHandshapeMatchRatio;
  const twoHandWeakness =
    requiredHandCount === 2
      ? components.handshape <
        (contactDominant
          ? MIN_CONTACT_HANDSHAPE_SCORE
          : MIN_TWO_HAND_SHAPE_SCORE)
        ? 'handshape'
        : components.coordination < MIN_TWO_HAND_COORDINATION_SCORE &&
            components.movement < MIN_TWO_HAND_JOINT_MOVEMENT_SCORE
          ? 'movement'
          : orientationAssessable &&
              components.coordination < MIN_TWO_HAND_COORDINATION_SCORE &&
              components.orientation < MIN_TWO_HAND_ORIENTATION_SCORE
            ? 'coordination'
            : null
      : null;
  const contactMismatch =
    contactDominant &&
    components.coordination < MIN_TWO_HAND_COORDINATION_SCORE;
  const criticalWeakness = contactMismatch
    ? 'coordination'
    : handshapeMismatch
      ? 'handshape'
      : twoHandWeakness
        ? twoHandWeakness
        : positionRelativeToBody &&
            components.position < MIN_BODY_POSITION_SCORE
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
    orientationAssessable,
    detectionQuality,
    assessable: true,
    passed: overall >= PASS_THRESHOLD,
    feedback: feedbackFor(
      overall,
      criticalWeakness ?? weakest,
      gestureKind,
      positionRelativeToBody,
      contactDominant,
      indexApproachDominant,
      fingerMotionDominant,
      palmRotationDominant,
    ),
    gestureKind,
    requiredHandCount,
    positionRelativeToBody,
    criticalMismatch: criticalWeakness,
    confusableWith: null,
    handshapeEvidence: {
      rawScore: rawHandshapeScore,
      matchingFrameRatio: handshapeFrameMatchRatio,
      requiredMatchingFrameRatio: minimumHandshapeMatchRatio,
    },
  };
}

function weightedComponentScore(
  components: Components,
  requiredHandCount: 1 | 2,
  orientationAssessable = true,
  palmRotationDominant = false,
) {
  if (palmRotationDominant && requiredHandCount === 1 && orientationAssessable) {
    // Palm rotation is already graded as movement. Giving the absolute palm
    // angle its usual weight penalizes a correct sweep twice when the signer
    // starts with a slightly different wrist angle.
    return components.handshape * 0.43 +
      components.movement * 0.34 +
      components.orientation * 0.13 +
      components.position * 0.1;
  }
  if (!orientationAssessable) {
    const weighted =
      components.handshape * 0.35 +
      components.movement * 0.25 +
      components.position * 0.1 +
      components.coordination * 0.1;
    return weighted / 0.8;
  }
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

export function getRequiredHandCount(frames: GestureFrame[]): 1 | 2 {
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

function getRequiredHandCountFromPrepared(frames: PreparedFrame[]): 1 | 2 {
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
            orientationReliability:
              hand.orientationReliability +
              (next.orientationReliability - hand.orientationReliability) *
                weight,
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
      (point) =>
        !point ||
        ![point.x, point.y, point.z].every(Number.isFinite) ||
        (point.visibility !== undefined &&
          point.visibility < MIN_BODY_ANCHOR_VISIBILITY),
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
  const orientationReliability =
    1 - Math.abs(dot2(side, forward));
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
    orientationReliability,
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
      Math.hypot(tip[0] - base[0], tip[1] - base[1]),
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
  deadZone = 0,
) {
  return compareMatchedHands(a, b, (hand, matched) => {
    const referencePosition =
      relativeToBody && hand.bodyPosition ? hand.bodyPosition : hand.position;
    const attemptPosition =
      relativeToBody && matched.bodyPosition
        ? matched.bodyPosition
        : matched.position;
    return Math.max(
      0,
      vectorRms(referencePosition, attemptPosition) - deadZone,
    );
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

function hasReliableOrientationCoverage(sequence: PreparedFrame[]) {
  const hands = sequence.flatMap((frame) => frame.hands);
  if (!hands.length) return false;
  return (
    hands.filter((hand) => hand.orientationReliability >= 0.45).length /
      hands.length >=
    0.6
  );
}

function robustHandshapeMetrics(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
  requiredHandCount: 1 | 2,
  contactDominant: boolean,
  fingerMotionDominant: boolean,
  palmRotationDominant: boolean,
) {
  // The meaningful handshape of a contact sign is the shape at contact. Setup
  // frames often contain a relaxed/closed hand and previously allowed a wrong
  // final shape to match that unrelated phase. Restrict both sides to sustained
  // contact before applying the overlap recovery below.
  const shapeReference = contactDominant
    ? reference.filter(hasInterHandContact)
    : reference;
  const shapeAttempt = contactDominant
    ? attempt.filter(hasInterHandContact)
    : attempt;
  if (!shapeReference.length || !shapeAttempt.length) {
    return {
      error: 4,
      matchRatio: 0,
      minimumMatchRatio:
        requiredHandCount === 2
          ? contactDominant
            ? MIN_CONTACT_FINGER_SPAN_MATCH_RATIO
            : MIN_TWO_HAND_HANDSHAPE_MATCH_RATIO
          : MIN_HANDSHAPE_MATCH_RATIO,
    };
  }
  const allowIndependentFrameRecovery =
    requiredHandCount === 2 &&
    hasSustainedHandOverlap(shapeReference) &&
    hasSustainedHandOverlap(shapeAttempt);
  if (requiredHandCount === 1 || !allowIndependentFrameRecovery) {
    const metrics = robustPoseMetrics(
      shapeReference,
      shapeAttempt,
      (referenceFrame, attemptFrame) =>
        compareHandshape(
          referenceFrame,
          attemptFrame,
          fingerMotionDominant ? 0.08 : 0,
          palmRotationDominant,
        ),
    );
    return {
      error: metrics.error,
      matchRatio:
        metrics.nearestErrors.filter(
          (error) =>
            errorToScore(error, palmRotationDominant ? 0.8 : 0.7) >=
            MIN_HANDSHAPE_SCORE,
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
    const referenceHands = shapeReference.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === handedness,
      );
      return hand ? [hand] : [];
    });
    const nearestErrors = shapeAttempt.flatMap((frame) => {
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
    const nearestSpanErrors = shapeAttempt.flatMap((frame) => {
      const hand = frame.hands.find(
        (candidate) => candidate.handedness === handedness,
      );
      if (!hand || !referenceHands.length) return [];
      return [
        Math.min(
          ...referenceHands.map((referenceHand) =>
            fingerSpanDistance(referenceHand.shape, hand.shape),
          ),
        ),
      ];
    });
    const reliableCount = Math.max(
      1,
      Math.ceil(nearestErrors.length * MIN_TWO_HAND_HANDSHAPE_MATCH_RATIO),
    );
    const reliableErrors = [...nearestErrors]
      .sort((left, right) => left - right)
      .slice(0, reliableCount);
    return {
      error: average(reliableErrors),
      matchRatio: Math.min(
        nearestErrors.filter(
          (error) =>
            errorToScore(error, 0.7) >=
            (contactDominant
              ? MIN_CONTACT_HANDSHAPE_SCORE
              : MIN_TWO_HAND_SHAPE_SCORE),
        ).length / nearestErrors.length,
        contactDominant
          ? nearestSpanErrors.filter(
              (error) => error <= MAX_CONTACT_FINGER_SPAN_ERROR,
            ).length / nearestSpanErrors.length
          : 1,
      ),
    };
  });

  return {
    error: Math.max(...perHand.map((metrics) => metrics.error)),
    matchRatio: Math.min(...perHand.map((metrics) => metrics.matchRatio)),
    minimumMatchRatio: contactDominant
      ? MIN_CONTACT_FINGER_SPAN_MATCH_RATIO
      : MIN_TWO_HAND_HANDSHAPE_MATCH_RATIO,
  };
}

function fingerSpanDistance(reference: number[], attempt: number[]) {
  if (
    reference.length !== HANDSHAPE_FEATURE_COUNT ||
    attempt.length !== HANDSHAPE_FEATURE_COUNT
  )
    return 4;
  const differences = Array.from({ length: 5 }, (_, index) =>
    Math.abs(
      reference[index * HANDSHAPE_FEATURES_PER_FINGER + 7] -
        attempt[index * HANDSHAPE_FEATURES_PER_FINGER + 7],
    ),
  );
  return Math.max(
    Math.sqrt(average(differences.map((difference) => difference ** 2))),
    Math.max(...differences) * 0.6,
  );
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

function compareHandshape(
  a: PreparedFrame,
  b: PreparedFrame,
  singleHandOcclusionPenalty = 0,
  palmRotationDominant = false,
) {
  if (a.hands.length < 2) {
    const source = a.hands[0];
    const matched = b.hands[0];
    return source && matched
      ? handshapeDistance(
          source.shape,
          matched.shape,
          singleHandOcclusionPenalty,
          palmRotationDominant,
          source.orientationReliability < 0.45 ||
            matched.orientationReliability < 0.45,
        )
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
  palmRotationDominant = false,
  allowPerspectiveRecovery = false,
) {
  if (
    reference.length !== HANDSHAPE_FEATURE_COUNT ||
    attempt.length !== HANDSHAPE_FEATURE_COUNT
  )
    return 4;

  // This runs for every pair of sampled frames in every candidate window.
  // Accumulate the same distances directly instead of allocating sliced and
  // flattened arrays for each comparison.
  let totalSquared = 0;
  let maxFingerDistance = 0;
  let extensionSquared = 0;
  let maxExtensionDifference = 0;
  let tipDirectionSquared = 0;
  let tipRadiusSquared = 0;
  let maxTipRadiusDifference = 0;
  let baseToTipSpanSquared = 0;
  let maxBaseToTipSpanDifference = 0;

  for (let finger = 0; finger < 5; finger += 1) {
    const offset = finger * HANDSHAPE_FEATURES_PER_FINGER;
    let fingerSquared = 0;
    for (
      let feature = 0;
      feature < HANDSHAPE_FEATURES_PER_FINGER;
      feature += 1
    ) {
      const difference =
        reference[offset + feature] - attempt[offset + feature];
      const squared = difference ** 2;
      totalSquared += squared;
      fingerSquared += squared;
      if (feature === 4 || feature === 5) tipDirectionSquared += squared;
    }
    maxFingerDistance = Math.max(
      maxFingerDistance,
      Math.sqrt(fingerSquared / HANDSHAPE_FEATURES_PER_FINGER),
    );

    const extensionDifference = Math.abs(
      reference[offset + 3] - attempt[offset + 3],
    );
    extensionSquared += extensionDifference ** 2;
    maxExtensionDifference = Math.max(
      maxExtensionDifference,
      extensionDifference,
    );

    const tipRadiusDifference = Math.abs(
      reference[offset + 6] - attempt[offset + 6],
    );
    tipRadiusSquared += tipRadiusDifference ** 2;
    maxTipRadiusDifference = Math.max(
      maxTipRadiusDifference,
      tipRadiusDifference,
    );

    const baseToTipSpanDifference = Math.abs(
      reference[offset + 7] - attempt[offset + 7],
    );
    baseToTipSpanSquared += baseToTipSpanDifference ** 2;
    maxBaseToTipSpanDifference = Math.max(
      maxBaseToTipSpanDifference,
      baseToTipSpanDifference,
    );
  }

  const detailedDistance = Math.max(
    Math.sqrt(totalSquared / HANDSHAPE_FEATURE_COUNT),
    maxFingerDistance * 0.7,
  );

  // Joint angles become noisy when curled fingers overlap or the camera sees
  // the hand edge-on. The base-to-tip extension pattern remains much more
  // stable and still distinguishes which fingers are open or closed. Allow a
  // matching extension pattern to recover from noisy inner joints, while the
  // largest per-finger mismatch keeps a missing/extra extended finger strict.
  const tipDirectionDistance = Math.sqrt(tipDirectionSquared / 10);
  if (palmRotationDominant) {
    // During a palm/wrist sweep, different camera depth and palm proportions
    // change wrist-to-tip radii even when the fingers keep the same shape.
    // Compare each finger's own straightness plus its direction instead. The
    // largest extension mismatch still rejects a missing/extra open finger.
    return Math.max(
      Math.sqrt(extensionSquared / 5),
      maxExtensionDifference * 0.8,
      tipDirectionDistance * 0.25,
    );
  }
  const extensionPatternDistance = Math.max(
    Math.sqrt(extensionSquared / 5),
    maxExtensionDifference * 0.8,
    tipDirectionDistance * 0.25,
    Math.sqrt(tipRadiusSquared / 5) * 0.65,
    maxTipRadiusDifference * 0.5,
  );
  const perspectiveExtensionDistance = Math.max(
    Math.sqrt(extensionSquared / 5),
    maxExtensionDifference * 0.8,
  );
  // When two hands touch, MediaPipe can keep every fingertip in the right
  // place while inventing the hidden PIP/DIP joints between the palm and tip.
  // In that case the extension ratio above is no longer observable evidence:
  // it changes because the fabricated inner-joint path becomes longer. The
  // fingertip polar layout still captures which fingers are folded/extended
  // and therefore provides a safer recovery signal. This branch is available
  // only to the overlap-aware two-hand matcher (non-zero recovery penalty), so
  // a one-hand sign cannot pass by matching only a few endpoints.
  const fingertipPatternDistance = Math.max(
    tipDirectionDistance * 0.35,
    Math.sqrt(tipRadiusSquared / 5) * 0.75,
    maxTipRadiusDifference * 0.6,
    Math.sqrt(baseToTipSpanSquared / 5) * 0.9,
    maxBaseToTipSpanDifference * 0.8,
  );
  return Math.min(
    detailedDistance,
    extensionPatternDistance + occlusionRecoveryPenalty,
    allowPerspectiveRecovery
      ? perspectiveExtensionDistance + 0.05
      : Number.POSITIVE_INFINITY,
    occlusionRecoveryPenalty > 0
      ? fingertipPatternDistance + occlusionRecoveryPenalty
      : Number.POSITIVE_INFINITY,
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
  const referenceContactRatio = interHandContactRatio(reference);
  if (referenceContactRatio >= MIN_REFERENCE_CONTACT_RATIO) {
    // For contact signs such as Teman, exact wrist spacing is signer-specific.
    // What matters is that the expected fingertip/hand contact is sustained;
    // each hand's trajectory and orientation are graded separately.
    const attemptContactRatio = interHandContactRatio(attempt);
    const requiredContactRatio = Math.max(
      MIN_ATTEMPT_CONTACT_RATIO,
      referenceContactRatio - 0.25,
    );
    return attemptContactRatio >= requiredContactRatio
      ? 0
      : (requiredContactRatio - attemptContactRatio) * 0.8;
  }
  const distanceProfile = (sequence: PreparedFrame[]) => {
    // A palm seen edge-on can make its per-frame scale nearly zero, turning an
    // otherwise ordinary wrist gap into a huge one-frame spike. Use one robust
    // scale for the whole gesture, as with the other motion comparisons.
    const scale = Math.max(0.001, median(sequence.flatMap((frame) =>
      frame.hands.length === 2
        ? frame.hands.map((hand) => hand.screenScale)
        : [],
    )));
    return sequence.flatMap((frame) => {
      if (frame.hands.length < 2) return [];
      return [
        distanceArrays(
          frame.hands[0].physicalWrist,
          frame.hands[1].physicalWrist,
        ) / scale,
      ];
    });
  };
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

function hasSustainedInterHandContact(sequence: PreparedFrame[]) {
  return interHandContactRatio(sequence) >= MIN_REFERENCE_CONTACT_RATIO;
}

function interHandContactRatio(sequence: PreparedFrame[]) {
  const distances = sequence.flatMap((frame) => {
    const distance = interHandContactDistance(frame);
    return distance === null ? [] : [distance];
  });
  return distances.length
    ? distances.filter((distance) => distance < INTER_HAND_CONTACT_DISTANCE)
        .length / distances.length
    : 0;
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

function hasInterHandContact(frame: PreparedFrame) {
  const distance = interHandContactDistance(frame);
  return distance !== null && distance < INTER_HAND_CONTACT_DISTANCE;
}

function contactApproachError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
) {
  const referenceGap = reference.map(indexFingerGap);
  const attemptGap = attempt.map(indexFingerGap);
  if (
    referenceGap.some((gap) => gap === null) ||
    attemptGap.some((gap) => gap === null)
  )
    return 4;

  const referenceDistances = referenceGap as number[];
  const attemptDistances = attemptGap as number[];
  const earlyGap = (distances: number[]) =>
    median(distances.slice(0, Math.max(3, Math.ceil(distances.length * 0.25))));
  const lateGap = (distances: number[]) =>
    median(distances.slice(Math.floor(distances.length * 0.5)));
  const referenceClosure =
    earlyGap(referenceDistances) - lateGap(referenceDistances);
  const attemptClosure = earlyGap(attemptDistances) - lateGap(attemptDistances);
  // A contact sign is made by bringing the active fingers together. Absolute
  // wrist paths vary with arm length and signing height; the change in distance
  // between the two index fingers captures the action shown by Teman. Require
  // an actual approach so a static held pose cannot pass as the full sign.
  const minimumClosure = Math.max(0.65, Math.min(1.1, referenceClosure * 0.4));
  const closureError = Math.max(0, minimumClosure - attemptClosure) * 0.3;
  const normalizeGap = (distances: number[]) => {
    const start = Math.max(0.8, earlyGap(distances));
    return distances.map((gap) => Math.min(1.5, gap / start));
  };
  const profileError =
    dtwError(
      normalizeGap(referenceDistances),
      normalizeGap(attemptDistances),
      (left, right) => Math.abs(left - right),
    ) * 0.16;
  return Math.max(closureError, profileError);
}

function hasIndexFingerApproach(sequence: PreparedFrame[]) {
  const gaps = sequence.map(indexFingerGap);
  if (gaps.some((gap) => gap === null)) return false;
  const distances = gaps as number[];
  const early = median(
    distances.slice(0, Math.max(3, Math.ceil(distances.length * 0.25))),
  );
  const late = median(distances.slice(Math.floor(distances.length * 0.5)));
  return early - late >= 0.8;
}

function indexFingerGap(frame: PreparedFrame) {
  if (frame.hands.length !== 2) return null;
  const [first, second] = frame.hands;
  const scale = average([first.screenScale, second.screenScale]);
  return (
    Math.min(
      ...[7, 8].flatMap((firstIndex) =>
        [7, 8].map((secondIndex) =>
          distanceArrays(
            first.physicalLandmarks[firstIndex],
            second.physicalLandmarks[secondIndex],
          ),
        ),
      ),
    ) / scale
  );
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

function fingertipOffsets(sequence: PreparedFrame[]) {
  return sequence.map((frame) =>
    frame.hands.map((hand) => {
      const tips = [8, 12, 16, 20].map(
        (index) => hand.physicalLandmarks[index],
      );
      const wrist = hand.physicalWrist;
      const mirror = hand.handedness === 'left' ? -1 : 1;
      const fingertipOffset: Vector2 = [
        (average(tips.map((tip) => tip[0])) - wrist[0]) * mirror,
        average(tips.map((tip) => tip[1])) - wrist[1],
      ];
      const palmWidth = Math.hypot(
        hand.physicalLandmarks[5][0] - hand.physicalLandmarks[17][0],
        hand.physicalLandmarks[5][1] - hand.physicalLandmarks[17][1],
      );
      const palmScale = Math.max(0.001, (palmWidth + hand.screenScale) / 2);
      // Finger articulation belongs in the hand's own coordinate system.
      // An equally valid wrist angle rotates its screen-space tip trajectory;
      // comparing that trajectory to a single signer made Keluarga fail even
      // when handshape and palm orientation were acceptable.
      return {
        handedness: hand.handedness,
        x:
          dot2(fingertipOffset, [hand.orientation[0], hand.orientation[1]]) /
          palmScale,
        y:
          dot2(fingertipOffset, [hand.orientation[2], hand.orientation[3]]) /
          palmScale,
      };
    }),
  );
}

function fingertipMotionExtent(sequence: PreparedFrame[]) {
  const offsets = fingertipOffsets(sequence).flat();
  if (offsets.length < MIN_VISIBLE_FRAMES) return 0;
  return Math.hypot(
    percentile(
      offsets.map((point) => point.x),
      0.9,
    ) -
      percentile(
        offsets.map((point) => point.x),
        0.1,
      ),
    percentile(
      offsets.map((point) => point.y),
      0.9,
    ) -
      percentile(
        offsets.map((point) => point.y),
        0.1,
      ),
  );
}

function isFingerMotionDominantGesture(sequence: PreparedFrame[]) {
  const central = sequence.slice(
    Math.floor(sequence.length * 0.25),
    Math.ceil(sequence.length * 0.75),
  );
  const wristExtent = motionExtent(central);
  // A short complete flex/reopen cycle can place its extension peak just
  // outside the middle half, especially after resampling. Use the entire
  // performed sign for finger articulation while the central wrist check
  // still excludes an entry/exit hand lift.
  const fingerExtent = fingertipMotionExtent(sequence);
  // With a stationary wrist and articulating fingers, the wrist trajectory is
  // tracker jitter rather than the lexical movement. Keluarga's reference is
  // one such sign; the condition is derived from the reference, not its label.
  return (
    wristExtent < 1 && fingerExtent > 1.2 && fingerExtent > wristExtent * 2
  );
}

type PalmRotationProfile = {
  angles: number[];
  start: number;
  minimum: number;
  maximum: number;
  end: number;
};

function palmRotationProfile(
  sequence: PreparedFrame[],
): PalmRotationProfile | null {
  const hands = sequence.flatMap((frame) => frame.hands.slice(0, 1));
  if (hands.length < MIN_VISIBLE_FRAMES) return null;
  const angles: number[] = [];
  for (const hand of hands) {
    // The index-to-pinky MCP axis remains observable when the fingers point
    // toward the camera. It tracks a wrist sweep more reliably than the
    // foreshortened fingertip path used for finger articulation.
    const angle = Math.atan2(hand.orientation[1], hand.orientation[0]);
    const previous = angles.at(-1);
    angles.push(
      previous === undefined
        ? angle
        : previous +
            Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous)),
    );
  }
  const filtered = angles.map((_, index) =>
    median(
      angles.slice(Math.max(0, index - 1), Math.min(angles.length, index + 2)),
    ),
  );
  const edgeCount = Math.max(2, Math.ceil(filtered.length * 0.12));
  return {
    angles: filtered,
    start: median(filtered.slice(0, edgeCount)),
    minimum: percentile(filtered, 0.1),
    maximum: percentile(filtered, 0.9),
    end: median(filtered.slice(-edgeCount)),
  };
}

function isPalmRotationDominantGesture(sequence: PreparedFrame[]) {
  if (!isFingerMotionDominantGesture(sequence)) return false;
  const profile = palmRotationProfile(sequence);
  if (!profile) return false;
  const negativeSweep = profile.start - profile.minimum;
  const positiveSweep = profile.maximum - profile.start;
  const direction = negativeSweep >= positiveSweep ? -1 : 1;
  const peak = direction < 0 ? profile.minimum : profile.maximum;
  const sweep = Math.max(negativeSweep, positiveSweep);
  const returned = direction * (peak - profile.end);
  return sweep >= 0.8 && returned >= sweep * 0.45;
}

function palmRotationError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
) {
  const expected = palmRotationProfile(reference);
  const performed = palmRotationProfile(attempt);
  if (!expected || !performed) return 4;
  const direction =
    expected.start - expected.minimum >= expected.maximum - expected.start
      ? -1
      : 1;
  const peak = direction < 0 ? expected.minimum : expected.maximum;
  const referenceSweep = direction * (peak - expected.start);
  const referenceReturn = direction * (peak - expected.end);
  // Compare the turn relative to each signer's own starting wrist angle.
  // The same physical articulation can trace the opposite screen rotation
  // when performed with the opposite signing hand. Only consider that second
  // direction across handedness; a same-hand reversed sweep remains wrong.
  const referenceHand = reference.find((frame) => frame.hands.length)?.hands[0];
  const attemptHand = attempt.find((frame) => frame.hands.length)?.hands[0];
  const directions = referenceHand && attemptHand &&
    referenceHand.handedness !== attemptHand.handedness
    ? [direction, -direction]
    : [direction];
  const normalized = (profile: PalmRotationProfile, sweepDirection: number) =>
    profile.angles.map(
      (angle) => (sweepDirection * (angle - profile.start)) / referenceSweep,
    );
  return Math.min(...directions.map((attemptDirection) => {
    const attemptPeak = attemptDirection < 0 ? performed.minimum : performed.maximum;
    const attemptSweep = Math.max(0, attemptDirection * (attemptPeak - performed.start));
    const attemptReturn = Math.max(0, attemptDirection * (attemptPeak - performed.end));
    if (attemptSweep < 0.25) return 4;
    const pathError = dtwError(
      normalized(expected, direction),
      normalized(performed, attemptDirection),
      (a, b) => Math.abs(a - b),
    ) * 0.14;
    const sweepError = Math.abs(Math.log((attemptSweep + 0.1) / (referenceSweep + 0.1))) * 0.12;
    const returnError = referenceReturn > 0
      ? (Math.max(0, referenceReturn * 0.55 - attemptReturn) / referenceReturn) * 0.3
      : 0;
    return Math.max(pathError, sweepError, returnError);
  }));
}

function fingerMotionSequence(sequence: PreparedFrame[]): MovementFrame[] {
  const offsets = fingertipOffsets(sequence);
  const points = offsets.map((hands, index) => {
    const hand = hands[0];
    if (!hand) return null;
    const neighbors = offsets
      .slice(Math.max(0, index - 1), Math.min(offsets.length, index + 2))
      .flatMap((neighbor) =>
        neighbor.filter((item) => item.handedness === hand.handedness),
      );
    return {
      handedness: hand.handedness,
      x: median(neighbors.map((neighbor) => neighbor.x)),
      y: median(neighbors.map((neighbor) => neighbor.y)),
    };
  });
  const visible = points.filter((point) => point !== null);
  if (!visible.length) return sequence.map(() => ({ hands: [] }));
  const centerX = median(visible.map((point) => point.x));
  const centerY = median(visible.map((point) => point.y));
  const extent = Math.hypot(
    percentile(
      visible.map((point) => point.x),
      0.9,
    ) -
      percentile(
        visible.map((point) => point.x),
        0.1,
      ),
    percentile(
      visible.map((point) => point.y),
      0.9,
    ) -
      percentile(
        visible.map((point) => point.y),
        0.1,
      ),
  );
  const pathScale = Math.max(POSE_DOMINANT_CENTRAL_EXTENT, extent);
  return points.map((point) => ({
    hands: point
      ? [
          {
            handedness: point.handedness,
            trajectory: [
              (point.x - centerX) / pathScale,
              (point.y - centerY) / pathScale,
            ],
            extent,
          },
        ]
      : [],
  }));
}

function fingerMotionError(
  reference: PreparedFrame[],
  attempt: PreparedFrame[],
) {
  const referenceMotion = fingerMotionSequence(reference);
  const attemptMotion = fingerMotionSequence(attempt);
  return Math.max(
    dtwError(referenceMotion, attemptMotion, compareMovement),
    movementExtentError(referenceMotion, attemptMotion),
  );
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
    // At the lower edge of a wide camera frame, a correctly held hand can be
    // only a few pixels wide. Dividing detector jitter by that tiny value turns
    // a held pose into apparent motion. Keep a small screen-space noise floor.
    const scale = Math.max(
      0.04,
      median(hands.map((hand) => hand.screenScale)),
    );
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
  contactDominant: boolean,
  indexApproachDominant: boolean,
  fingerMotionDominant: boolean,
  palmRotationDominant: boolean,
) {
  const advice = {
    handshape: contactDominant
      ? 'Bentuk kedua telunjuk seperti contoh dan pastikan ujungnya terlihat saat bertemu.'
      : fingerMotionDominant
        ? 'Bentuk jari yang terbaca kamera berbeda dari contoh. Pastikan ujung jari terlihat, lalu ikuti bentuk awal dan akhir pada video lambat.'
        : 'Periksa kembali bentuk dan jarak antarruas jari.',
    position: positionRelativeToBody
      ? 'Sesuaikan letak tangan terhadap kepala, bahu, dan dada dengan contoh.'
      : 'Sesuaikan posisi tangan di dalam bingkai dengan video contoh.',
    orientation:
      'Putar telapak dan pergelangan lebih dekat ke orientasi contoh.',
    movement: indexApproachDominant
      ? 'Mulai dengan kedua telunjuk terpisah, lalu dekatkan sampai bertemu dan tahan sesaat.'
      : palmRotationDominant
        ? 'Putar pergelangan seperti contoh, lalu kembalikan tangan ke arah awal.'
        : fingerMotionDominant
          ? 'Ikuti gerak jari dan putaran pergelangan dari awal sampai akhir contoh.'
          : gestureKind === 'pose'
            ? 'Pertahankan bentuk dan posisi akhir tanda selama rekaman.'
            : 'Ikuti arah serta lintasan gerakan dari awal sampai akhir.',
    coordination: 'Samakan waktu dan jarak gerak kedua tangan.',
  }[weakest];
  if (overall >= 95) return 'Gerakan sangat sesuai dengan contoh.';
  if (overall >= 88) return 'Gerakan sangat dekat dengan contoh.';
  if (overall >= PASS_THRESHOLD)
    return 'Gerakan sesuai untuk latihan ini.';
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
    orientationAssessable: false,
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
