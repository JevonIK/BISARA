import type { StarRating } from '@/lib/scoring';
import { signIds, signs, type SignId } from '@/lib/curriculum-data';
import { allMissions, getMission } from '@/lib/learning-data';
import {
  PROGRESS_EVENT,
  scopedProgressKey,
  scopedSnapshot,
  writeScopedSnapshot,
} from '@/lib/account-cache';

export type WeeklyActivity = { day: string; minutes: number };
export type RecallOutcome = 'independent' | 'assisted' | 'needs-practice';
export type RecallHistory = {
  independentAttempts: number;
  assistedAttempts: number;
  needsPracticeAttempts: number;
  lastOutcome: RecallOutcome;
  lastPracticedAt: string;
  nextReviewAt: string;
  intervalDays: number;
};

export type SignMastery = {
  recall?: RecallHistory;
  bestScore: number;
  passed: boolean;
  attempts: number;
  lastPracticedAt: string;
};

export type UserProgress = {
  xp: number;
  streak: number;
  lastActiveDate: string;
  completedMissions: number;
  completedMissionIds: string[];
  masteredSigns: number;
  totalPracticeMinutes: number;
  bestChapterScore: number;
  bestGestureScore: number;
  lastChapterScore: number;
  chapterOneStars: StarRating;
  testAttempts: number;
  gestureAttempts: number;
  conversationCompletions: number;
  missionScores: Record<string, number>;
  conversationCompletionsByMission: Record<string, number>;
  signMastery: Record<SignId, SignMastery>;
  reviewDate: string;
  reviewedSigns: string[];
  weeklyActivity: WeeklyActivity[];
};

export const REVIEW_SIZE = 5;

function emptySignMastery(): Record<SignId, SignMastery> {
  return Object.fromEntries(
    signIds.map((signId) => [
      signId,
      { bestScore: 0, passed: false, attempts: 0, lastPracticedAt: '' },
    ]),
  ) as Record<SignId, SignMastery>;
}

function demoSignMastery() {
  const result = emptySignMastery();
  for (const signId of [
    'saya',
    'siapa',
    'teman',
    'terima-kasih',
    'maaf',
    'keluarga',
  ] as SignId[]) {
    result[signId] = {
      bestScore: 82,
      passed: true,
      attempts: 1,
      lastPracticedAt: '',
    };
  }
  return result;
}

export const defaultProgress: UserProgress = {
  xp: 1240,
  streak: 7,
  lastActiveDate: '',
  completedMissions: 2,
  completedMissionIds: ['berkenalan', 'orang-terdekat'],
  masteredSigns: 6,
  totalPracticeMinutes: 84,
  bestChapterScore: 85,
  bestGestureScore: 82,
  lastChapterScore: 85,
  chapterOneStars: 2,
  testAttempts: 2,
  gestureAttempts: 6,
  conversationCompletions: 2,
  missionScores: { berkenalan: 85, 'orang-terdekat': 85 },
  conversationCompletionsByMission: {
    berkenalan: 1,
    'orang-terdekat': 1,
  },
  signMastery: demoSignMastery(),
  reviewDate: '',
  reviewedSigns: [],
  weeklyActivity: [
    { day: 'Sen', minutes: 12 },
    { day: 'Sel', minutes: 18 },
    { day: 'Rab', minutes: 8 },
    { day: 'Kam', minutes: 22 },
    { day: 'Jum', minutes: 14 },
    { day: 'Sab', minutes: 10 },
    { day: 'Min', minutes: 0 },
  ],
};

const defaultSnapshot = JSON.stringify(defaultProgress);
export const emptyAccountProgress: UserProgress = {
  ...defaultProgress,
  xp: 0,
  streak: 0,
  completedMissions: 0,
  completedMissionIds: [],
  masteredSigns: 0,
  totalPracticeMinutes: 0,
  bestChapterScore: 0,
  bestGestureScore: 0,
  lastChapterScore: 0,
  chapterOneStars: 0,
  testAttempts: 0,
  gestureAttempts: 0,
  conversationCompletions: 0,
  missionScores: {},
  conversationCompletionsByMission: {},
  signMastery: emptySignMastery(),
  weeklyActivity: defaultProgress.weeklyActivity.map((entry) => ({
    ...entry,
    minutes: 0,
  })),
};

export function getReviewSignIds(
  progress: UserProgress,
  now = new Date(),
): SignId[] {
  const today = localDateKey(now);
  const done =
    progress.reviewDate === today
      ? progress.reviewedSigns.filter((id): id is SignId =>
          signIds.includes(id as SignId),
        )
      : [];
  const due = signs
    .filter(({ id }) => {
      const mastery = progress.signMastery[id];
      return (
        !done.includes(id) &&
        (mastery?.attempts > 0 || mastery?.recall) &&
        (!mastery.recall || mastery.recall.nextReviewAt <= today)
      );
    })
    .sort((a, b) => {
      const first = progress.signMastery[a.id];
      const second = progress.signMastery[b.id];
      const firstDue = first.recall?.nextReviewAt ?? '';
      const secondDue = second.recall?.nextReviewAt ?? '';
      return (
        firstDue.localeCompare(secondDue) || first.bestScore - second.bestScore
      );
    });
  return [...done, ...due.map((sign) => sign.id)].slice(0, REVIEW_SIZE);
}

export function getRecallSignIds(
  progress: UserProgress,
  missionId: string,
): SignId[] {
  const mission = getMission(missionId);
  const current = [...mission.signIds].sort((a, b) => {
    const first = progress.signMastery[a];
    const second = progress.signMastery[b];
    return (
      (first?.recall?.lastPracticedAt ?? '').localeCompare(
        second?.recall?.lastPracticedAt ?? '',
      ) || (first?.bestScore ?? 0) - (second?.bestScore ?? 0)
    );
  });
  const earlier = allMissions
    .slice(0, allMissions.indexOf(mission))
    .flatMap((item) => item.signIds);
  const previous = getReviewSignIds(progress).find(
    (id) => earlier.includes(id) && !current.includes(id),
  );
  return previous ? [...current.slice(0, 2), previous] : current.slice(0, 3);
}

export function nextRecallHistory(
  previous: RecallHistory | undefined,
  outcome: RecallOutcome,
  now = new Date(),
): RecallHistory {
  const today = localDateKey(now);
  const alreadyRecalledToday = previous?.lastPracticedAt.slice(0, 10) === today;
  const intervals = [1, 3, 7, 14, 30];
  const intervalDays =
    outcome !== 'independent'
      ? 1
      : alreadyRecalledToday
        ? previous!.intervalDays
        : (intervals.find((days) => days > (previous?.intervalDays ?? 0)) ??
          30);
  const due = new Date(now);
  due.setDate(due.getDate() + intervalDays);
  return {
    independentAttempts:
      (previous?.independentAttempts ?? 0) + Number(outcome === 'independent'),
    assistedAttempts:
      (previous?.assistedAttempts ?? 0) + Number(outcome === 'assisted'),
    needsPracticeAttempts:
      (previous?.needsPracticeAttempts ?? 0) +
      Number(outcome === 'needs-practice'),
    lastOutcome: outcome,
    // A local date keeps daily scheduling stable across UTC midnight.
    lastPracticedAt: today,
    nextReviewAt: localDateKey(due),
    intervalDays,
  };
}

export function recordRecallAttempt(signId: SignId, outcome: RecallOutcome) {
  return updateProgress((progress) => {
    const previous = progress.signMastery[signId];
    const today = localDateKey(new Date());
    const doneToday =
      progress.reviewDate === today ? progress.reviewedSigns : [];
    const firstToday = !doneToday.includes(signId);
    return markActive({
      ...progress,
      signMastery: {
        ...progress.signMastery,
        [signId]: {
          ...previous,
          recall: nextRecallHistory(previous.recall, outcome),
        },
      },
      reviewDate: today,
      reviewedSigns: [...new Set([...doneToday, signId])],
      xp: progress.xp + (firstToday ? 10 : 0),
      totalPracticeMinutes: progress.totalPracticeMinutes + 1,
      weeklyActivity: addMinutesToToday(progress.weeklyActivity, 1),
    });
  });
}

export function getProgressSnapshot() {
  if (typeof window === 'undefined') return defaultSnapshot;
  return scopedSnapshot(defaultSnapshot, JSON.stringify(emptyAccountProgress));
}

export function getServerProgressSnapshot() {
  return defaultSnapshot;
}

export function parseProgressSnapshot(snapshot: string): UserProgress {
  try {
    const stored = JSON.parse(snapshot) as Partial<UserProgress>;
    const signMastery = emptySignMastery();
    if (stored.signMastery && typeof stored.signMastery === 'object') {
      for (const signId of signIds) {
        const entry = stored.signMastery[signId];
        if (!entry || typeof entry !== 'object') continue;
        signMastery[signId] = {
          recall: cleanRecallHistory(entry.recall),
          bestScore: clampScore(entry.bestScore),
          passed: entry.passed === true,
          attempts: Number.isFinite(entry.attempts)
            ? Math.max(0, Math.floor(entry.attempts))
            : 0,
          lastPracticedAt:
            typeof entry.lastPracticedAt === 'string'
              ? entry.lastPracticedAt
              : '',
        };
      }
    } else if ((stored.bestGestureScore ?? 0) >= 75) {
      signMastery.saya = {
        bestScore: clampScore(stored.bestGestureScore),
        passed: true,
        attempts: Math.max(1, stored.gestureAttempts ?? 1),
        lastPracticedAt: '',
      };
    }

    const rawLegacyCompleted = Math.max(
      0,
      Math.floor(stored.completedMissions ?? defaultProgress.completedMissions),
    );
    const legacyCompleted =
      rawLegacyCompleted >= 3 && (stored.conversationCompletions ?? 0) === 0
        ? 2
        : rawLegacyCompleted;
    const completedMissionIds = Array.isArray(stored.completedMissionIds)
      ? stored.completedMissionIds.filter(
          (id): id is string =>
            typeof id === 'string' &&
            allMissions.some((mission) => mission.id === id),
        )
      : allMissions.slice(0, legacyCompleted).map((mission) => mission.id);
    const missionScores = cleanScoreMap(stored.missionScores);
    if (
      stored.missionScores === undefined &&
      (stored.bestChapterScore ?? 0) > 0
    ) {
      missionScores.berkenalan = clampScore(stored.bestChapterScore);
    }
    const conversationCompletionsByMission = cleanCountMap(
      stored.conversationCompletionsByMission,
    );
    if (
      stored.conversationCompletionsByMission === undefined &&
      (stored.conversationCompletions ?? 0) > 0
    ) {
      conversationCompletionsByMission.berkenalan = Math.floor(
        stored.conversationCompletions ?? 0,
      );
    }
    for (const missionId of completedMissionIds) {
      missionScores[missionId] = Math.max(missionScores[missionId] ?? 0, 70);
    }
    const recordedConversationCompletions = Object.values(
      conversationCompletionsByMission,
    ).reduce((total, count) => total + count, 0);
    const recordedBestRecognition = Math.max(
      0,
      ...Object.values(missionScores),
    );

    for (const mission of allMissions) {
      if (
        (missionScores[mission.id] ?? 0) >= 70 &&
        (mission.type === 'checkpoint' ||
          mission.signIds.every((id) => signMastery[id].passed)) &&
        !completedMissionIds.includes(mission.id)
      )
        completedMissionIds.push(mission.id);
    }

    const progress: UserProgress = {
      ...defaultProgress,
      ...stored,
      completedMissions: completedMissionIds.length,
      completedMissionIds: [...new Set(completedMissionIds)],
      bestChapterScore: Math.max(
        stored.bestChapterScore ?? defaultProgress.bestChapterScore,
        recordedBestRecognition,
      ),
      conversationCompletions: Math.max(
        stored.conversationCompletions ??
          defaultProgress.conversationCompletions,
        recordedConversationCompletions,
      ),
      signMastery,
      missionScores,
      conversationCompletionsByMission,
      reviewedSigns: Array.isArray(stored.reviewedSigns)
        ? stored.reviewedSigns.filter(
            (id): id is SignId =>
              typeof id === 'string' && signIds.includes(id as SignId),
          )
        : [],
      weeklyActivity: Array.isArray(stored.weeklyActivity)
        ? stored.weeklyActivity
        : defaultProgress.weeklyActivity,
    };
    const reviewExpired =
      progress.reviewDate && progress.reviewDate !== localDateKey(new Date());
    return reviewExpired
      ? { ...progress, reviewDate: '', reviewedSigns: [] }
      : progress;
  } catch {
    return defaultProgress;
  }
}

export function subscribeToProgress(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === scopedProgressKey() || event.key === null) callback();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(PROGRESS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(PROGRESS_EVENT, callback);
  };
}

export function recordMissionRecognition(
  missionId: string,
  score: number,
  stars: StarRating,
) {
  return updateProgress((progress) => {
    const previousScore = progress.missionScores[missionId] ?? 0;
    const nextScore = Math.max(previousScore, clampScore(score));
    const xpGain = Math.max(
      0,
      Math.round((nextScore / 100) * 15) -
        Math.round((previousScore / 100) * 15),
    );
    return markActive(
      completeEligibleMission(
        {
          ...progress,
          xp: progress.xp + xpGain,
          bestChapterScore: Math.max(progress.bestChapterScore, nextScore),
          lastChapterScore: clampScore(score),
          chapterOneStars: Math.max(
            progress.chapterOneStars,
            stars,
          ) as StarRating,
          testAttempts: progress.testAttempts + 1,
          missionScores: { ...progress.missionScores, [missionId]: nextScore },
          totalPracticeMinutes: progress.totalPracticeMinutes + 3,
          weeklyActivity: addMinutesToToday(progress.weeklyActivity, 3),
        },
        missionId,
      ),
    );
  });
}

export function recordTranslationTest(score: number, stars: StarRating) {
  return recordMissionRecognition('berkenalan', score, stars);
}

function completeEligibleMission(
  progress: UserProgress,
  missionId: string,
): UserProgress {
  const mission = getMission(missionId);
  if (
    progress.completedMissionIds.includes(missionId) ||
    (progress.missionScores[missionId] ?? 0) < 70 ||
    (mission.type !== 'checkpoint' &&
      !mission.signIds.every((id) => progress.signMastery[id]?.passed))
  )
    return progress;
  const completedMissionIds = [...progress.completedMissionIds, missionId];
  const practiceReward =
    mission.type === 'lesson' ? mission.signIds.length * 5 : 0;
  return {
    ...progress,
    completedMissionIds,
    completedMissions: completedMissionIds.length,
    xp: progress.xp + Math.max(10, mission.xp - practiceReward - 15),
  };
}

export function recordMissionCompletion(missionId: string) {
  return updateProgress((progress) =>
    completeEligibleMission(progress, missionId),
  );
}

export function recordConversationCompletion() {
  return recordMissionCompletion('berkenalan');
}

export function recordGestureAssessment(
  signId: SignId,
  score: number,
  passed: boolean,
  options: { recordingDurationMs?: number; review?: boolean } = {},
) {
  return updateProgress((progress) => {
    const previousMastery = progress.signMastery[signId];
    const firstPass = passed && !previousMastery.passed;
    const practiceMinutes = Math.max(
      1,
      Math.ceil((options.recordingDurationMs ?? 60_000) / 60_000),
    );
    return markActive({
      ...progress,
      xp: progress.xp + (firstPass ? 5 : 0),
      bestGestureScore: Math.max(progress.bestGestureScore, score),
      gestureAttempts: progress.gestureAttempts + 1,
      masteredSigns: progress.masteredSigns + (firstPass ? 1 : 0),
      signMastery: {
        ...progress.signMastery,
        [signId]: {
          ...previousMastery,
          bestScore: Math.max(previousMastery.bestScore, score),
          passed: previousMastery.passed || passed,
          attempts: previousMastery.attempts + 1,
          lastPracticedAt: new Date().toISOString(),
        },
      },
      totalPracticeMinutes: progress.totalPracticeMinutes + practiceMinutes,
      weeklyActivity: addMinutesToToday(
        progress.weeklyActivity,
        practiceMinutes,
      ),
    });
  });
}

function updateProgress(updater: (progress: UserProgress) => UserProgress) {
  if (typeof window === 'undefined') return defaultProgress;
  const updated = updater(parseProgressSnapshot(getProgressSnapshot()));
  writeScopedSnapshot(JSON.stringify(updated));
  return updated;
}

function markActive(progress: UserProgress): UserProgress {
  const today = localDateKey(new Date());
  if (progress.lastActiveDate === today) return progress;
  if (!progress.lastActiveDate)
    return {
      ...progress,
      streak: Math.max(1, progress.streak),
      lastActiveDate: today,
    };
  const dayDifference = Math.round(
    (parseDateKey(today).getTime() -
      parseDateKey(progress.lastActiveDate).getTime()) /
      86_400_000,
  );
  return {
    ...progress,
    streak: dayDifference === 1 ? progress.streak + 1 : 1,
    lastActiveDate: today,
  };
}

function addMinutesToToday(activity: WeeklyActivity[], minutes: number) {
  const todayIndex = (new Date().getDay() + 6) % 7;
  return activity.map((entry, index) =>
    index === todayIndex
      ? { ...entry, minutes: entry.minutes + minutes }
      : entry,
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function cleanScoreMap(value: unknown) {
  if (!value || typeof value !== 'object') return {} as Record<string, number>;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id]) => allMissions.some((mission) => mission.id === id))
      .map(([id, score]) => [id, clampScore(score)]),
  );
}

function cleanCountMap(value: unknown) {
  if (!value || typeof value !== 'object') return {} as Record<string, number>;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id]) => allMissions.some((mission) => mission.id === id))
      .map(([id, count]) => [
        id,
        typeof count === 'number' && Number.isFinite(count)
          ? Math.max(0, Math.floor(count))
          : 0,
      ]),
  );
}

function clampScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;
}

function cleanRecallHistory(value: unknown): RecallHistory | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as RecallHistory;
  if (
    !['independent', 'assisted', 'needs-practice'].includes(
      record.lastOutcome,
    ) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.nextReviewAt) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.lastPracticedAt)
  )
    return undefined;
  const count = (value: number) =>
    Number.isFinite(value)
      ? Math.min(1_000_000, Math.max(0, Math.floor(value)))
      : 0;
  return {
    independentAttempts: count(record.independentAttempts),
    assistedAttempts: count(record.assistedAttempts),
    needsPracticeAttempts: count(record.needsPracticeAttempts),
    lastOutcome: record.lastOutcome,
    lastPracticedAt: record.lastPracticedAt,
    nextReviewAt: record.nextReviewAt,
    intervalDays: Math.min(30, Math.max(1, count(record.intervalDays))),
  };
}
