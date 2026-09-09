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
export type SignMastery = {
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
    'apa',
    'pagi',
    'siang',
    'sore',
    'malam',
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
  completedMissionIds: ['saya-dan-kamu', 'sapaan-waktu'],
  masteredSigns: 7,
  totalPracticeMinutes: 84,
  bestChapterScore: 0,
  bestGestureScore: 82,
  lastChapterScore: 0,
  chapterOneStars: 0,
  testAttempts: 0,
  gestureAttempts: 7,
  conversationCompletions: 0,
  missionScores: {},
  conversationCompletionsByMission: {},
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
  bestGestureScore: 0,
  gestureAttempts: 0,
  signMastery: emptySignMastery(),
  weeklyActivity: defaultProgress.weeklyActivity.map((entry) => ({
    ...entry,
    minutes: 0,
  })),
};

export function getReviewSignIds(progress: UserProgress): SignId[] {
  const attempted = signs.filter(
    (sign) => progress.signMastery[sign.id].attempts > 0,
  );
  const candidates = attempted.length ? attempted : signs.slice(0, REVIEW_SIZE);
  return [...candidates]
    .sort((first, second) => {
      const a = progress.signMastery[first.id];
      const b = progress.signMastery[second.id];
      if (a.passed !== b.passed) return a.passed ? 1 : -1;
      if (a.bestScore !== b.bestScore) return a.bestScore - b.bestScore;
      return a.lastPracticedAt.localeCompare(b.lastPracticedAt);
    })
    .slice(0, REVIEW_SIZE)
    .map((sign) => sign.id);
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
      !('berkenalan' in missionScores) &&
      (stored.bestChapterScore ?? 0) > 0
    ) {
      missionScores.berkenalan = clampScore(stored.bestChapterScore);
    }
    const conversationCompletionsByMission = cleanCountMap(
      stored.conversationCompletionsByMission,
    );
    if (
      !('berkenalan' in conversationCompletionsByMission) &&
      (stored.conversationCompletions ?? 0) > 0
    ) {
      conversationCompletionsByMission.berkenalan = Math.floor(
        stored.conversationCompletions ?? 0,
      );
    }

    const progress: UserProgress = {
      ...defaultProgress,
      ...stored,
      completedMissions: completedMissionIds.length,
      completedMissionIds: [...new Set(completedMissionIds)],
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
    return markActive({
      ...progress,
      xp: progress.xp + xpGain,
      bestChapterScore: Math.max(progress.bestChapterScore, nextScore),
      lastChapterScore: clampScore(score),
      chapterOneStars: Math.max(progress.chapterOneStars, stars) as StarRating,
      testAttempts: progress.testAttempts + 1,
      missionScores: { ...progress.missionScores, [missionId]: nextScore },
      totalPracticeMinutes: progress.totalPracticeMinutes + 3,
      weeklyActivity: addMinutesToToday(progress.weeklyActivity, 3),
    });
  });
}

export function recordTranslationTest(score: number, stars: StarRating) {
  return recordMissionRecognition('berkenalan', score, stars);
}

export function recordMissionCompletion(missionId: string) {
  return updateProgress((progress) => {
    const mission = getMission(missionId);
    const practiceComplete =
      mission.type === 'checkpoint' ||
      mission.signIds.every((id) => progress.signMastery[id].passed);
    const recognitionComplete = (progress.missionScores[missionId] ?? 0) >= 70;
    if (!practiceComplete || !recognitionComplete) return progress;
    const firstCompletion = !progress.completedMissionIds.includes(missionId);
    const completedMissionIds = firstCompletion
      ? [...progress.completedMissionIds, missionId]
      : progress.completedMissionIds;
    const completionCount =
      (progress.conversationCompletionsByMission[missionId] ?? 0) + 1;
    const practiceReward =
      mission.type === 'lesson' ? mission.signIds.length * 5 : 0;
    const completionReward = Math.max(10, mission.xp - practiceReward - 15);
    return markActive({
      ...progress,
      xp: progress.xp + (firstCompletion ? completionReward : 0),
      completedMissions: completedMissionIds.length,
      completedMissionIds,
      conversationCompletions: progress.conversationCompletions + 1,
      conversationCompletionsByMission: {
        ...progress.conversationCompletionsByMission,
        [missionId]: completionCount,
      },
      totalPracticeMinutes: progress.totalPracticeMinutes + 3,
      weeklyActivity: addMinutesToToday(progress.weeklyActivity, 3),
    });
  });
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
    const today = localDateKey(new Date());
    const todayReviewIds = getReviewSignIds(progress);
    const isFirstReviewToday =
      options.review === true &&
      passed &&
      todayReviewIds.includes(signId) &&
      !progress.reviewedSigns.includes(signId);
    const reviewedSigns = isFirstReviewToday
      ? [...progress.reviewedSigns, signId]
      : progress.reviewedSigns;
    const completedDailyReview =
      isFirstReviewToday &&
      todayReviewIds.every((id) => reviewedSigns.includes(id));
    const practiceMinutes = Math.max(
      1,
      Math.ceil((options.recordingDurationMs ?? 60_000) / 60_000),
    );
    return markActive({
      ...progress,
      xp:
        progress.xp +
        (firstPass ? 5 : 0) +
        (isFirstReviewToday ? 10 : 0) +
        (completedDailyReview ? 50 : 0),
      bestGestureScore: Math.max(progress.bestGestureScore, score),
      gestureAttempts: progress.gestureAttempts + 1,
      masteredSigns: progress.masteredSigns + (firstPass ? 1 : 0),
      signMastery: {
        ...progress.signMastery,
        [signId]: {
          bestScore: Math.max(previousMastery.bestScore, score),
          passed: previousMastery.passed || passed,
          attempts: previousMastery.attempts + 1,
          lastPracticedAt: new Date().toISOString(),
        },
      },
      reviewDate: isFirstReviewToday ? today : progress.reviewDate,
      reviewedSigns,
      totalPracticeMinutes: progress.totalPracticeMinutes + practiceMinutes,
      weeklyActivity: addMinutesToToday(
        progress.weeklyActivity,
        practiceMinutes,
      ),
    });
  });
}

export function completeReviewSign(signId: string) {
  return updateProgress((progress) => {
    if (
      !signIds.includes(signId as SignId) ||
      progress.reviewedSigns.includes(signId)
    )
      return progress;
    const reviewedSigns = [...progress.reviewedSigns, signId];
    const targetIds = getReviewSignIds(progress);
    const completionBonus = targetIds.every((id) => reviewedSigns.includes(id))
      ? 50
      : 0;
    return markActive({
      ...progress,
      xp: progress.xp + 10 + completionBonus,
      reviewDate: localDateKey(new Date()),
      reviewedSigns,
      totalPracticeMinutes: progress.totalPracticeMinutes + 3,
      weeklyActivity: addMinutesToToday(progress.weeklyActivity, 3),
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
