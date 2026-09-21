'use client';

import { ArrowLeft, ArrowRight, Check, Hand, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { useProgress } from '@/hooks/use-progress';
import {
  allMissions,
  getChapterForMission,
  getMission,
  getMissionPosition,
} from '@/lib/learning-data';
import {
  getMissionActiveStageHref,
  getMissionLearningState,
} from '@/lib/learning-progress';
import { cn } from '@/lib/utils';

export type MissionSection =
  | 'amati'
  | 'tirukan'
  | 'recognition'
  | 'recall'
  | 'complete';
const subscribeHydration = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export function MissionSectionNavigation({
  missionId,
  section,
  variant = 'default',
}: {
  missionId: string;
  section: MissionSection;
  variant?: 'default' | 'bottom-bar';
}) {
  const progress = useProgress();
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const mission = getMission(missionId);
  const learning = getMissionLearningState(mission, progress);
  const stages: Array<{
    id: MissionSection;
    label: string;
    href: string;
    complete: boolean;
    available: boolean;
  }> = [
    {
      id: 'amati',
      label: 'Amati',
      href:
        mission.type === 'alphabet'
          ? `/missions/learn?mission=${mission.id}&section=amati`
          : mission.href,
      complete: learning.practiceStarted,
      available: learning.unlocked,
    },
    ...(mission.type === 'checkpoint'
      ? []
      : [
          {
            id: 'tirukan' as const,
            label: 'Tirukan',
            href:
              mission.type === 'alphabet'
                ? `/missions/learn?mission=${mission.id}&section=tirukan`
                : `/missions/practice?mission=${mission.id}&sign=${learning.missionSigns.find((s) => !progress.signMastery[s.id]?.passed)?.id ?? mission.signIds[0]}`,
            complete: learning.practiceComplete,
            available: learning.unlocked,
          },
        ]),
    {
      id: 'recognition',
      label: 'Uji pengenalan',
      href:
        mission.type === 'alphabet'
          ? `/missions/learn?mission=${mission.id}&section=recognition`
          : `/missions/test?mission=${mission.id}&mode=recognition`,
      complete: learning.recognitionComplete,
      available: learning.unlocked && learning.practiceComplete,
    },
    {
      id: 'recall',
      label: 'Uji peragaan',
      href:
        mission.type === 'alphabet'
          ? `/missions/learn?mission=${mission.id}&section=recall`
          : `/missions/test?mission=${mission.id}&mode=recall`,
      complete: learning.missionComplete,
      available: learning.unlocked && learning.recognitionComplete,
    },
  ];
  const isCompleteSection = section === 'complete';
  const effectiveSection = isCompleteSection ? 'recall' : section;
  const currentIndex = stages.findIndex(
    (stage) => stage.id === effectiveSection,
  );
  if (currentIndex === -1) return null;
  const previous = stages[currentIndex - 1];
  const following = isCompleteSection ? undefined : stages[currentIndex + 1];
  const nextMission = allMissions[getMissionPosition(mission.id) + 1];
  const next = following
    ? { ...following, label: `Lanjut ke ${following.label}` }
    : learning.missionComplete || isCompleteSection
      ? {
          href: nextMission
            ? getMissionActiveStageHref(nextMission, progress)
            : '/review',
          label: nextMission
            ? nextMission.type === 'checkpoint'
              ? `Mulai Tes Bab ${getChapterForMission(nextMission.id).number.replace(/^0/, '')}`
              : `Lanjut ke misi: ${nextMission.title}`
            : 'Lanjut ke review',
          available: true,
        }
      : null;

  if (variant === 'bottom-bar') {
    const halfColPercent = 100 / (stages.length * 2);

    return (
      <nav
        aria-label={`Navigasi bagian misi ${mission.title}`}
        className="fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF7] border-t-2 border-[#FFAE00] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-4 px-2 sm:px-6"
      >
        <div
          className="mx-auto max-w-xl relative grid pt-1"
          style={{
            gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Continuous dark connecting line passing through circle centers */}
          <div
            className="absolute top-[28px] h-[2px] bg-[#5B6370] z-0 pointer-events-none"
            style={{
              left: `${halfColPercent}%`,
              right: `${halfColPercent}%`,
            }}
          />

          {stages.map((stage) => {
            const isCurrent = !isCompleteSection && stage.id === section;
            const isDone = ready
              ? isCompleteSection || learning.missionComplete
                ? stage.complete
                : !isCurrent && stage.complete
              : false;
            const isAvailable = ready
              ? !isCurrent && !isDone && stage.available
              : false;

            const iconElement = isCurrent ? (
              <Hand className="size-5 text-slate-950" />
            ) : isDone ? (
              <Check className="size-5 font-black stroke-[3.5] text-slate-950" />
            ) : isAvailable ? (
              <ArrowRight className="size-4 text-slate-950" />
            ) : (
              <LockKeyhole className="size-4.5 text-slate-950" />
            );

            const circleClass = cn(
              'grid size-11 sm:size-12 place-items-center rounded-full shadow-xs transition-transform',
              isCurrent
                ? 'bg-[#FFAE00]'
                : isDone
                  ? 'bg-[#22C55E]'
                  : isAvailable
                    ? 'bg-amber-100 border-2 border-amber-300'
                    : 'bg-[#B8BFC6]',
            );

            const subtext = isCurrent
              ? 'Sedang berlangsung'
              : isDone
                ? 'Selesai'
                : isAvailable
                  ? 'Tersedia'
                  : 'Terkunci';

            const canNavigate = !isCurrent && (isDone || isAvailable);

            const stageContent = (
              <>
                {/* Semicircular Arch Cap masking the flat border and arching over the circle */}
                <div
                  className="absolute -top-[24px] left-1/2 -translate-x-1/2 w-[68px] sm:w-[74px] h-[26px] bg-[#FFFDF7] border-t-2 border-x-2 border-[#FFAE00] rounded-t-full pointer-events-none z-[1]"
                  aria-hidden="true"
                />

                <span
                  className={cn(
                    circleClass,
                    'relative z-10 group-hover:scale-105',
                  )}
                >
                  {iconElement}
                </span>

                <span className="mt-2 text-xs font-black text-slate-900 group-hover:text-amber-700 transition-colors whitespace-nowrap">
                  {stage.label}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                  {subtext}
                </span>
              </>
            );

            return (
              <div
                key={stage.id}
                className="relative z-10 flex w-full flex-col items-center text-center"
              >
                {canNavigate ? (
                  <Link
                    href={stage.href}
                    className="group flex w-full flex-col items-center text-center focus:outline-none"
                  >
                    {stageContent}
                  </Link>
                ) : (
                  <div className="flex w-full flex-col items-center text-center">
                    {stageContent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  if (!ready) {
    return (
      <nav
        aria-label={`Navigasi bagian misi ${mission.title}`}
        className="mb-6 border border-signal-navy/10 bg-card p-4 text-sm text-muted-foreground sm:p-5"
      >
        Memuat progres misi…
      </nav>
    );
  }

  return (
    <nav
      aria-label={`Navigasi bagian misi ${mission.title}`}
      className="mb-6 border border-signal-navy/10 bg-card p-4 sm:p-5"
    >
      <ol className="flex flex-wrap gap-2">
        {stages.map((stage, index) => {
          const className = cn(
            'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold',
            stage.id === section
              ? 'border-signal-yellow bg-signal-yellow/25 text-signal-navy'
              : stage.available
                ? 'border-signal-teal/50 text-signal-navy hover:bg-signal-teal-soft'
                : 'border-signal-navy/10 text-muted-foreground/65',
          );
          const content = (
            <>
              {stage.complete ? (
                <Check className="size-3.5" />
              ) : (
                <span aria-hidden="true">{index + 1}</span>
              )}
              <span>{stage.label}</span>
            </>
          );
          return (
            <li key={stage.id}>
              {stage.available && stage.id !== section ? (
                <Link href={stage.href} className={className}>
                  {content}
                </Link>
              ) : (
                <span
                  className={className}
                  aria-current={stage.id === section ? 'step' : undefined}
                  aria-disabled={!stage.available ? true : undefined}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-signal-navy/10 pt-4">
        {previous ? (
          <Link
            href={previous.href}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-signal-navy/15 px-4 py-2 text-sm font-bold text-signal-navy hover:bg-muted"
          >
            <ArrowLeft className="size-4" /> Kembali ke {previous.label}
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-signal-navy/15 px-4 py-2 text-sm font-bold text-signal-navy hover:bg-muted"
          >
            <ArrowLeft className="size-4" /> Kembali ke beranda
          </Link>
        )}
        {next ? (
          next.available ? (
            <Link
              href={next.href}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-signal-navy px-5 py-2 text-sm font-black text-white hover:bg-signal-navy/90"
            >
              {next.label} <ArrowRight className="size-4" />
            </Link>
          ) : (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-muted px-5 py-2 text-sm font-bold text-muted-foreground">
              {next.label} · selesaikan tahap ini dulu
            </span>
          )
        ) : (
          <span className="text-sm text-muted-foreground">
            Selesaikan Uji peragaan untuk membuka misi berikutnya.
          </span>
        )}
      </div>
    </nav>
  );
}
