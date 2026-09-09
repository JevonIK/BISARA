import assert from 'node:assert/strict';
import { test } from 'node:test';

import { berkenalanSignIds } from '@/lib/berkenalan-data';
import { signIds } from '@/lib/curriculum-data';
import { allMissions, chapters } from '@/lib/learning-data';
import {
  getBerkenalanLearningState,
  isMissionUnlocked,
} from '@/lib/learning-progress';
import {
  emptyAccountProgress,
  parseProgressSnapshot,
} from '@/lib/progress-storage';

void test('mission stages unlock only after their real prerequisite', () => {
  const unlockedProgress = {
    ...emptyAccountProgress,
    completedMissions: 2,
    completedMissionIds: ['saya-dan-kamu', 'sapaan-waktu'],
  };
  const initial = getBerkenalanLearningState(unlockedProgress);
  assert.equal(initial.masteredSignCount, 0);
  assert.equal(initial.next.href.endsWith('sign=saya'), true);

  const allSignsPassed = {
    ...unlockedProgress,
    signMastery: Object.fromEntries(
      berkenalanSignIds.map((signId) => [
        signId,
        {
          bestScore: 82,
          passed: true,
          attempts: 1,
          lastPracticedAt: '',
        },
      ]),
    ) as typeof emptyAccountProgress.signMastery,
  };
  const recognitionNext = getBerkenalanLearningState(allSignsPassed);
  assert.equal(recognitionNext.practiceComplete, true);
  assert.equal(recognitionNext.recognitionComplete, false);
  assert.equal(recognitionNext.next.href.includes('mode=recognition'), true);

  const contextNext = getBerkenalanLearningState({
    ...allSignsPassed,
    bestChapterScore: 80,
  });
  assert.equal(contextNext.recognitionComplete, true);
  assert.equal(contextNext.next.href.includes('mode=context'), true);

  const completed = getBerkenalanLearningState({
    ...allSignsPassed,
    bestChapterScore: 80,
    conversationCompletions: 1,
  });
  assert.equal(completed.conversationComplete, true);
  assert.equal(completed.progressPercent, 100);
});

void test('curriculum covers all 32 dataset labels once and exposes four complete chapters', () => {
  assert.equal(signIds.length, 32);
  assert.equal(new Set(signIds).size, 32);
  assert.equal(chapters.length, 4);
  assert.equal(allMissions.length, 20);
  const covered = new Set(allMissions.flatMap((mission) => mission.signIds));
  assert.deepEqual([...signIds].sort(), [...covered].sort());
  assert.equal(
    allMissions.every((mission) => mission.contextChallenges.length >= 2),
    true,
  );
});

void test('missions unlock in curriculum order', () => {
  assert.equal(isMissionUnlocked('saya-dan-kamu', emptyAccountProgress), true);
  assert.equal(isMissionUnlocked('sapaan-waktu', emptyAccountProgress), false);
  assert.equal(
    isMissionUnlocked('sapaan-waktu', {
      ...emptyAccountProgress,
      completedMissionIds: ['saya-dan-kamu'],
      completedMissions: 1,
    }),
    true,
  );
});

void test('legacy gesture result migrates as Saya only', () => {
  const migrated = parseProgressSnapshot(
    JSON.stringify({
      bestGestureScore: 85,
      gestureAttempts: 3,
      completedMissions: 3,
      conversationCompletions: 0,
    }),
  );
  assert.equal(migrated.signMastery.saya.passed, true);
  assert.equal(migrated.signMastery.saya.bestScore, 85);
  assert.equal(
    berkenalanSignIds.filter((signId) => migrated.signMastery[signId].passed)
      .length,
    1,
  );
  assert.equal(
    migrated.completedMissions,
    2,
    'legacy single-sign completion must not finish the whole mission',
  );
});
