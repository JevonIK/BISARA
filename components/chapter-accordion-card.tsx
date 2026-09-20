'use client';

import { Check, ChevronDown, LockKeyhole, Play, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  type Chapter,
  type Mission,
} from '@/lib/learning-data';
import {
  getChapterProgress,
  getMissionActiveStageHref,
  isMissionUnlocked,
} from '@/lib/learning-progress';
import type { UserProgress } from '@/lib/progress-storage';
import { cn } from '@/lib/utils';

type ChapterAccordionCardProps = {
  chapter: Chapter;
  chapterIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  progress: UserProgress;
  currentMission: Mission;
};

type ChapterTheme = {
  cardBg: string;
  cardBorder: string;
  pillBg: string;
  progressBg: string;
  progressFill: string;
  drawerBg: string;
  drawerBorder: string;
  missionCardBg: string;
  missionCardBorder: string;
  missionCardHover: string;
};

const chapterThemes: Record<string, ChapterTheme> = {
  'chapter-1': {
    cardBg: 'bg-[#E8F8F9]',
    cardBorder: 'border-[#7CE0E7]',
    pillBg: 'bg-[#00BDCD]',
    progressBg: 'bg-white',
    progressFill: 'bg-[#00BDCD]',
    drawerBg: 'bg-[#DCF5F7]',
    drawerBorder: 'border-[#A2E7EC]',
    missionCardBg: 'bg-[#76DDE5]',
    missionCardBorder: 'border-[#55CCD6]',
    missionCardHover: 'hover:bg-[#62D5DE]',
  },
  'chapter-2': {
    cardBg: 'bg-[#FFF9E6]',
    cardBorder: 'border-[#FCD561]',
    pillBg: 'bg-[#F8A51D]',
    progressBg: 'bg-white',
    progressFill: 'bg-[#F8A51D]',
    drawerBg: 'bg-[#FFF2D0]',
    drawerBorder: 'border-[#FDE08E]',
    missionCardBg: 'bg-[#FDD469]',
    missionCardBorder: 'border-[#F6C028]',
    missionCardHover: 'hover:bg-[#FCCB44]',
  },
  'chapter-3': {
    cardBg: 'bg-[#FEF0EB]',
    cardBorder: 'border-[#F9B7A0]',
    pillBg: 'bg-[#F06543]',
    progressBg: 'bg-white',
    progressFill: 'bg-[#F06543]',
    drawerBg: 'bg-[#FDE2D8]',
    drawerBorder: 'border-[#FABFAC]',
    missionCardBg: 'bg-[#FA9B7C]',
    missionCardBorder: 'border-[#F27851]',
    missionCardHover: 'hover:bg-[#F98661]',
  },
  'chapter-4': {
    cardBg: 'bg-[#EEF4FF]',
    cardBorder: 'border-[#BACFFE]',
    pillBg: 'bg-[#5E87F5]',
    progressBg: 'bg-white',
    progressFill: 'bg-[#5E87F5]',
    drawerBg: 'bg-[#DFECFF]',
    drawerBorder: 'border-[#BFD5FF]',
    missionCardBg: 'bg-[#96BCFD]',
    missionCardBorder: 'border-[#6B9DF8]',
    missionCardHover: 'hover:bg-[#7CAAFB]',
  },
  'chapter-5': {
    cardBg: 'bg-[#EFFCFF]',
    cardBorder: 'border-[#A7C9FF]',
    pillBg: 'bg-[#00BDCD]',
    progressBg: 'bg-white',
    progressFill: 'bg-[#00BDCD]',
    drawerBg: 'bg-[#DDF9FD]',
    drawerBorder: 'border-[#A7C9FF]',
    missionCardBg: 'bg-[#70DAE6]',
    missionCardBorder: 'border-[#55C8DD]',
    missionCardHover: 'hover:bg-[#5BD1DF]',
  },
};

const missionArtworkByChapterId: Record<string, string[]> = {
  'chapter-5': [
    '/assets/bisara/Misi17.png',
    '/assets/bisara/Misi18.png',
    '/assets/bisara/Misi19.png',
    '/assets/bisara/Misi20.png',
    '/assets/bisara/Misi21.png',
  ],
  'chapter-1': [
    '/assets/bisara/Misi01.png',
    '/assets/bisara/Misi02.png',
    '/assets/bisara/Misi03.png',
    '/assets/bisara/Misi04.png',
    '/assets/bisara/TesBab2.png',
  ],
  'chapter-2': [
    '/assets/bisara/Misi05.png',
    '/assets/bisara/Misi06.png',
    '/assets/bisara/Misi07.png',
    '/assets/bisara/Misi08.png',
    '/assets/bisara/TesBab3.png',
  ],
  'chapter-3': [
    '/assets/bisara/Misi09.png',
    '/assets/bisara/Misi10.png',
    '/assets/bisara/Misi11.png',
    '/assets/bisara/Misi12.png',
    '/assets/bisara/TesBab4.png',
  ],
  'chapter-4': [
    '/assets/bisara/Misi13.png',
    '/assets/bisara/Misi14.png',
    '/assets/bisara/Misi15.png',
    '/assets/bisara/Misi16.png',
    '/assets/bisara/TesBab5.png',
  ],
};

export function ChapterAccordionCard({
  chapter,
  chapterIndex,
  isExpanded,
  onToggle,
  progress,
  currentMission,
}: ChapterAccordionCardProps) {
  const theme = chapterThemes[chapter.id] ?? chapterThemes['chapter-1'];
  const isUnlocked = isMissionUnlocked(chapter.missions[0].id, progress);
  const chapterProgress = getChapterProgress(chapter.id, progress);
  const completedCount = chapter.missions.filter((m) =>
    progress.completedMissionIds.includes(m.id),
  ).length;

  const firstUnfinishedMission =
    chapter.missions.find((m) => !progress.completedMissionIds.includes(m.id)) ??
    chapter.missions[0];

  const startHref = isUnlocked
    ? getMissionActiveStageHref(firstUnfinishedMission, progress)
    : '#';

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[2.25rem] sm:rounded-[2.5rem] border-2 p-6 sm:p-8 lg:p-10 transition-all shadow-xs',
        theme.cardBg,
        theme.cardBorder,
      )}
    >
      <div className="relative z-10 flex flex-col gap-6 sm:gap-8">
        {/* Top row: Chapter info (left) & Big Stars (right) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="max-w-xl flex-1">
            <span
              className={cn(
                'inline-block px-4 py-1 rounded-full text-xs sm:text-sm font-black text-white tracking-wide shadow-xs',
                theme.pillBg,
              )}
            >
              Bab {chapterIndex + 1}
            </span>
            <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
              {chapter.title}
            </h3>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-slate-600 font-medium leading-relaxed line-clamp-2">
              {chapter.description}
            </p>
          </div>

          {/* 3 Large Stars - positioned in upper right, aligned with the button width below */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 self-end sm:self-start pt-1 min-w-[120px] sm:min-w-[140px]">
            {[1, 2, 3].map((starIndex) => {
              const isStarFilled =
                isUnlocked && (chapterProgress >= starIndex * 33 || chapterProgress === 100);
              return (
                <Star
                  key={starIndex}
                  className={cn(
                    'size-8 sm:size-9 lg:size-10 transition-colors',
                    isStarFilled
                      ? 'text-[#FFAE00] fill-[#FFAE00]'
                      : 'text-slate-300/80 fill-slate-300/50',
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom row: Progress Bar + Percentage + Mulai Button (directly below stars) */}
        <div>
          <div className="text-xs sm:text-sm font-bold text-slate-700 mb-2">
            {completedCount} dari {chapter.missions.length} misi
          </div>

          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            <div
              className={cn(
                'h-3 sm:h-3.5 flex-1 overflow-hidden rounded-full shadow-inner',
                theme.progressBg,
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  theme.progressFill,
                )}
                style={{ width: `${chapterProgress}%` }}
              />
            </div>

            <span className="text-base sm:text-lg lg:text-xl font-black text-slate-800 shrink-0">
              {chapterProgress}%
            </span>

            {isUnlocked ? (
              <Link
                href={startHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FFAE00] px-7 sm:px-8 py-3 text-sm sm:text-base font-black text-slate-950 shadow-sm transition-all hover:bg-[#F2A300] hover:scale-105 active:scale-95 shrink-0 min-w-[120px] sm:min-w-[140px]"
              >
                <Play className="size-4 sm:size-4.5 fill-slate-950" />
                <span>Mulai</span>
              </Link>
            ) : (
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#9EABB2] px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-xs cursor-not-allowed shrink-0 min-w-[120px] sm:min-w-[140px]">
                <LockKeyhole className="size-4" />
                <span>Terkunci</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="group mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-800 hover:text-slate-950 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            aria-expanded={isExpanded}
            aria-controls={`${chapter.id}-missions`}
          >
            <span>
              {isUnlocked ? 'Lihat semua misi' : 'Selesaikan Bab sebelumnya'}
            </span>
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-300 ease-out text-slate-700 group-hover:text-slate-950',
                isExpanded && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>

      {/* Stationary Top Illustration */}
      <div
        className="pointer-events-none absolute top-0 right-28 z-[1] hidden opacity-85 sm:right-36 sm:block md:right-48 lg:right-56 lg:opacity-95"
        aria-hidden="true"
      >
        <ChapterIllustration type={chapter.id} />
      </div>

      {/* Animated Collapsible Mission Drawer */}
      <div
        id={`${chapter.id}-missions`}
        inert={!isExpanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out',
          isExpanded
            ? 'grid-rows-[1fr] opacity-100 mt-6'
            : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'relative z-10 rounded-[1.75rem] border p-4 sm:p-6 transition-all duration-500 ease-out',
              theme.drawerBg,
              theme.drawerBorder,
              isExpanded
                ? 'translate-y-0 scale-100'
                : '-translate-y-3 scale-[0.98]',
            )}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 sm:gap-4">
              {chapter.missions.map((mission, missionIdx) => {
                const missionUnlocked = isMissionUnlocked(mission.id, progress);
                const isCompleted = progress.completedMissionIds.includes(
                  mission.id,
                );
                const isCurrent = currentMission.id === mission.id;
                const targetHref = getMissionActiveStageHref(mission, progress);

                return (
                  <div
                    key={mission.id}
                    className="flex flex-col items-center text-center"
                  >
                    {missionUnlocked ? (
                      <Link
                        href={targetHref}
                        className={cn(
                          'group flex aspect-square w-full flex-col items-center justify-between rounded-2xl border p-3.5 transition-all shadow-xs hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:rounded-3xl sm:p-4',
                          theme.missionCardBg,
                          theme.missionCardBorder,
                          theme.missionCardHover,
                          isCurrent && 'ring-2 ring-slate-900/40',
                        )}
                      >
                        <div className="flex flex-1 items-center justify-center">
                          <MissionVisualIcon
                            index={missionIdx}
                            isCheckpoint={mission.type === 'checkpoint'}
                            isLocked={false}
                            alphabetRange={mission.type === 'alphabet' ? mission.title : undefined}
                            artworkSrc={missionArtworkByChapterId[chapter.id]?.[missionIdx]}
                          />
                        </div>
                        <span className="rounded-full bg-slate-900/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 sm:text-[11px]">
                          {mission.type === 'checkpoint'
                            ? `TES BAB ${chapterIndex + 1}`
                            : `MISI ${mission.number}`}
                        </span>
                      </Link>
                    ) : (
                      <div
                        className={cn(
                          'flex aspect-square w-full cursor-not-allowed flex-col items-center justify-between rounded-2xl border p-3.5 opacity-70 shadow-xs sm:rounded-3xl sm:p-4',
                          theme.missionCardBg,
                          theme.missionCardBorder,
                        )}
                      >
                        <div className="flex flex-1 items-center justify-center">
                          <LockKeyhole className="size-7 text-slate-700/60 sm:size-8" />
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-slate-900/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-800 sm:text-[11px]">
                          <LockKeyhole className="size-2.5" />
                          {mission.type === 'checkpoint'
                            ? `TES BAB ${chapterIndex + 1}`
                            : `MISI ${mission.number}`}
                        </span>
                      </div>
                    )}
                    <p className="mt-2 line-clamp-2 max-w-[125px] text-[11px] font-bold leading-tight text-slate-800 sm:text-xs">
                      {mission.title}
                    </p>
                    {isCompleted ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                        <Check className="size-3" strokeWidth={3} /> Selesai
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MissionVisualIcon({
  index,
  isCheckpoint,
  isLocked,
  alphabetRange,
  artworkSrc,
}: {
  index: number;
  isCheckpoint: boolean;
  isLocked: boolean;
  alphabetRange?: string;
  artworkSrc?: string;
}) {
  if (isLocked) {
    return <LockKeyhole className="size-7 text-slate-700/60 sm:size-8" />;
  }

  if (artworkSrc) {
    return (
      <Image
        src={artworkSrc}
        alt=""
        width={128}
        height={112}
        className="h-20 w-24 object-contain sm:h-24 sm:w-28 lg:h-28 lg:w-32"
        draggable={false}
        loading="lazy"
      />
    );
  }

  if (alphabetRange) {
    return (
      <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        {alphabetRange}
      </span>
    );
  }

  if (isCheckpoint) {
    return (
      <svg
        className="size-8 sm:size-10 text-slate-800"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    );
  }

  if (index === 0) {
    // Two hands greeting / palm icon
    return (
      <svg
        className="size-9 sm:size-11"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 10V26C18 29.3137 20.6863 32 24 32C27.3137 32 30 29.3137 30 26V14"
          stroke="#C25E1A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M14 16V26C14 31.5228 18.4772 36 24 36C29.5228 36 34 31.5228 34 26V20"
          stroke="#E07932"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M24 6L24 10M12 12L15 15M36 12L33 15"
          stroke="#E54D2E"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (index === 1) {
    // Clock / time icon
    return (
      <div className="grid size-9 sm:size-11 place-items-center rounded-full border-2 border-orange-500 bg-orange-50/90 shadow-2xs">
        <svg
          className="size-5 sm:size-6 text-orange-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    );
  }

  if (index === 2) {
    // High five / clapping hands with celebration rays
    return (
      <svg
        className="size-9 sm:size-11"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 28L20 18C21.5 15.5 24.5 15.5 26 18L32 28"
          stroke="#D46221"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 12L19 14M24 8V11M32 12L29 14M10 20L13 21M38 20L35 21"
          stroke="#E54D2E"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // index === 3 or default gesture icon
  return (
    <svg
      className="size-8 sm:size-10 text-slate-800"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}

function ChapterIllustration({ type }: { type: string }) {
  // The stored chapter IDs predate the current display order. Map them to the
  // visible Bab number so the supplied Bab1–Bab5 artwork stays in sequence.
  const illustrationByChapterId: Record<string, string> = {
    'chapter-5': '/assets/bisara/Bab1.png',
    'chapter-1': '/assets/bisara/Bab2.png',
    'chapter-2': '/assets/bisara/Bab3.png',
    'chapter-3': '/assets/bisara/Bab4.png',
    'chapter-4': '/assets/bisara/Bab5.png',
  };

  const src = illustrationByChapterId[type];

  if (!src) return null;

  return (
    <Image
      src={src}
      alt=""
      width={256}
      height={208}
      className="h-40 w-52 object-contain object-top sm:h-48 sm:w-60 lg:h-52 lg:w-64"
      draggable={false}
      loading="lazy"
    />
  );
}
