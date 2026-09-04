import type { StarRating } from '@/lib/scoring';

export type WeeklyActivity = {
  day: string;
  minutes: number;
};

export type UserProgress = {
  xp: number;
  streak: number;
  lastActiveDate: string;
  completedMissions: number;
  masteredSigns: number;
  totalPracticeMinutes: number;
  bestChapterScore: number;
  lastChapterScore: number;
  chapterOneStars: StarRating;
  testAttempts: number;
  conversationCompletions: number;
  reviewDate: string;
  reviewedSigns: string[];
  weeklyActivity: WeeklyActivity[];
};

const STORAGE_KEY = 'bisara-progress-v1';
const PROGRESS_EVENT = 'bisara-progress-change';

export const reviewSignIds = ['saya', 'teman', 'terima-kasih', 'maaf', 'siapa'];

export const defaultProgress: UserProgress = {
  xp: 1240,
  streak: 7,
  lastActiveDate: '',
  completedMissions: 2,
  masteredSigns: 18,
  totalPracticeMinutes: 84,
  bestChapterScore: 0,
  lastChapterScore: 0,
  chapterOneStars: 0,
  testAttempts: 0,
  conversationCompletions: 0,
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

export function getProgressSnapshot() {
  if (typeof window === 'undefined') return defaultSnapshot;
  return window.localStorage.getItem(STORAGE_KEY) ?? defaultSnapshot;
}

export function getServerProgressSnapshot() {
  return defaultSnapshot;
}

export function parseProgressSnapshot(snapshot: string): UserProgress {
  try {
    const stored = JSON.parse(snapshot) as Partial<UserProgress>;
    const progress = {
      ...defaultProgress,
      ...stored,
      reviewedSigns: Array.isArray(stored.reviewedSigns)
        ? stored.reviewedSigns
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
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(PROGRESS_EVENT, callback);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(PROGRESS_EVENT, callback);
  };
}

export function recordTranslationTest(score: number, stars: StarRating) {
  return updateProgress((progress) => {
    const improvedBy = Math.max(0, score - progress.bestChapterScore);
    const xpGain = 30 + Math.round(improvedBy / 2);

    return markActive({
      ...progress,
      xp: progress.xp + xpGain,
      bestChapterScore: Math.max(progress.bestChapterScore, score),
      lastChapterScore: score,
      chapterOneStars: Math.max(progress.chapterOneStars, stars) as StarRating,
      testAttempts: progress.testAttempts + 1,
      totalPracticeMinutes: progress.totalPracticeMinutes + 10,
      weeklyActivity: addMinutesToToday(progress.weeklyActivity, 10),
    });
  });
}

export function recordConversationCompletion() {
  return updateProgress((progress) =>
    markActive({
      ...progress,
      xp: progress.xp + 100,
      conversationCompletions: progress.conversationCompletions + 1,
      totalPracticeMinutes: progress.totalPracticeMinutes + 8,
      weeklyActivity: addMinutesToToday(progress.weeklyActivity, 8),
    }),
  );
}

export function completeReviewSign(signId: string) {
  return updateProgress((progress) => {
    if (progress.reviewedSigns.includes(signId)) return progress;

    const reviewedSigns = [...progress.reviewedSigns, signId];
    const completionBonus =
      reviewedSigns.length === reviewSignIds.length ? 50 : 0;

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

  const current = parseProgressSnapshot(getProgressSnapshot());
  const updated = updater(current);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
  return updated;
}

function markActive(progress: UserProgress): UserProgress {
  const today = localDateKey(new Date());
  if (progress.lastActiveDate === today) return progress;

  if (!progress.lastActiveDate) {
    return { ...progress, lastActiveDate: today };
  }

  const previousDate = parseDateKey(progress.lastActiveDate);
  const currentDate = parseDateKey(today);
  const dayDifference = Math.round(
    (currentDate.getTime() - previousDate.getTime()) / 86_400_000,
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
