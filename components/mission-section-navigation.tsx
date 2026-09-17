'use client';

import { ArrowLeft, ArrowRight, Check, Hand, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { useProgress } from '@/hooks/use-progress';
import {
  allMissions,
  getMission,
  getMissionPosition,
} from '@/lib/learning-data';
import { getMissionLearningState } from '@/lib/learning-progress';
import { cn } from '@/lib/utils';

export type MissionSection = 'amati' | 'tirukan' | 'recognition' | 'recall';
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
      href: mission.href,
      complete: learning.practiceStarted,
      available: learning.unlocked,
    },
    ...(mission.type === 'checkpoint'
      ? []
      : [
          {
            id: 'tirukan' as const,
            label: 'Tirukan',
            href: `/missions/practice?mission=${mission.id}&sign=${mission.signIds[0]}`,
            complete: learning.practiceComplete,
            available: learning.unlocked,
          },
        ]),
    {
      id: 'recognition',
      label: 'Uji pengenalan',
      href: `/missions/test?mission=${mission.id}&mode=recognition`,
      complete: learning.recognitionComplete,
      available: learning.unlocked && learning.practiceComplete,
    },
    {
      id: 'recall',
      label: 'Uji peragaan',
      href: `/missions/test?mission=${mission.id}&mode=recall`,
      complete: learning.missionComplete,
      available: learning.unlocked && learning.recognitionComplete,
    },
  ];
  const currentIndex = stages.findIndex((stage) => stage.id === section);
  if (currentIndex === -1) return null;
  const previous = stages[currentIndex - 1];
  const following = stages[currentIndex + 1];
  const nextMission = allMissions[getMissionPosition(mission.id) + 1];
  const next = following
    ? { ...following, label: `Lanjut ke ${following.label}` }
    : learning.missionComplete
      ? {
          href: nextMission?.href ?? '/review',
          label: nextMission
            ? `Lanjut ke misi: ${nextMission.title}`
            : 'Lanjut ke review',
          available: true,
        }
      : null;

  if (variant === 'bottom-bar') {
    if (!ready) {
      return (
        <nav
          aria-label={`Navigasi bagian misi ${mission.title}`}
          className="fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF7] border-t-2 border-[#FED247]/70 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] py-3.5 px-6 rounded-t-3xl sm:rounded-t-[2rem]"
        >
          <div className="mx-auto max-w-xl flex items-center justify-center text-xs font-bold text-slate-400">
            Memuat tahapan misi…
          </div>
        </nav>
      );
    }

    return (
      <nav
        aria-label={`Navigasi bagian misi ${mission.title}`}
        className="fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF7] border-t-2 border-[#FED247]/70 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] py-3.5 px-6 rounded-t-3xl sm:rounded-t-[2rem]"
      >
        <div className="mx-auto max-w-xl relative flex items-center justify-between">
          {/* Continuous center track line */}
          <div className="absolute top-5 sm:top-5.5 left-8 right-8 h-0.5 bg-slate-300 -z-0" />

          {stages.map((stage) => {
            const isCurrent = stage.id === section;
            const isDone = !isCurrent && stage.complete;
            const isAvailable = !isCurrent && !isDone && stage.available;
            const isLocked = !isCurrent && !isDone && !stage.available;

            const iconElement = isCurrent ? (
              <Hand className="size-5 text-white" />
            ) : isDone ? (
              <Check className="size-5 font-black stroke-[3] text-white" />
            ) : isAvailable ? (
              <ArrowRight className="size-4 text-amber-900" />
            ) : (
              <LockKeyhole className="size-4.5 text-white" />
            );

            const circleClass = cn(
              'grid size-10 sm:size-11 place-items-center rounded-full shadow-xs transition-transform',
              isCurrent
                ? 'bg-[#FFAE00] text-white ring-4 ring-[#FFE8A3]'
                : isDone
                  ? 'bg-[#22C55E] text-white'
                  : isAvailable
                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                    : 'bg-[#B8BFC6] text-white',
            );

            const subtext = isCurrent
              ? 'Sedang berlangsung'
              : isDone
                ? 'Selesai'
                : isAvailable
                  ? 'Tersedia'
                  : 'Terkunci';

            const subtextClass = isCurrent
              ? 'text-amber-700'
              : isDone
                ? 'text-emerald-700'
                : isAvailable
                  ? 'text-amber-600'
                  : 'text-slate-400';

            const canNavigate = !isCurrent && (isDone || isAvailable);

            return (
              <div
                key={stage.id}
                className="relative z-10 flex flex-col items-center text-center"
              >
                {canNavigate ? (
                  <Link
                    href={stage.href}
                    className="group flex flex-col items-center text-center focus:outline-none"
                  >
                    <span className={cn(circleClass, 'group-hover:scale-105')}>
                      {iconElement}
                    </span>
                    <span className="mt-2 text-xs font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                      {stage.label}
                    </span>
                    <span className={cn('text-[11px] font-bold', subtextClass)}>
                      {subtext}
                    </span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <span className={circleClass}>{iconElement}</span>
                    <span
                      className={cn(
                        'mt-2 text-xs font-black',
                        isLocked ? 'text-slate-500' : 'text-slate-900',
                      )}
                    >
                      {stage.label}
                    </span>
                    <span className={cn('text-[11px] font-bold', subtextClass)}>
                      {subtext}
                    </span>
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
            href="/missions"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-signal-navy/15 px-4 py-2 text-sm font-bold text-signal-navy hover:bg-muted"
          >
            <ArrowLeft className="size-4" /> Kembali ke perjalanan
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
