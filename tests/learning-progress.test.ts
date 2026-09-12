import assert from 'node:assert/strict';
import { test } from 'node:test';

import { berkenalanSignIds } from '@/lib/berkenalan-data';
import { signIds } from '@/lib/curriculum-data';
import {
  allMissions,
  buildRecognitionQuestions,
  chapters,
  getMission,
} from '@/lib/learning-data';
import {
  getBerkenalanLearningState,
  getMissionLearningState,
  isMissionUnlocked,
} from '@/lib/learning-progress';
import {
  defaultProgress,
  emptyAccountProgress,
  parseProgressSnapshot,
} from '@/lib/progress-storage';

void test('mission stages unlock only after their real prerequisite', () => {
  const unlockedProgress = {
    ...emptyAccountProgress,
    completedMissions: 0,
    completedMissionIds: [],
  };
  const initial = getBerkenalanLearningState(unlockedProgress);
  assert.equal(initial.masteredSignCount, 0);
  assert.equal(initial.practiceStarted, false);
  assert.equal(initial.progressPercent, 0);
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

  const unrelatedScore = getBerkenalanLearningState({
    ...allSignsPassed,
    bestChapterScore: 100,
    missionScores: { 'orang-terdekat': 100 },
  });
  assert.equal(
    unrelatedScore.recognitionComplete,
    false,
    'a score from another mission must not unlock this recognition stage',
  );

  const contextNext = getBerkenalanLearningState({
    ...allSignsPassed,
    missionScores: { berkenalan: 80 },
  });
  assert.equal(contextNext.recognitionComplete, true);
  assert.equal(contextNext.next.href.includes('mode=context'), true);

  const completed = getBerkenalanLearningState({
    ...allSignsPassed,
    missionScores: { berkenalan: 80 },
    conversationCompletionsByMission: { berkenalan: 1 },
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

void test('every context activity has one valid target and differs from recognition', () => {
  for (const mission of allMissions) {
    for (const challenge of mission.contextChallenges) {
      assert.equal(
        mission.signIds.includes(challenge.cueSignId),
        true,
        `${challenge.id} must use a cue taught in the mission`,
      );
      assert.equal(
        new Set(challenge.options).size,
        challenge.options.length,
        `${challenge.id} must not repeat an option`,
      );
      assert.equal(
        challenge.options.length,
        3,
        `${challenge.id} needs 3 options`,
      );
      assert.equal(
        challenge.options.includes(challenge.answer),
        true,
        `${challenge.id} must include its answer`,
      );
      assert.equal(
        mission.signIds.includes(challenge.answer),
        true,
        `${challenge.id} must assess a sign taught in the mission`,
      );
      assert.notEqual(
        challenge.cueSignId,
        challenge.answer,
        `${challenge.id} must apply a cue instead of repeating recognition`,
      );
    }
  }
});

void test('recognition questions use unique options and rotate balanced checkpoints', () => {
  for (const [missionIndex, mission] of allMissions.entries()) {
    const first = buildRecognitionQuestions(mission, 0);
    const retry = buildRecognitionQuestions(mission, 1);
    const introducedSignIds = new Set(
      allMissions
        .slice(0, missionIndex + 1)
        .flatMap((introducedMission) => introducedMission.signIds),
    );
    const expectedCount =
      mission.type === 'checkpoint'
        ? mission.id === 'checkpoint-percakapan'
          ? 8
          : Math.min(6, mission.signIds.length)
        : mission.signIds.length;
    assert.equal(first.length, expectedCount);
    for (const question of first) {
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options).size, 3);
      assert.equal(question.options.includes(question.signId), true);
      assert.equal(
        question.options.every((option) => introducedSignIds.has(option)),
        true,
        `${mission.id} must not use unseen vocabulary as a distractor`,
      );
    }
    if (mission.signIds.length > 2) {
      assert.notDeepEqual(first, retry, `${mission.id} should change on retry`);
    }
  }

  const finalCheckpoint = buildRecognitionQuestions(
    getMission('checkpoint-percakapan'),
    0,
  );
  assert.equal(finalCheckpoint.length, 8);
});

void test('missions unlock in curriculum order', () => {
  assert.equal(isMissionUnlocked('berkenalan', emptyAccountProgress), true);
  assert.equal(
    isMissionUnlocked('orang-terdekat', emptyAccountProgress),
    false,
  );
  assert.equal(
    isMissionUnlocked('orang-terdekat', {
      ...emptyAccountProgress,
      completedMissionIds: ['berkenalan'],
      completedMissions: 1,
    }),
    true,
  );
});

void test('demo completion data agrees with every completed mission stage', () => {
  for (const missionId of defaultProgress.completedMissionIds) {
    const state = getMissionLearningState(missionId, defaultProgress);
    assert.equal(state.practiceComplete, true);
    assert.equal(state.recognitionComplete, true);
    assert.equal(state.conversationComplete, true);
    assert.equal(state.progressPercent, 100);
  }
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
