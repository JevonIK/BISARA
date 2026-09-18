import type { AlphabetLetter } from './alphabet-data';
import { getRequiredHandCount, type GestureFrame, type HandObservation, type Point3 } from './gesture-scoring.ts';

export type AlphabetAssessment = {
  assessable: boolean;
  passed: boolean;
  shape: number;
  orientation: number;
  coordination: number | null;
  movement: number | null;
  visibleFrames: number;
  feedback: string;
};
export type AlphabetReferenceSet = {
  frames: Record<string, GestureFrame[]>;
  variants: Record<string, GestureFrame[][]>;
};

type HandPose = {
  hand: HandObservation;
  features: number[];
  angle: number;
  scale: number;
};
type PosedFrame = { timeMs: number; poses: HandPose[] };

const fingers = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];
const tips = [4, 8, 12, 16, 20];
// The selected J clips show a clear vertical sweep of the little finger.
// Z clips do not isolate a repeatable path, so Z is assessed by hand form.
const movingTip: Partial<Record<AlphabetLetter, number>> = { J: 20 };
const directionalLetters = new Set<AlphabetLetter>(['G', 'H', 'J', 'P', 'Q', 'Z']);

function distance(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function getPose(hand: HandObservation): HandPose | null {
  const points = hand.landmarks;
  if (points.length !== 21 || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const scale = (distance(points[0], points[9]) + distance(points[5], points[17])) / 2;
  if (scale < 0.012) return null;
  const features: number[] = [];
  for (const [mcp, pip, dip, tip] of fingers) {
    features.push(distance(points[mcp], points[tip]) / scale);
    features.push(distance(points[mcp], points[dip]) / scale);
    features.push(distance(points[pip], points[tip]) / scale);
    features.push(distance(points[0], points[tip]) / scale);
  }
  for (let i = 0; i < tips.length; i++) {
    for (let j = i + 1; j < tips.length; j++) {
      features.push(distance(points[tips[i]], points[tips[j]]) / scale);
    }
  }
  return {
    hand,
    features,
    angle: Math.atan2(points[9].y - points[0].y, points[9].x - points[0].x),
    scale,
  };
}

function selectedPoses(frames: GestureFrame[], requiredHands: 1 | 2, reference = false): PosedFrame[] {
  const singleHandExamples = frames.flatMap((frame) => frame.hands.length === 1 ? [getPose(frame.hands[0])].filter((pose): pose is HandPose => pose !== null) : []);
  const seed = singleHandExamples[Math.floor(singleHandExamples.length / 2)];
  return frames.flatMap((frame) => {
    if (requiredHands === 2) {
      if (frame.hands.length !== 2) return [];
      const poses = frame.hands.map(getPose);
      return poses.every((pose): pose is HandPose => pose !== null)
        ? [{ timeMs: frame.timeMs, poses }]
        : [];
    }
    // Use exactly one hand in attempts. In a source clip, an occasional
    // duplicate detection is resolved against the clear one-hand examples.
    if (!frame.hands.length) return [];
    if (!reference && frame.hands.length > 1) {
      if (frame.hands.length !== 2) return [];
      const left = frame.hands[0].landmarks[0];
      const right = frame.hands[1].landmarks[0];
      const wristGap = left && right ? distance(left, right) : Infinity;
      const sameLabel = frame.hands[0].handedness === frame.hands[1].handedness;
      if (wristGap >= 0.06 && !(sameLabel && wristGap < 0.2)) return [];
    }
    const poses = frame.hands.map(getPose).filter((pose): pose is HandPose => pose !== null);
    const pose = seed && poses.length > 1
      ? poses.sort((a, b) => Math.abs(shapeScore(seed, a) - 100) - Math.abs(shapeScore(seed, b) - 100))[0]
      : poses[0];
    return pose ? [{ timeMs: frame.timeMs, poses: [pose] }] : [];
  });
}

function shapeScore(reference: HandPose, attempt: HandPose): number {
  const error = reference.features.reduce(
    (sum, value, index) => sum + Math.min(2, Math.abs(value - attempt.features[index])),
    0,
  ) / reference.features.length;
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-2.3 * error))));
}

function orientationScore(reference: HandPose, attempt: HandPose): number {
  // The webcam preview is mirrored; either physical signing hand is valid.
  const direct = Math.abs(Math.atan2(
    Math.sin(reference.angle - attempt.angle),
    Math.cos(reference.angle - attempt.angle),
  ));
  const mirrored = Math.abs(Math.atan2(
    Math.sin(reference.angle - (Math.PI - attempt.angle)),
    Math.cos(reference.angle - (Math.PI - attempt.angle)),
  ));
  return Math.round(100 * Math.max(0, 1 - Math.min(direct, mirrored) / Math.PI));
}

function trajectory(frames: PosedFrame[], tip: number): Array<[number, number]> {
  return frames.map(({ poses }) => [
    poses[0].hand.landmarks[tip].x,
    poses[0].hand.landmarks[tip].y,
  ]);
}

function comparePoseFrames(reference: PosedFrame, attempt: PosedFrame) {
  const assignments = reference.poses.length === 2
    ? [attempt.poses, [...attempt.poses].reverse()]
    : [attempt.poses];
  return assignments.map((poses) => {
    const shape = Math.round(median(reference.poses.map((pose, index) => shapeScore(pose, poses[index]))));
    const orientation = Math.round(median(reference.poses.map((pose, index) => orientationScore(pose, poses[index]))));
    if (reference.poses.length === 1) return { shape, orientation, coordination: 100 };
    const pairDistances = (pair: HandPose[]) => {
      const scale = Math.max(0.001, (pair[0].scale + pair[1].scale) / 2);
      return [0, 4, 8, 12, 16, 20].map((tip) =>
        distance(pair[0].hand.landmarks[tip], pair[1].hand.landmarks[tip]) / scale,
      );
    };
    const expected = pairDistances(reference.poses);
    const observed = pairDistances(poses);
    const error = expected.reduce((sum, value, index) => sum + Math.min(2, Math.abs(value - observed[index])), 0) / expected.length;
    return { shape, orientation, coordination: Math.round(100 * Math.exp(-1.5 * error)) };
  }).sort((a, b) => (b.shape + b.orientation * 0.3 + b.coordination * 0.35) - (a.shape + a.orientation * 0.3 + a.coordination * 0.35))[0];
}

function movementScore(frames: PosedFrame[], tip: number): number {
  const path = trajectory(frames, tip);
  if (path.length < 6) return 0;
  const palmScale = median(frames.map(({ poses }) => poses[0].scale));
  const verticalExtent = (Math.max(...path.map((point) => point[1])) - Math.min(...path.map((point) => point[1]))) / Math.max(0.001, palmScale);
  return Math.max(0, Math.min(100, Math.round(verticalExtent * 20)));
}

/** Compares camera landmarks with the example; no result is inferred from the video label. */
export function scoreAlphabetGesture(
  letter: AlphabetLetter,
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
): AlphabetAssessment {
  const requiredHands = getRequiredHandCount(referenceFrames);
  const reference = selectedPoses(referenceFrames, requiredHands, true);
  const attempt = selectedPoses(attemptFrames, requiredHands);
  const visibleFrames = attempt.length;
  const duration = attempt.length > 1 ? attempt.at(-1)!.timeMs - attempt[0].timeMs : 0;
  if (reference.length < 6 || reference.at(-1)!.timeMs - reference[0].timeMs < 400) {
    return { assessable: false, passed: false, shape: 0, orientation: 0, coordination: null, movement: null, visibleFrames,
      feedback: 'Video contoh belum menghasilkan landmark tangan yang cukup untuk dinilai.' };
  }
  if (visibleFrames < 6 || duration < 400 || visibleFrames / Math.max(1, attemptFrames.length) < (requiredHands === 2 ? 0.3 : 0.4)) {
    return { assessable: false, passed: false, shape: 0, orientation: 0, coordination: null, movement: null, visibleFrames,
      feedback: `Tunjukkan ${requiredHands === 2 ? 'kedua tangan' : 'satu tangan'} dengan jelas di dalam bingkai selama perekaman.` };
  }

  // Ignore the demonstrator's entrance and exit for a held letter. Sample
  // multiple reference frames so one noisy detection cannot reject a learner.
  const core = reference.slice(
    Math.floor(reference.length * 0.2),
    Math.max(Math.floor(reference.length * 0.2) + 6, Math.ceil(reference.length * 0.8)),
  );
  const references = core.filter((_, index) => index % Math.max(1, Math.floor(core.length / 12)) === 0);
  const samples = attempt.map((pose) => references
    .map((example) => comparePoseFrames(example, pose))
    .sort((a, b) => (b.shape + b.orientation * 0.3 + b.coordination * 0.35) - (a.shape + a.orientation * 0.3 + a.coordination * 0.35))[0]);
  const windowSize = Math.min(8, Math.max(4, Math.floor(samples.length * 0.25)));
  let best = { shape: 0, orientation: 0, coordination: 0 };
  for (let start = 0; start <= samples.length - windowSize; start++) {
    const window = samples.slice(start, start + windowSize);
    const candidate = {
      shape: Math.round(median(window.map((sample) => sample.shape))),
      orientation: Math.round(median(window.map((sample) => sample.orientation))),
      coordination: Math.round(median(window.map((sample) => sample.coordination))),
    };
    if (candidate.shape + candidate.orientation * 0.3 + candidate.coordination * 0.35 > best.shape + best.orientation * 0.3 + best.coordination * 0.35) best = candidate;
  }

  let movement: number | null = null;
  if (movingTip[letter] !== undefined) {
    movement = movementScore(
      selectedPoses(attemptFrames.filter((frame) => frame.hands.length === 1), 1),
      movingTip[letter],
    );
  }
  const orientationThreshold = directionalLetters.has(letter) ? 67 : 50;
  const passed = best.shape >= (requiredHands === 2 ? 68 : 72)
    && best.orientation >= orientationThreshold
    && (requiredHands === 1 || best.coordination >= 55)
    && (movement === null || movement >= 90);
  const feedback = passed
    ? `Gerakan huruf ${letter} sesuai dengan contoh.`
    : best.shape < (requiredHands === 2 ? 68 : 72)
      ? 'Bentuk dan jarak antarjari masih berbeda dari contoh. Perjelas ujung jari lalu coba lagi.'
      : best.orientation < orientationThreshold
        ? 'Arah tangan belum seperti contoh. Putar pergelangan lalu coba lagi.'
        : requiredHands === 2 && best.coordination < 55
          ? 'Jarak dan hubungan kedua tangan belum seperti contoh.'
          : 'Lintasan gerakan belum menyerupai contoh. Gerakkan dari awal sampai akhir dengan jelas.';
  return { assessable: true, passed, ...best, coordination: requiredHands === 2 ? best.coordination : null, movement, visibleFrames, feedback };
}

/** A passing match must also beat the other letters with the same hand count. */
export function scoreAlphabetWithAlternatives(
  letter: AlphabetLetter,
  referenceFrames: GestureFrame[],
  attemptFrames: GestureFrame[],
  references: AlphabetReferenceSet,
): AlphabetAssessment {
  const filename = `${letter.toLowerCase()}.mp4`;
  const rank = (assessment: AlphabetAssessment) => assessment.coordination === null
    ? assessment.shape * 0.85 + assessment.orientation * 0.15
    : assessment.shape * 0.6 + assessment.orientation * 0.1 + assessment.coordination * 0.3;
  const best = (candidateLetter: AlphabetLetter, candidates: GestureFrame[][]) => candidates
    .map((frames) => scoreAlphabetGesture(candidateLetter, frames, attemptFrames))
    .sort((a, b) => Number(b.passed) - Number(a.passed) || rank(b) - rank(a))[0];
  const target = best(letter, [referenceFrames, ...(references.variants[filename] ?? [])]);
  if (!target.passed) return target;
  let strongest: { letter: string; score: AlphabetAssessment } | null = null;
  for (const [otherFilename, frames] of Object.entries(references.frames)) {
    const otherLetter = otherFilename[0]?.toUpperCase();
    if (!otherLetter || otherLetter === letter) continue;
    const score = best(otherLetter as AlphabetLetter, [frames, ...(references.variants[otherFilename] ?? [])]);
    if (score.passed && (!strongest || rank(score) > rank(strongest.score))) {
      strongest = { letter: otherLetter, score };
    }
  }
  if (strongest && rank(strongest.score) >= rank(target) + 3) {
    return {
      ...target,
      passed: false,
      feedback: `Gerakan lebih menyerupai huruf ${strongest.letter}. Perhatikan pembeda huruf ${letter} pada video contoh.`,
    };
  }
  return target;
}
