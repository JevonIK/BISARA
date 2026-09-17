'use client';

import { Flag } from 'lucide-react';
import Link from 'next/link';

import { getSigns, type SignId } from '@/lib/curriculum-data';
import { useProgress } from '@/hooks/use-progress';
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

  return (
    <div className="my-6 flex flex-wrap items-center gap-4 sm:gap-6 rounded-2xl sm:rounded-full border border-amber-200/50 bg-white px-5 sm:px-8 py-3.5 sm:py-4 shadow-xs">
      {/* KOSA KATA Icon and Label */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="grid size-6 place-items-center rounded-full border-2 border-[#E54D2E]">
          <span className="size-2 rounded-full bg-[#E54D2E]" />
        </span>
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
          KOSA KATA
        </span>
      </div>

      {/* Connected Word Pills */}
      <div className="flex flex-1 items-center min-w-0 overflow-x-auto py-1 scrollbar-none">
        {missionSigns.map((sign, index) => {
          const active = sign.id === activeSignId;
          const passed = progress.signMastery[sign.id]?.passed;

          return (
            <div key={sign.id} className="flex items-center shrink-0">
              {index > 0 && (
                <div className="h-0.5 w-5 sm:w-8 lg:w-10 bg-slate-300 shrink-0" />
              )}
              <Link
                href={`/missions/practice?mission=${missionId}&sign=${sign.id}`}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs sm:text-sm font-black transition-all whitespace-nowrap',
                  active
                    ? 'border-2 border-[#00D5D1] bg-white text-emerald-800 shadow-xs ring-2 ring-[#00D5D1]/30'
                    : passed
                      ? 'border border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100'
                      : 'border border-slate-200 bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                )}
              >
                {sign.label}
              </Link>
            </div>
          );
        })}

        {/* Latihan pill & Flag */}
        <div className="h-0.5 w-5 sm:w-8 lg:w-10 bg-slate-300 shrink-0" />
        <span className="rounded-full border-2 border-[#FFAE00] bg-white px-4 py-1.5 text-xs sm:text-sm font-black text-[#E54D2E] shadow-2xs shrink-0 whitespace-nowrap">
          Latihan
        </span>

        <div className="h-0.5 w-4 sm:w-6 bg-slate-300 shrink-0" />
        <Flag className="size-5 text-[#E54D2E] fill-[#E54D2E] shrink-0" />
      </div>
    </div>
  );
}
