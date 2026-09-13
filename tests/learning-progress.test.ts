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
  getMissionReplayAction,
  isMissionUnlocked,
} from '@/lib/learning-progress';
import {
  defaultProgress,
  emptyAccountProgress,
  parseProgressSnapshot,
  getReviewSignIds,
  getRecallSignIds,
  nextRecallHistory,
  recordRecallAttempt,
  recordMissionRecognition,
  getProgressSnapshot,
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
  assert.equal(contextNext.missionComplete, true);
  assert.equal(contextNext.next.href.includes('mission=orang-terdekat'), true);

  const completed = getBerkenalanLearningState({
    ...allSignsPassed,
    missionScores: { berkenalan: 80 },
    conversationCompletionsByMission: { berkenalan: 1 },
  });
  assert.equal(completed.conversationComplete, true);
  assert.equal(completed.progressPercent, 100);
});

void test('completed missions replay from their first useful activity without resetting progress', () => {
  const lessonReplay = getMissionReplayAction('berkenalan');
  assert.equal(lessonReplay.href.includes('/missions/practice?'), true);
  assert.equal(lessonReplay.href.includes('sign=saya'), true);
  assert.equal(lessonReplay.href.includes('replay=1'), true);

  const checkpointReplay = getMissionReplayAction('checkpoint-kenalan');
  assert.equal(checkpointReplay.href.includes('/missions/test?'), true);
  assert.equal(checkpointReplay.href.includes('mode=recognition'), true);
  assert.equal(checkpointReplay.href.includes('replay=1'), true);
});

void test('curriculum covers all 32 dataset labels once and exposes four complete chapters', () => {
  assert.equal(signIds.length, 32);
  assert.equal(new Set(signIds).size, 32);
  assert.equal(chapters.length, 4);
  assert.equal(allMissions.length, 20);
  const covered = new Set(allMissions.flatMap((mission) => mission.signIds));
  assert.deepEqual([...signIds].sort(), [...covered].sort());
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

void test('legacy passing recognition completes the mission without inventing recall history', () => {
  const stored = structuredClone(defaultProgress);
  stored.completedMissionIds = [];
  stored.completedMissions = 0;
  stored.conversationCompletions = 0;
  stored.conversationCompletionsByMission = {};
  const migrated = parseProgressSnapshot(JSON.stringify(stored));
  assert.ok(migrated.completedMissionIds.includes('berkenalan'));
  assert.equal(migrated.conversationCompletions, 0);
  assert.equal(migrated.signMastery.teman.recall, undefined);
  assert.equal(isMissionUnlocked('orang-terdekat', migrated), true);
  assert.equal(
    isMissionUnlocked('checkpoint-kenalan', emptyAccountProgress),
    false,
  );
});

void test('recall scheduling spaces independent attempts but brings assisted signs back sooner', () => {
  const first = nextRecallHistory(
    undefined,
    'independent',
    new Date(2026, 8, 12, 10),
  );
  assert.equal(first.nextReviewAt, '2026-09-13');
  const sameDay = nextRecallHistory(
    first,
    'independent',
    new Date(2026, 8, 12, 12),
  );
  assert.equal(
    sameDay.intervalDays,
    1,
    'same-day repetition must not advance spacing',
  );
  const nextDay = nextRecallHistory(
    sameDay,
    'independent',
    new Date(2026, 8, 13, 10),
  );
  assert.equal(nextDay.intervalDays, 3);
  assert.equal(nextDay.nextReviewAt, '2026-09-16');
  const help = nextRecallHistory(
    nextDay,
    'assisted',
    new Date(2026, 8, 16, 10),
  );
  assert.equal(help.nextReviewAt, '2026-09-17');
  assert.equal(help.independentAttempts, 3);
  assert.equal(help.assistedAttempts, 1);
  const retry = nextRecallHistory(
    help,
    'needs-practice',
    new Date(2026, 8, 17, 10),
  );
  assert.equal(retry.needsPracticeAttempts, 1);
  assert.equal(retry.intervalDays, 1);
});

void test('review contains learned, due signs and retains completed cards for the day', () => {
  const progress = structuredClone(emptyAccountProgress);
  assert.deepEqual(
    getReviewSignIds(progress),
    [],
    'never test unseen vocabulary',
  );
  progress.signMastery.saya.attempts = 1;
  progress.signMastery.teman.attempts = 1;
  progress.signMastery.teman.recall = nextRecallHistory(
    undefined,
    'independent',
    new Date(2026, 8, 12, 10),
  );
  assert.deepEqual(getReviewSignIds(progress, new Date(2026, 8, 12, 11)), [
    'saya',
  ]);
  progress.reviewDate = '2026-09-12';
  progress.reviewedSigns = ['teman'];
  assert.deepEqual(getReviewSignIds(progress, new Date(2026, 8, 12, 11)), [
    'teman',
    'saya',
  ]);
  assert.equal(getReviewSignIds(progress, new Date(2026, 8, 13, 11)).length, 2);
  assert.ok(getRecallSignIds(defaultProgress, 'berkenalan').length <= 3);
  assert.ok(
    getRecallSignIds(defaultProgress, 'orang-terdekat').some(
      (id) => !getMission('orang-terdekat').signIds.includes(id),
    ),
    'mix in a learned earlier sign',
  );
});

void test('recognition completes once and self-report keeps checker mastery separate', () => {
  let snapshot = JSON.stringify({
    ...defaultProgress,
    completedMissionIds: [],
    completedMissions: 0,
    missionScores: {},
    xp: 0,
  });
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => snapshot,
        setItem: (_key: string, value: string) => {
          snapshot = value;
        },
      },
      dispatchEvent: () => true,
    },
  });
  try {
    const failed = recordMissionRecognition('berkenalan', 60, 1);
    assert.equal(failed.completedMissionIds.includes('berkenalan'), false);
    const passed = recordMissionRecognition('berkenalan', 80, 2);
    assert.equal(passed.completedMissionIds.includes('berkenalan'), true);
    const repeat = recordMissionRecognition('berkenalan', 80, 2);
    assert.equal(repeat.xp, passed.xp, 'completion reward is awarded once');
    assert.equal(
      repeat.conversationCompletions,
      defaultProgress.conversationCompletions,
    );
    const checkerBefore = repeat.signMastery.teman;
    const assisted = recordRecallAttempt('teman', 'assisted');
    const independent = recordRecallAttempt('teman', 'independent');
    assert.equal(
      independent.xp,
      assisted.xp,
      'repeated self reports cannot farm daily XP',
    );
    assert.equal(
      independent.signMastery.teman.bestScore,
      checkerBefore.bestScore,
    );
    assert.equal(
      independent.signMastery.teman.attempts,
      checkerBefore.attempts,
    );
    assert.equal(independent.signMastery.teman.passed, checkerBefore.passed);
    const restored = parseProgressSnapshot(getProgressSnapshot());
    assert.equal(restored.signMastery.teman.recall?.assistedAttempts, 1);
    assert.equal(restored.signMastery.teman.recall?.independentAttempts, 1);
    const fresh = recordRecallAttempt('air', 'independent');
    assert.equal(
      fresh.signMastery.air.passed,
      false,
      'self-report is not checker verification',
    );
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
