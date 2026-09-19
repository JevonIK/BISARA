'use client';

import { Check, Flag, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

import { useProgress } from '@/hooks/use-progress';
import { getSigns, type SignId } from '@/lib/curriculum-data';
import {
  isMissionPracticeComplete,
  isMissionSignUnlocked,
} from '@/lib/learning-progress';
import { cn } from '@/lib/utils';

export function PracticeSignProgress({
  activeSignId,
  missionId = 'berkenalan',
  signIds = ['saya', 'siapa', 'teman', 'terima-kasih', 'maaf'],
}: {
  activeSignId: SignId;
  missionId?: string;
  signIds?: SignId[];
}) {
  const progress = useProgress();
  const missionSigns = getSigns(signIds);
  const allSignsPassed = isMissionPracticeComplete(
    signIds,
    progress,
    missionId,
  );

  return (
    <div className="my-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-[#FFAE00]/60 bg-[#FFFDF7] px-6 sm:px-8 py-3.5 shadow-xs">
      {/* KOSA KATA Icon and Label */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="grid size-6 place-items-center rounded-full border-2 border-[#E54D2E]">
          <span className="size-2 rounded-full bg-[#E54D2E]" />
        </span>
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
          KOSA KATA
        </span>
      </div>

      {/* Connected Word Track spanning available space */}
      <div className="relative flex flex-1 items-center justify-between min-w-0 max-w-4xl px-2 sm:px-4 py-1 overflow-x-auto scrollbar-none">
        {/* Continuous Connecting Line */}
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-300 -z-0" />

        {missionSigns.map((sign) => {
          const active = sign.id === activeSignId;
          const isUnlocked = isMissionSignUnlocked(
            sign.id,
            signIds,
            progress,
            missionId,
          );
          const isPassed = Boolean(progress.signMastery[sign.id]?.passed);

          if (!isUnlocked) {
            return (
              <div key={sign.id} className="relative z-10 shrink-0 px-1">
                <span
                  aria-disabled="true"
                  title="Selesaikan kosakata sebelumnya terlebih dahulu"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/90 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-400 opacity-60 cursor-not-allowed select-none whitespace-nowrap"
                >
                  <LockKeyhole className="size-3 text-slate-400 shrink-0" />
                  {sign.label}
                </span>
              </div>
            );
          }

          return (
            <div key={sign.id} className="relative z-10 shrink-0 px-1">
              <Link
                href={`/missions/practice?mission=${missionId}&sign=${sign.id}`}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-black transition-all whitespace-nowrap',
                  active
                    ? 'border-2 border-[#00D5D1] bg-white text-slate-900 shadow-xs ring-2 ring-[#00D5D1]/30'
                    : 'border border-transparent bg-[#ECEFF3] text-slate-700 hover:bg-slate-200 hover:text-slate-900',
                )}
              >
                {isPassed && !active ? (
                  <Check className="size-3.5 text-emerald-600 stroke-[3] shrink-0" />
                ) : null}
                {sign.label}
              </Link>
            </div>
          );
        })}

        {/* Latihan pill */}
        <div className="relative z-10 shrink-0 px-1">
          {allSignsPassed ? (
            <Link
              href={`/missions/test?mission=${missionId}`}
              className="inline-block rounded-full border-2 border-[#FFAE00] bg-white px-5 py-1.5 text-xs sm:text-sm font-black text-[#E54D2E] shadow-2xs hover:bg-amber-50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              Latihan
            </Link>
          ) : (
            <span
              aria-disabled="true"
              title="Selesaikan seluruh kosakata sebelum latihan"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/90 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-400 opacity-60 cursor-not-allowed select-none whitespace-nowrap"
            >
              <LockKeyhole className="size-3 text-slate-400 shrink-0" />
              Latihan
            </span>
          )}
        </div>

        {/* Flag */}
        <div className="relative z-10 shrink-0 pl-1">
          <Flag
            className={cn(
              'size-5 transition-colors',
              allSignsPassed
                ? 'text-[#E54D2E] fill-[#E54D2E]'
                : 'text-slate-300 fill-slate-300',
            )}
          />
        </div>
      </div>
    </div>
  );
}
