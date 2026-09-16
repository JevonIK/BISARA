import { readFile } from 'node:fs/promises';

import {
  getSigns,
  signIds,
  SIGN_VIDEO_VERSION,
} from '../lib/curriculum-data.ts';
import {
  getRequiredHandCount,
  hasUsableReference,
  scoreGesture,
} from '../lib/gesture-scoring.ts';

const manifest = JSON.parse(
  await readFile(
    new URL('../public/data/gesture-templates-v1.json', import.meta.url),
    'utf8',
  ),
);
if (manifest.version !== SIGN_VIDEO_VERSION) {
  throw new Error('Versi template tidak cocok dengan versi video kurikulum.');
}

const definitions = getSigns(signIds);
const frames = definitions.map(({ videoSrc, label }) => {
  const filename = videoSrc.split('/').at(-1);
  const reference = manifest.frames[filename];
  if (!reference || !hasUsableReference(reference)) {
    throw new Error(`Landmark referensi ${label} tidak tersedia/valid.`);
  }
  return reference;
});
if (Object.keys(manifest.frames).length !== definitions.length) {
  throw new Error('Jumlah template tidak sama dengan jumlah kosakata.');
}

// Each column is one actual sign, each row is the prompted target sign.
const scores = definitions.map((_, target) =>
  definitions.map((__, actual) => scoreGesture(frames[target], frames[actual])),
);
const handCounts = frames.map(getRequiredHandCount);
const rawWrong = [];
const finalWrong = [];
const newlyAcceptedWithHandCountFilter = [];
const selfRejected = [];
for (const [target, targetSign] of definitions.entries()) {
  for (const [actual, actualSign] of definitions.entries()) {
    const result = scores[target][actual];
    if (target === actual && !result.passed) {
      selfRejected.push(targetSign.label);
    }
    if (target === actual || !result.passed) continue;
    rawWrong.push(`${targetSign.label} ← ${actualSign.label}`);
    const eligible = scores
      .filter(
        (_, index) =>
          index !== target && handCounts[index] === handCounts[target],
      )
      .map((row) => row[actual])
      .filter((score) => score.assessable && score.passed)
      .map((score) => score.overall);
    const bestAlternative = Math.max(...eligible);
    const oldBestAlternative = Math.max(
      ...scores
        .filter((_, index) => index !== target)
        .map((row) => row[actual])
        .filter((score) => score.assessable && score.passed)
        .map((score) => score.overall),
    );
    if (
      oldBestAlternative - result.overall >= 3 &&
      bestAlternative - result.overall < 3
    ) {
      newlyAcceptedWithHandCountFilter.push(
        `${targetSign.label} ← ${actualSign.label}`,
      );
    }
    // A wrong target survives only if the actual sign lacks the same decisive
    // three-point advantage used by scoreGestureWithAlternatives. Scores are
    // computed once here so the exhaustive audit stays fast enough to rerun.
    if (bestAlternative - result.overall < 3) {
      finalWrong.push(`${targetSign.label} ← ${actualSign.label}`);
    }
  }
}

const twoHandSigns = definitions
  .filter((_, index) => getRequiredHandCount(frames[index]) === 2)
  .map((sign) => sign.label);
const alteredHandshapeAccepted = [];
const forcedFingerStyles = {
  kepalan: [4, 8, 12, 16, 20],
  rock: [4, 12, 16],
  duaJari: [4, 16, 20],
};
for (const [index, sign] of definitions.entries()) {
  for (const [style, tips] of Object.entries(forcedFingerStyles)) {
    const attempt = structuredClone(frames[index]);
    for (const frame of attempt) {
      for (const hand of frame.hands) {
        for (const tip of tips) {
          const base = hand.landmarks[tip - 3];
          for (const pointIndex of [tip - 1, tip]) {
            const point = hand.landmarks[pointIndex];
            point.x = base.x + (point.x - base.x) * 0.12;
            point.y = base.y + (point.y - base.y) * 0.12;
          }
        }
      }
    }
    if (scoreGesture(frames[index], attempt).passed) {
      alteredHandshapeAccepted.push(`${sign.label}: ${style}`);
    }
  }
}
console.log(
  JSON.stringify(
    {
      signs: definitions.length,
      pairs: scores.length * scores.length,
      selfRejected,
      rawWrongCount: rawWrong.length,
      finalWrong,
      newlyAcceptedWithHandCountFilter,
      twoHandSigns,
      alteredHandshapeTrials:
        definitions.length * Object.keys(forcedFingerStyles).length,
      alteredHandshapeAccepted,
    },
    null,
    2,
  ),
);
if (selfRejected.length || finalWrong.length || alteredHandshapeAccepted.length)
  process.exitCode = 1;
