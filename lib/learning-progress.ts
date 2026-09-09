import { getSigns } from '@/lib/curriculum-data';
import {
  allMissions,
  chapters,
  getMission,
  getMissionPosition,
  type Mission,
} from '@/lib/learning-data';
import type { UserProgress } from '@/lib/progress-storage';

export const RECOGNITION_PASS_SCORE = 70;
export type LearningStageState = 'completed' | 'current' | 'locked';

export function isMissionUnlocked(missionId: string, progress: UserProgress) {
  const index = getMissionPosition(missionId);
  return (
    index <= 0 ||
    progress.completedMissionIds.includes(allMissions[index - 1].id) ||
    progress.completedMissionIds.includes(missionId)
  );
}

export function getMissionLearningState(
  missionOrId: Mission | string,
  progress: UserProgress,
) {
  const mission =
    typeof missionOrId === 'string' ? getMission(missionOrId) : missionOrId;
  const missionSigns = getSigns(mission.signIds);
  const masteredSignIds = missionSigns
    .filter((sign) => progress.signMastery[sign.id]?.passed)
    .map((sign) => sign.id);
  const practiceComplete =
    mission.type === 'checkpoint' ||
    masteredSignIds.length === missionSigns.length;
  const recognitionScore =
    progress.missionScores[mission.id] ??
    (mission.id === 'berkenalan' ? progress.bestChapterScore : 0);
  const recognitionComplete =
    practiceComplete && recognitionScore >= RECOGNITION_PASS_SCORE;
  const conversationComplete =
    recognitionComplete &&
    (progress.completedMissionIds.includes(mission.id) ||
      (mission.id === 'berkenalan' && progress.conversationCompletions > 0));
  const nextSign = missionSigns.find(
    (sign) => !progress.signMastery[sign.id]?.passed,
  );
  const basePractice =
    mission.type === 'checkpoint'
      ? 35
      : 20 +
        Math.round(
          (masteredSignIds.length / Math.max(1, missionSigns.length)) * 45,
        );
  const progressPercent = conversationComplete
    ? 100
    : recognitionComplete
      ? 85
      : practiceComplete
        ? 65
        : basePractice;
  const missionQuery = `mission=${mission.id}`;
  const next = !isMissionUnlocked(mission.id, progress)
    ? { href: '/missions', label: 'Selesaikan misi sebelumnya' }
    : nextSign
      ? {
          href: `/missions/practice?${missionQuery}&sign=${nextSign.id}`,
          label:
            masteredSignIds.length === 0
              ? 'Mulai tahap Tirukan'
              : `Lanjutkan tanda ${nextSign.label}`,
        }
      : !recognitionComplete
        ? {
            href: `/missions/test?${missionQuery}&mode=recognition`,
            label: 'Mulai uji pengenalan',
          }
        : !conversationComplete
          ? {
              href: `/missions/test?${missionQuery}&mode=context`,
              label: 'Terapkan dalam konteks',
            }
          : getNextMissionAction(mission.id);

  return {
    mission,
    missionSigns,
    masteredSignIds,
    masteredSignCount: masteredSignIds.length,
    practiceComplete,
    recognitionScore,
    recognitionComplete,
    conversationComplete,
    progressPercent,
    unlocked: isMissionUnlocked(mission.id, progress),
    next,
  };
}

function getNextMissionAction(missionId: string) {
  const nextMission = allMissions[getMissionPosition(missionId) + 1];
  return nextMission
    ? { href: nextMission.href, label: `Lanjut: ${nextMission.title}` }
    : { href: '/review', label: 'Perkuat lewat review' };
}

export function getBerkenalanLearningState(progress: UserProgress) {
  return getMissionLearningState('berkenalan', progress);
}

export function getPrototypeMissionCount(progress: UserProgress) {
  return progress.completedMissionIds.length;
}

export function getChapterProgress(chapterId: string, progress: UserProgress) {
  const chapter = chapters.find((item) => item.id === chapterId);
  if (!chapter) return 0;
  const completed = chapter.missions.filter((mission) =>
    progress.completedMissionIds.includes(mission.id),
  ).length;
  return Math.round((completed / chapter.missions.length) * 100);
}

export function getChapterOneProgress(progress: UserProgress) {
  return getChapterProgress('chapter-1', progress);
}

export function getCurrentMission(progress: UserProgress) {
  return (
    allMissions.find(
      (mission) => !progress.completedMissionIds.includes(mission.id),
    ) ?? allMissions.at(-1)!
  );
}
