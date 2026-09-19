import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import { berkenalanSignIds } from '@/lib/berkenalan-data';
import { alphabetMissionGroups, alphabetVideos, getAlphabetVideosForMission } from '@/lib/alphabet-data';
import { signIds } from '@/lib/curriculum-data';
import {
  allMissions,
  buildRecognitionQuestions,
  chapters,
  getMission,
} from '@/lib/learning-data';
import {
  getBerkenalanLearningState,
  getChapterProgress,
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
  getProductionTestSignIds,
  hasPassedProductionTest,
  nextRecallHistory,
  recordRecallAttempt,
  recordMissionCompletion,
  recordMissionRecognition,
  recordProductionAssessment,
  getProgressSnapshot,
} from '@/lib/progress-storage';
import type { GestureScore } from '@/lib/gesture-scoring';

void test('mission stages unlock only after their real prerequisite', () => {
  const alphabetComplete = alphabetMissionGroups.map(({ id }) => id);
  const unlockedProgress = {
    ...emptyAccountProgress,
    completedMissions: alphabetComplete.length,
    completedMissionIds: alphabetComplete,
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
  assert.equal(contextNext.missionComplete, false);
  assert.equal(contextNext.next.href.includes('mode=recall'), true);

  const completed = getBerkenalanLearningState({
    ...allSignsPassed,
    missionScores: { berkenalan: 80 },
    completedMissionIds: [...alphabetComplete, 'berkenalan'],
    completedMissions: alphabetComplete.length + 1,
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

void test('word curriculum and alphabet cover five chapters with distinct missions', () => {
  assert.equal(signIds.length, 32);
  assert.equal(new Set(signIds).size, 32);
  assert.equal(chapters.length, 5);
  assert.equal(allMissions.length, 25);
  assert.deepEqual(chapters.map((chapter) => chapter.number), ['01', '02', '03', '04', '05']);
  assert.equal(chapters[0].title, 'Alfabet dalam BISINDO');
  assert.deepEqual(chapters[0].missions.map((mission) => mission.title), ['A–E', 'F–J', 'K–O', 'P–T', 'U–Z']);
  assert.equal(chapters[1].title, 'Perkenalan & relasi');
  const covered = new Set(allMissions.flatMap((mission) => mission.signIds));
  assert.deepEqual([...signIds].sort(), [...covered].sort());
  assert.deepEqual(alphabetVideos.map((video) => video.letter), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  assert.equal(new Set(alphabetVideos.map((video) => video.letter)).size, 26);
  assert.equal(new Set(alphabetVideos.map((video) => video.videoSrc)).size, 26);
  for (const video of alphabetVideos) {
    assert.equal(existsSync(`public${video.videoSrc}`), true, `Missing video for ${video.letter}`);
  }
  for (const group of alphabetMissionGroups) {
    assert.deepEqual(getAlphabetVideosForMission(group.id).map(({ letter }) => letter), [...group.letters]);
    assert.deepEqual(getMission(group.id).vocabulary, [...group.letters]);
    assert.deepEqual(getMission(group.id).signIds, []);
    assert.deepEqual(buildRecognitionQuestions(getMission(group.id)), []);
    assert.deepEqual(getProductionTestSignIds(group.id), []);
  }
});

void test('alphabet is Bab 1 and uses existing mission completion without checker rewards', () => {
  const unlocked = { ...emptyAccountProgress, completedMissionIds: [] };
  assert.equal(isMissionUnlocked('alfabet-a-e', unlocked), true);
  assert.equal(isMissionUnlocked('alfabet-f-j', unlocked), false);
  assert.equal(isMissionUnlocked('berkenalan', unlocked), false);
  assert.equal(getMissionLearningState('alfabet-a-e', unlocked).next.href, getMission('alfabet-a-e').href);
  assert.equal(getMissionReplayAction('alfabet-a-e').href, getMission('alfabet-a-e').href);

  let snapshot = JSON.stringify(unlocked);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => snapshot,
        setItem: (_key: string, value: string) => { snapshot = value; },
      },
      dispatchEvent: () => true,
    },
  });
  try {
    const completed = recordMissionCompletion('alfabet-a-e');
    assert.equal(completed.completedMissionIds.includes('alfabet-a-e'), true);
    assert.equal(completed.xp, unlocked.xp + getMission('alfabet-a-e').xp);
    assert.equal(completed.totalPracticeMinutes, unlocked.totalPracticeMinutes);
    assert.equal(getChapterProgress('chapter-5', completed), 20);
    assert.equal(isMissionUnlocked('alfabet-f-j', completed), true);
    assert.equal(recordMissionCompletion('alfabet-a-e').xp, completed.xp);
    assert.equal(parseProgressSnapshot(snapshot).missionScores['alfabet-a-e'], undefined);
    assert.equal(recordMissionCompletion('alfabet-k-o').completedMissionIds.includes('alfabet-k-o'), false);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
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
  assert.equal(isMissionUnlocked('alfabet-a-e', emptyAccountProgress), true);
  assert.equal(isMissionUnlocked('berkenalan', emptyAccountProgress), false);
  const alphabetComplete = alphabetMissionGroups.map(({ id }) => id);
  assert.equal(
    isMissionUnlocked('berkenalan', {
      ...emptyAccountProgress,
      completedMissionIds: alphabetComplete,
      completedMissions: alphabetComplete.length,
    }),
    true,
  );
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

void test('local debug opens every mission without manufacturing completion', () => {
  const original = Object.getOwnPropertyDescriptor(process.env, 'NODE_ENV');
  try {
    Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, enumerable: true, writable: true, value: 'production' });
    assert.equal(isMissionUnlocked('alfabet-u-z', emptyAccountProgress), false);

    Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, enumerable: true, writable: true, value: 'development' });
    assert.equal(isMissionUnlocked('alfabet-u-z', emptyAccountProgress), true);
    const learning = getMissionLearningState('alfabet-u-z', emptyAccountProgress);
    assert.equal(learning.unlocked, true);
    assert.equal(learning.missionComplete, false);
    assert.equal(learning.progressPercent, 0);
    assert.equal(emptyAccountProgress.completedMissionIds.includes('alfabet-u-z'), false);
  } finally {
    if (original) Object.defineProperty(process.env, 'NODE_ENV', original);
    else Reflect.deleteProperty(process.env, 'NODE_ENV');
  }
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

void test('old completion stays valid, while recognition-only progress waits for final section', () => {
  const stored = structuredClone(defaultProgress);
  stored.completedMissionIds = alphabetMissionGroups.map(({ id }) => id);
  stored.completedMissions = stored.completedMissionIds.length;
  stored.conversationCompletions = 0;
  stored.conversationCompletionsByMission = {};
  const migrated = parseProgressSnapshot(JSON.stringify(stored));
  assert.equal(migrated.completedMissionIds.includes('berkenalan'), false);
  assert.equal(
    getMissionLearningState('berkenalan', migrated).next.href.includes(
      'mode=recall',
    ),
    true,
  );
  assert.equal(migrated.conversationCompletions, 0);
  assert.equal(migrated.signMastery.teman.recall, undefined);
  assert.equal(isMissionUnlocked('orang-terdekat', migrated), false);
  assert.equal(
    isMissionUnlocked(
      'orang-terdekat',
      parseProgressSnapshot(JSON.stringify(defaultProgress)),
    ),
    true,
  );
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

void test('only finishing all mission sections unlocks the next mission and pays completion once', () => {
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
    assert.equal(passed.completedMissionIds.includes('berkenalan'), false);
    assert.equal(isMissionUnlocked('orang-terdekat', passed), false);
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
    recordRecallAttempt('saya', 'independent');
    recordRecallAttempt('siapa', 'assisted');
    assert.equal(
      recordMissionCompletion('berkenalan').completedMissionIds.includes(
        'berkenalan',
      ),
      false,
    );
    const scored: GestureScore = {
      overall: 82,
      handshape: 80,
      movement: 80,
      orientation: 80,
      orientationAssessable: true,
      position: 80,
      coordination: 80,
      detectionQuality: 100,
      assessable: true,
      passed: true,
      feedback: 'Gerakan sesuai.',
      gestureKind: 'motion',
      requiredHandCount: 1,
      positionRelativeToBody: true,
      criticalMismatch: null,
      confusableWith: null,
    };
    const invalid = recordProductionAssessment('berkenalan', 'saya', {
      ...scored,
      assessable: false,
      passed: false,
    });
    assert.equal(hasPassedProductionTest(invalid, 'berkenalan', 'saya'), false);
    const wrong = recordProductionAssessment('berkenalan', 'saya', {
      ...scored,
      overall: 40,
      passed: false,
    });
    assert.equal(hasPassedProductionTest(wrong, 'berkenalan', 'saya'), false);
    const targets = getProductionTestSignIds('berkenalan');
    for (const signId of targets.slice(0, -1)) {
      const partial = recordProductionAssessment('berkenalan', signId, scored);
      assert.equal(partial.completedMissionIds.includes('berkenalan'), false);
      assert.equal(isMissionUnlocked('orang-terdekat', partial), false);
    }
    const resumed = parseProgressSnapshot(getProgressSnapshot());
    assert.equal(hasPassedProductionTest(resumed, 'berkenalan', 'saya'), true);
    const completed = recordProductionAssessment(
      'berkenalan',
      targets.at(-1)!,
      scored,
    );
    assert.equal(completed.completedMissionIds.includes('berkenalan'), true);
    assert.equal(isMissionUnlocked('orang-terdekat', completed), true);
    assert.equal(recordMissionCompletion('berkenalan').xp, completed.xp);
    assert.equal(
      getProductionTestSignIds('checkpoint-percakapan').length,
      8,
      'the final checkpoint tests a fixed sample rather than all 32 signs',
    );
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
