import { scopedProgressKey } from '@/lib/account-cache';
import { signs, type SignId } from '@/lib/curriculum-data';
import { chapters } from '@/lib/learning-data';
import type { UserProgress } from '@/lib/progress-storage';

export type ProfileBadge = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  unlocked: boolean;
};

function isChapterTestPassed(
  chapterNumber: string,
  progress: UserProgress,
): boolean {
  const chapter = chapters.find((c) => c.number === chapterNumber);
  if (!chapter || chapter.missions.length === 0) return false;

  // Bab 1 (Alfabet): all alphabet missions must be completed and tests passed with score >= 70
  if (chapterNumber === '01') {
    return chapter.missions.every(
      (m) =>
        progress.completedMissionIds.includes(m.id) &&
        (progress.missionScores[m.id] ?? 0) >= 70,
    );
  }

  // Chapters 2-5: each chapter has a final checkpoint test ('checkpoint')
  const checkpointMission = chapter.missions.find(
    (m) => m.type === 'checkpoint',
  );
  if (checkpointMission) {
    const isCheckpointComplete = progress.completedMissionIds.includes(
      checkpointMission.id,
    );
    const isCheckpointPassed =
      (progress.missionScores[checkpointMission.id] ?? 0) >= 70;
    const allMissionsComplete = chapter.missions.every((m) =>
      progress.completedMissionIds.includes(m.id),
    );
    return isCheckpointComplete && isCheckpointPassed && allMissionsComplete;
  }

  return chapter.missions.every(
    (m) =>
      progress.completedMissionIds.includes(m.id) &&
      (progress.missionScores[m.id] ?? 0) >= 70,
  );
}

export function getProfileBadges(progress: UserProgress): ProfileBadge[] {
  const isSignMastered = (id: SignId) =>
    Boolean(
      progress.signMastery[id]?.passed ||
        (progress.signMastery[id]?.productionPassedMissionIds &&
          progress.signMastery[id].productionPassedMissionIds.length > 0),
    );

  // Bab 2: Perkenalan & relasi (chapter-1)
  const chapter2Mastered = isChapterTestPassed('02', progress);

  // Bab 3: Tanya Jawab Dasar (chapter-2)
  const chapter3Mastered = isChapterTestPassed('03', progress);

  // Bab 4: Kebutuhan & Aktivitas (chapter-3)
  const chapter4Mastered = isChapterTestPassed('04', progress);

  // Bab 5: Waktu & Rencana (chapter-4)
  const chapter5Mastered = isChapterTestPassed('05', progress);

  // Pionir Abjad: Bab 1 (chapter-5)
  const alphabetMastered = isChapterTestPassed('01', progress);

  // Kamus Berjalan: Kuasai seluruh kosa kata (32 signs)
  const allVocabMastered =
    signs.length > 0 && signs.every((s) => isSignMastered(s.id));

  // Pahlawan Streak: Belajar 10 hari berturut-turut
  const streakMastered = progress.streak >= 10;

  // Bintang Sempurna: Selesaikan tantangan dengan nilai sempurna
  const perfectMastered =
    progress.bestChapterScore >= 100 ||
    progress.chapterOneStars === 3 ||
    Object.values(progress.missionScores ?? {}).some((score) => score >= 100);

  const badges: ProfileBadge[] = [
    {
      id: 'penyapa-handal',
      title: 'Penyapa Handal',
      subtitle: 'Kuasai kosa kata Bab 2',
      image: '/asset/badges/BadgeBab2.png',
      unlocked: chapter2Mastered,
    },
    {
      id: 'detektif-isyarat',
      title: 'Detektif Isyarat',
      subtitle: 'Kuasai kosa kata Bab 3',
      image: '/asset/badges/BadgeBab3.png',
      unlocked: chapter3Mastered,
    },
    {
      id: 'penjelajah-misi',
      title: 'Penjelajah Misi',
      subtitle: 'Kuasai kosa kata Bab 4',
      image: '/asset/badges/BadgeBab4.png',
      unlocked: chapter4Mastered,
    },
    {
      id: 'raja-waktu',
      title: 'Raja Waktu',
      subtitle: 'Kuasai kosa kata Bab 5',
      image: '/asset/badges/BadgeBab5.png',
      unlocked: chapter5Mastered,
    },
    {
      id: 'pionir-abjad',
      title: 'Pionir Abjad',
      subtitle: 'Kuasai seluruh abjad jari A–Z',
      image: '/asset/badges/BadgeABC.png',
      unlocked: alphabetMastered,
    },
    {
      id: 'kamus-berjalan',
      title: 'Kamus Berjalan',
      subtitle: 'Kuasai seluruh kosa kata',
      image: '/asset/badges/BadgeKosaKata.png',
      unlocked: allVocabMastered,
    },
    {
      id: 'pahlawan-streak',
      title: 'Pahlawan Streak',
      subtitle: 'Belajar 10 hari berturut-turut',
      image: '/asset/badges/BadgeStreak.png',
      unlocked: streakMastered,
    },
    {
      id: 'bintang-sempurna',
      title: 'Bintang Sempurna',
      subtitle: 'Selesaikan tantangan dengan nilai sempurna',
      image: '/asset/badges/BadgeStar.png',
      unlocked: perfectMastered,
    },
  ];

  return badges.sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
}

export const BADGE_UNLOCK_EVENT = 'bisara:badge-unlocked';
const SEEN_BADGES_KEY = 'bisara_seen_badge_ids';

function getScopedSeenBadgesKey(): string {
  try {
    return `bisara_seen_badges_${scopedProgressKey()}`;
  } catch {
    return SEEN_BADGES_KEY;
  }
}

export function getSeenBadgeIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getScopedSeenBadgesKey();
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as string[];
    // Fallback to legacy global key if scoped key not yet set
    const legacy = localStorage.getItem(SEEN_BADGES_KEY);
    return legacy ? (JSON.parse(legacy) as string[]) : [];
  } catch {
    return [];
  }
}

export function markBadgeAsSeen(badgeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getScopedSeenBadgesKey();
    const seen = new Set(getSeenBadgeIds());
    seen.add(badgeId);
    const seenArray = JSON.stringify([...seen]);
    localStorage.setItem(key, seenArray);
    localStorage.setItem(SEEN_BADGES_KEY, seenArray);
  } catch {
    // Ignore storage errors
  }
}

export function initSeenBadgesIfEmpty(): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getScopedSeenBadgesKey();
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  } catch {
    // Ignore storage errors
  }
}

export function syncSeenBadgesWithUnlocked(unlockedBadgeIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getScopedSeenBadgesKey();
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify(unlockedBadgeIds));
      return;
    }
    const seen = JSON.parse(raw) as string[];
    const unlockedSet = new Set(unlockedBadgeIds);
    // Keep only badges that are actually still unlocked.
    // This heals any badge that was prematurely marked as seen before its requirements were actually met.
    const filtered = seen.filter((id) => unlockedSet.has(id));
    if (filtered.length !== seen.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {
    // Ignore storage errors
  }
}

export function triggerBadgeUnlock(badge: ProfileBadge): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BADGE_UNLOCK_EVENT, { detail: badge }));
}
