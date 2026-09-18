'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { useProgress } from '@/hooks/use-progress';
import {
  allMissions,
  getChapterForMission,
  getMission,
  getMissionPosition,
} from '@/lib/learning-data';
import {
  getMissionLearningState,
  getMissionReplayAction,
} from '@/lib/learning-progress';

export function ToastingIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Celebration splash / droplets radiating out at top */}
      <g>
        <circle cx="170" cy="45" r="7" fill="#E54D2E" />
        <circle cx="145" cy="30" r="5" fill="#FFAE00" />
        <circle cx="195" cy="32" r="6" fill="#FFAE00" />
        <circle cx="125" cy="50" r="4.5" fill="#E54D2E" />
        <circle cx="215" cy="52" r="5" fill="#E54D2E" />
        <circle cx="160" cy="22" r="4" fill="#E54D2E" />
        <circle cx="180" cy="18" r="4.5" fill="#FFAE00" />

        <path
          d="M168 58C168 58 171 35 174 30C177 25 183 32 178 45C175 52 170 58 168 58Z"
          fill="#E54D2E"
        />
        <path
          d="M155 62C155 62 140 45 132 40C128 37 124 45 132 52C140 58 152 64 155 62Z"
          fill="#FFAE00"
        />
        <path
          d="M185 64C185 64 205 48 214 42C218 39 223 48 215 54C207 60 190 65 185 64Z"
          fill="#FFAE00"
        />
        <path
          d="M162 70C160 55 152 40 150 35C148 30 142 35 145 42C148 50 156 65 162 70Z"
          fill="#E54D2E"
        />
        <path
          d="M178 70C180 55 190 40 194 35C198 30 202 35 198 42C194 50 184 65 178 70Z"
          fill="#E54D2E"
        />
      </g>

      {/* Left Tumbler / Cup (tilted right ~12deg) */}
      <g transform="rotate(12 150 110)">
        <rect x="130" y="66" width="38" height="12" rx="3" fill="#2E282A" />
        <path
          d="M132 78L138 148C138.5 153 159.5 153 160 148L166 78Z"
          fill="#F5ECD7"
          stroke="#E2D4B7"
          strokeWidth="2"
        />
      </g>

      {/* Right Tumbler / Cup (tilted left ~ -14deg) */}
      <g transform="rotate(-14 190 110)">
        <rect x="172" y="66" width="38" height="12" rx="3" fill="#2E282A" />
        <path
          d="M174 78L180 148C180.5 153 201.5 153 202 148L208 78Z"
          fill="#F5ECD7"
          stroke="#E2D4B7"
          strokeWidth="2"
        />
      </g>

      {/* Left Hand & Arm (yellow sleeve) */}
      <g>
        <path d="M122 170L108 300H156L164 170Z" fill="#FFAE00" />
        <rect x="118" y="166" width="48" height="8" rx="2" fill="#2E282A" />
        <path
          d="M125 166V132C125 125 132 118 140 118H162C165 118 168 122 168 126C168 130 165 134 162 134H146V138H164C167 138 170 142 170 146C170 150 167 154 164 154H144V166H125Z"
          fill="#F6CEB4"
        />
        <line x1="140" y1="126" x2="162" y2="126" stroke="#E3AA8B" strokeWidth="2" strokeLinecap="round" />
        <line x1="140" y1="136" x2="160" y2="136" stroke="#E3AA8B" strokeWidth="2" strokeLinecap="round" />
        <line x1="140" y1="146" x2="162" y2="146" stroke="#E3AA8B" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Right Hand & Arm (terracotta sleeve) */}
      <g>
        <path d="M208 175L270 300H320L250 175Z" fill="#D9532F" />
        <rect
          x="202"
          y="170"
          width="50"
          height="8"
          rx="2"
          transform="rotate(18 202 170)"
          fill="#2E282A"
        />
        <path
          d="M208 170L200 135C200 128 194 122 186 122H168C165 122 162 126 162 130C162 134 165 138 168 138H182V142H166C163 142 160 146 160 150C160 154 163 158 166 158H184V170H208Z"
          fill="#F6CEB4"
        />
        <line x1="168" y1="130" x2="188" y2="130" stroke="#E3AA8B" strokeWidth="2" strokeLinecap="round" />
        <line x1="168" y1="140" x2="186" y2="140" stroke="#E3AA8B" strokeWidth="2" strokeLinecap="round" />
        <line x1="168" y1="150" x2="188" y2="150" stroke="#E3AA8B" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function MissionHeroProgressCard({
  missionId,
}: {
  missionId: string;
}) {
  const progress = useProgress();
  const mission = getMission(missionId);
  const state = getMissionLearningState(mission, progress);
  const replay = getMissionReplayAction(mission);

  const nextMission = allMissions[getMissionPosition(mission.id) + 1];
  const nextChapter = nextMission ? getChapterForMission(nextMission.id) : null;

  const actionHref = state.missionComplete
    ? (nextMission?.href ?? replay.href)
    : state.next.href;

  const actionLabel = state.missionComplete
    ? (nextMission
        ? `Lanjut ke Bab ${nextChapter?.number.replace(/^0/, '')} • Misi ${nextMission.number}`
        : replay.label)
    : state.next.label;

  return (
    <div className="relative z-10 w-full max-w-xs rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur-md">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">
        PROGRES MISI
      </p>
      <p className="mt-1 text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
        {state.progressPercent}%
      </p>
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
        <div
          className="h-full rounded-full bg-[#E54D2E] transition-all duration-500"
          style={{ width: `${state.progressPercent}%` }}
        />
      </div>
      <Link
        href={actionHref}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#FFAE00] px-5 py-3.5 text-sm font-black text-slate-950 shadow-xs transition-colors hover:bg-[#ff9f00] cursor-pointer"
      >
        {actionLabel} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
