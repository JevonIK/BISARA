import { isAlphabetPracticeCompleted } from '@/lib/alphabet-data';
import { getSigns, type SignId } from '@/lib/curriculum-data';
import { isCurriculumDebugUnlocked } from '@/lib/debug-unlock';
import {
  allMissions,
  chapters,
  getMission,
  getMissionPosition,
  type Mission,
} from '@/lib/learning-data';
import {
  getProductionTestSignIds,
  hasPassedProductionTest,
  type UserProgress,
} from '@/lib/progress-storage';

export const RECOGNITION_PASS_SCORE = 70;
export type LearningStageState = 'completed' | 'current' | 'locked';

export function isMissionUnlocked(missionId: string, progress: UserProgress) {
  const index = getMissionPosition(missionId);
  return (
    isCurriculumDebugUnlocked() ||
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
  if (mission.type === 'alphabet') {
    const missionComplete = progress.completedMissionIds.includes(mission.id);
    const unlocked = isMissionUnlocked(mission.id, progress);
    const recognitionScore = progress.missionScores[mission.id] ?? 0;
    const recognitionComplete =
      missionComplete || recognitionScore >= RECOGNITION_PASS_SCORE;
    const practiceComplete =
      missionComplete ||
      recognitionComplete ||
      isAlphabetPracticeCompleted(mission.id);
    const practiceStarted = practiceComplete;
    const letterCount = mission.alphabetLetters?.length ?? 5;
    const progressPercent = missionComplete
      ? 100
      : recognitionComplete
        ? 75
        : practiceComplete
          ? 50
          : 0;

    let next = { href: '/missions', label: 'Selesaikan misi sebelumnya' };
    if (unlocked) {
      if (missionComplete) {
        next = getNextMissionAction(mission.id);
      } else if (recognitionComplete) {
        next = {
          href: `/missions/learn?mission=${mission.id}&section=recall`,
          label: 'Lanjut ke Uji peragaan',
        };
      } else if (practiceComplete) {
        next = {
          href: `/missions/learn?mission=${mission.id}&section=recognition`,
          label: 'Mulai uji pengenalan',
        };
      } else {
        next = {
          href: mission.href,
          label: `Mulai tahap Amati`,
        };
      }
    }

    return {
      mission,
      missionSigns: [],
      masteredSignIds: [],
      masteredSignCount: 0,
      practiceStarted,
      practiceComplete,
      recognitionScore,
      recognitionComplete,
      missionComplete,
      conversationComplete: missionComplete,
      productionPassedCount: missionComplete ? letterCount : 0,
      productionSignCount: letterCount,
      progressPercent,
      unlocked,
      next,
    };
  }
  const missionSigns = getSigns(mission.signIds);
  const masteredSignIds = missionSigns
    .filter((sign) => progress.signMastery[sign.id]?.passed)
    .map((sign) => sign.id);
  const practiceStarted =
    mission.type === 'checkpoint' ||
    missionSigns.some((sign) => progress.signMastery[sign.id]?.attempts > 0);
  const practiceComplete =
    mission.type === 'checkpoint' ||
    masteredSignIds.length === missionSigns.length;
  const recognitionScore = progress.missionScores[mission.id] ?? 0;
  const recognitionComplete =
    practiceComplete && recognitionScore >= RECOGNITION_PASS_SCORE;
  // Existing completed IDs remain valid; new completions require every target
  // in the camera-based production test to pass.
  const missionComplete = progress.completedMissionIds.includes(mission.id);
  const productionSignIds = getProductionTestSignIds(mission.id);
  const productionPassedCount = productionSignIds.filter((id) =>
    hasPassedProductionTest(progress, mission.id, id),
  ).length;
  const nextSign = missionSigns.find(
    (sign) => !progress.signMastery[sign.id]?.passed,
  );
  const basePractice =
    mission.type === 'checkpoint'
      ? 60
      : practiceStarted
        ? 15 +
          Math.round(
            (masteredSignIds.length / Math.max(1, missionSigns.length)) * 45,
          )
        : 0;
  const progressPercent = missionComplete
    ? 100
    : recognitionComplete
      ? 80
      : practiceComplete
        ? 60
        : Math.min(55, basePractice);
  const missionQuery = `mission=${mission.id}`;
  const next = !isMissionUnlocked(mission.id, progress)
    ? { href: '/', label: 'Selesaikan misi sebelumnya' }
    : nextSign && !practiceComplete
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
        : !missionComplete
          ? {
              href: `/missions/test?${missionQuery}&mode=recall`,
              label: 'Lanjut ke Uji peragaan',
            }
          : getNextMissionAction(mission.id);

  return {
    mission,
    missionSigns,
    masteredSignIds,
    masteredSignCount: masteredSignIds.length,
    practiceStarted,
    practiceComplete,
    recognitionScore,
    recognitionComplete,
    missionComplete,
    // Compatibility for consumers of the former context stage.
    conversationComplete: missionComplete,
    productionPassedCount,
    productionSignCount: productionSignIds.length,
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

/**
 * Replaying never resets mastery or rewards. It only chooses the first useful
 * activity so learners can revisit a finished mission without losing progress.
 */
export function getMissionReplayAction(missionOrId: Mission | string) {
  const mission =
    typeof missionOrId === 'string' ? getMission(missionOrId) : missionOrId;
  const missionQuery = `mission=${mission.id}`;

  if (mission.type === 'alphabet') {
    return { href: mission.href, label: 'Ulangi materi alfabet' };
  }
  return mission.type === 'checkpoint'
    ? {
        href: `/missions/test?${missionQuery}&mode=recognition&replay=1`,
        label: 'Ulangi uji pengenalan',
      }
    : {
        href: `/missions/practice?${missionQuery}&sign=${mission.signIds[0]}&replay=1`,
        label: 'Ulangi misi dari awal',
      };
}

/**
 * Returns the exact stage URL corresponding to where the learner is currently at
 * in this mission:
 * - Completed -> Replay action href
 * - Checkpoint -> Uji pengenalan (or Uji peragaan if recognition completed)
 * - Standard mission:
 *   - Practice not started yet -> Tahap Amati (`/missions/learn?mission=...`)
 *   - Practice in progress -> Tahap Tirukan (`/missions/practice?mission=...&sign=...`)
 *   - Practice complete -> Uji pengenalan (`/missions/test?mission=...&mode=recognition`)
 *   - Recognition complete -> Uji peragaan (`/missions/test?mission=...&mode=recall`)
 */
export function getMissionActiveStageHref(
  missionOrId: Mission | string,
  progress: UserProgress,
): string {
  const mission =
    typeof missionOrId === 'string' ? getMission(missionOrId) : missionOrId;
  const learning = getMissionLearningState(mission, progress);
  const isCompleted = progress.completedMissionIds.includes(mission.id);

  if (isCompleted) {
    const replay = getMissionReplayAction(mission);
    return replay.href;
  }

  if (mission.type === 'checkpoint') {
    return learning.recognitionComplete
      ? `/missions/test?mission=${mission.id}&mode=recall`
      : `/missions/test?mission=${mission.id}&mode=recognition`;
  }

  if (!learning.practiceStarted) {
    return mission.href;
  }

  if (!learning.practiceComplete) {
    const nextSign = learning.missionSigns.find(
      (sign) => !progress.signMastery[sign.id]?.passed,
    );
    return `/missions/practice?mission=${mission.id}&sign=${nextSign?.id ?? mission.signIds[0]}`;
  }

  if (!learning.recognitionComplete) {
    return `/missions/test?mission=${mission.id}&mode=recognition`;
  }

  return `/missions/test?mission=${mission.id}&mode=recall`;
}

export function getBerkenalanLearningState(progress: UserProgress) {
  return getMissionLearningState('berkenalan', progress);
}

export function getPrototypeMissionCount(progress: UserProgress) {
  return progress.completedMissionIds.length;
}

export function getBadgeCount(progress: UserProgress): number {
  const completedMissions = getPrototypeMissionCount(progress);
  return [
    completedMissions > 0,
    progress.streak >= 7,
    progress.bestChapterScore >= 70,
    Object.values(progress.signMastery).some((item) => item.recall),
  ].filter(Boolean).length;
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

/**
 * Checks whether a specific sign in a mission's camera practice is unlocked.
 * A sign is unlocked if:
 * 1. Curriculum debug is active, OR
 * 2. The mission is already completed (allowing free review), OR
 * 3. It is the first sign of the mission (index 0), OR
 * 4. ALL signs preceding it in the mission have been passed (signMastery[id].passed === true).
 */
export function isMissionSignUnlocked(
  signId: string,
  missionSignIds: string[],
  progress: UserProgress,
  missionId?: string,
): boolean {
  if (isCurriculumDebugUnlocked()) return true;
  if (missionId && progress.completedMissionIds.includes(missionId)) return true;

  const signIndex = missionSignIds.indexOf(signId);
  if (signIndex <= 0) return true;

  for (let i = 0; i < signIndex; i++) {
    const prevId = missionSignIds[i];
    if (!progress.signMastery[prevId as SignId]?.passed) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether all signs in a mission have been passed, enabling the final
 * practice / assessment stage ("Latihan").
 */
export function isMissionPracticeComplete(
  missionSignIds: string[],
  progress: UserProgress,
  missionId?: string,
): boolean {
  if (isCurriculumDebugUnlocked()) return true;
  if (missionId && progress.completedMissionIds.includes(missionId)) return true;

  return missionSignIds.every(
    (id) => Boolean(progress.signMastery[id as SignId]?.passed),
  );
}

