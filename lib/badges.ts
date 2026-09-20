import { signs } from '@/lib/curriculum-data';
import { chapters } from '@/lib/learning-data';
import type { UserProgress } from '@/lib/progress-storage';

export type ProfileBadge = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  unlocked: boolean;
};

export function getProfileBadges(progress: UserProgress): ProfileBadge[] {
  // Bab 2: Perkenalan & relasi (chapter-1)
  const chapter2Missions =
    chapters.find((c) => c.number === '02')?.missions ?? [];
  const chapter2SignIds = Array.from(
    new Set(chapter2Missions.flatMap((m) => m.signIds)),
  );
  const chapter2Mastered =
    (chapter2SignIds.length > 0 &&
      chapter2SignIds.every((id) => progress.signMastery[id]?.passed)) ||
    Boolean(
      progress.signMastery['saya']?.passed &&
        progress.signMastery['teman']?.passed &&
        progress.signMastery['terima-kasih']?.passed,
    );

  // Bab 3: Tanya Jawab Dasar (chapter-2)
  const chapter3Missions =
    chapters.find((c) => c.number === '03')?.missions ?? [];
  const chapter3SignIds = Array.from(
    new Set(chapter3Missions.flatMap((m) => m.signIds)),
  );
  const chapter3Mastered =
    chapter3SignIds.length > 0 &&
    chapter3SignIds.every((id) => progress.signMastery[id]?.passed);

  // Bab 4: Kebutuhan & Aktivitas (chapter-3)
  const chapter4Missions =
    chapters.find((c) => c.number === '04')?.missions ?? [];
  const chapter4SignIds = Array.from(
    new Set(chapter4Missions.flatMap((m) => m.signIds)),
  );
  const chapter4Mastered =
    chapter4SignIds.length > 0 &&
    chapter4SignIds.every((id) => progress.signMastery[id]?.passed);

  // Bab 5: Waktu & Rencana (chapter-4)
  const chapter5Missions =
    chapters.find((c) => c.number === '05')?.missions ?? [];
  const chapter5SignIds = Array.from(
    new Set(chapter5Missions.flatMap((m) => m.signIds)),
  );
  const chapter5Mastered =
    chapter5SignIds.length > 0 &&
    chapter5SignIds.every((id) => progress.signMastery[id]?.passed);

  // Pionir Abjad: Bab 1 (chapter-5)
  const alphabetMissions =
    chapters.find((c) => c.number === '01')?.missions ?? [];
  const alphabetMastered =
    alphabetMissions.length > 0 &&
    alphabetMissions.every((m) => progress.completedMissionIds.includes(m.id));

  // Kamus Berjalan: Kuasai seluruh kosa kata (32 signs)
  const allVocabMastered =
    signs.length > 0 && signs.every((s) => progress.signMastery[s.id]?.passed);

  // Pahlawan Streak: Belajar 10 hari berturut-turut
  const streakMastered = progress.streak >= 10;

  // Bintang Sempurna: Selesaikan tantangan dengan nilai sempurna
  const perfectMastered =
    progress.bestChapterScore >= 100 ||
    progress.chapterOneStars === 3 ||
    Object.values(progress.missionScores ?? {}).some((score) => score >= 100);

  return [
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
}
