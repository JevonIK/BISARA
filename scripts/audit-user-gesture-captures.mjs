import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';

import { getSign, getSigns, isSignId, signIds } from '../lib/curriculum-data.ts';
import {
  getRequiredHandCount,
  scoreGesture,
  scoreGestureWithAlternatives,
} from '../lib/gesture-scoring.ts';
import { selectReferenceWindow } from '../lib/reference-window.ts';

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error('Usage: node --experimental-strip-types scripts/audit-user-gesture-captures.mjs <landmark-debug.json> [...]');
  process.exitCode = 1;
} else {
  const manifest = JSON.parse(await readFile(new URL('../public/data/gesture-templates-v1.json', import.meta.url), 'utf8'));
  const alternatives = getSigns(signIds).map((sign) => {
    const filename = sign.videoSrc.split('/').at(-1);
    const frames = selectReferenceWindow(filename, manifest.frames[filename]);
    return { id: sign.id, label: sign.label, frames, requiredHandCount: getRequiredHandCount(frames) };
  });
  for (const path of paths) {
    const capture = JSON.parse(await readFile(path, 'utf8'));
    if (!isSignId(capture.signId) || !Array.isArray(capture.scoredFrames)) {
      throw new Error(`${basename(path)}: invalid sign ID or scoredFrames`);
    }
    const target = getSign(capture.signId);
    const reference = Array.isArray(capture.referenceFrames) && capture.referenceFrames.length
      ? capture.referenceFrames
      : alternatives.find((sign) => sign.id === target.id).frames;
    const initial = scoreGesture(reference, capture.scoredFrames);
    const final = initial.passed
      ? scoreGestureWithAlternatives(reference, capture.scoredFrames, alternatives.filter((sign) => sign.id !== target.id), initial)
      : initial;
    console.log(JSON.stringify({
      file: basename(path),
      sign: target.label,
      frames: capture.scoredFrames.length,
      initial: { passed: initial.passed, overall: initial.overall, criticalMismatch: initial.criticalMismatch },
      final: {
        assessable: final.assessable,
        passed: final.passed,
        overall: final.overall,
        handshape: final.handshape,
        movement: final.movement,
        orientation: final.orientation,
        position: final.position,
        coordination: final.coordination,
        criticalMismatch: final.criticalMismatch,
        confusableWith: final.confusableWith,
        feedback: final.feedback,
      },
    }));
  }
}
