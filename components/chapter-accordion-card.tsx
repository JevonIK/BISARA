'use client';

import { Check, ChevronDown, LockKeyhole, Play, Star } from 'lucide-react';
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
  currentChapterIndex: number;
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
};

export function ChapterAccordionCard({
  chapter,
  chapterIndex,
  isExpanded,
  onToggle,
  progress,
  currentMission,
  currentChapterIndex,
}: ChapterAccordionCardProps) {
  const theme = chapterThemes[chapter.id] ?? chapterThemes['chapter-1'];
  const isUnlocked = chapterIndex <= currentChapterIndex;
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
            className="group mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-800 hover:text-slate-950 transition-colors focus:outline-none"
            aria-expanded={isExpanded}
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
        className="pointer-events-none absolute top-0 right-28 sm:right-36 md:right-48 lg:right-56 hidden sm:block opacity-85 lg:opacity-95 z-0"
        aria-hidden="true"
      >
        <ChapterIllustration type={chapter.id} />
      </div>

      {/* Animated Collapsible Mission Drawer */}
      <div
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
                          'group flex aspect-square w-full flex-col items-center justify-between rounded-2xl border p-3.5 transition-all shadow-xs hover:-translate-y-1 hover:shadow-md sm:rounded-3xl sm:p-4',
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
}: {
  index: number;
  isCheckpoint: boolean;
  isLocked: boolean;
}) {
  if (isLocked) {
    return <LockKeyhole className="size-7 text-slate-700/60 sm:size-8" />;
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
  if (type === 'chapter-1') {
    // Open hand waving graphic matching user's Figma vector
    return (
      <svg
        className="h-52 w-64 sm:h-60 sm:w-72 lg:h-64 lg:w-80"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M65 180C75 145 92 110 102 78C105 70 106 50 102 30C99 18 112 12 118 24C124 38 125 58 126 72C130 58 137 34 146 14C151 3 162 8 159 20C154 40 148 62 146 76C151 64 163 38 173 24C180 14 190 20 185 32C177 52 168 76 164 88C171 76 184 60 193 48C200 40 209 46 204 56C192 84 173 118 162 136C146 160 128 176 112 180H65Z"
          fill="#E6C2BA"
        />
        <path
          d="M125 60C128 78 131 98 129 116"
          stroke="#4A4545"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M144 86C149 98 156 108 165 115"
          stroke="#4A4545"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'chapter-2') {
    // Bottle, glasses and noodle squiggle graphic
    return (
      <svg
        className="h-36 w-48"
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M140 10C155 20 160 30 145 45C130 60 140 70 160 75"
          stroke="#DCA842"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="100"
          y="70"
          width="24"
          height="70"
          rx="4"
          fill="#E7BA55"
          fillOpacity="0.5"
          stroke="#C8972E"
          strokeWidth="4"
        />
        <rect
          x="135"
          y="90"
          width="20"
          height="50"
          rx="3"
          fill="#F5CD6D"
          fillOpacity="0.6"
          stroke="#C8972E"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (type === 'chapter-3') {
    // Walking legs graphic
    return (
      <svg
        className="h-36 w-48"
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M130 20L110 80L80 130L65 140"
          stroke="#E68369"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M130 20L150 70L175 125L190 130"
          stroke="#D86B50"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // chapter-4: Clock and leaf graphic
  return (
    <svg
      className="h-36 w-48"
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="130"
        cy="70"
        r="40"
        fill="#FFFFFF"
        fillOpacity="0.6"
        stroke="#A5C2FA"
        strokeWidth="4"
      />
      <path
        d="M130 50V70L145 80"
        stroke="#7A9FE6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M160 40C180 50 190 70 185 100C170 95 160 85 160 40Z"
        fill="#C4D8FD"
        fillOpacity="0.7"
      />
    </svg>
  );
}
