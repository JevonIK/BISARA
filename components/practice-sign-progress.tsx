'use client';

import { Flag } from 'lucide-react';
import Link from 'next/link';

import { getSigns, type SignId } from '@/lib/curriculum-data';
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
  const missionSigns = getSigns(signIds);

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

          return (
            <div key={sign.id} className="relative z-10 shrink-0 px-1">
              <Link
                href={`/missions/practice?mission=${missionId}&sign=${sign.id}`}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'inline-block rounded-full px-5 py-1.5 text-xs sm:text-sm font-black transition-all whitespace-nowrap',
                  active
                    ? 'border-2 border-[#00D5D1] bg-white text-emerald-800 shadow-xs ring-2 ring-[#00D5D1]/30'
                    : 'border border-transparent bg-[#ECEFF3] text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                )}
              >
                {sign.label}
              </Link>
            </div>
          );
        })}

        {/* Latihan pill */}
        <div className="relative z-10 shrink-0 px-1">
          <span className="inline-block rounded-full border-2 border-[#FFAE00] bg-white px-5 py-1.5 text-xs sm:text-sm font-black text-[#E54D2E] shadow-2xs whitespace-nowrap">
            Latihan
          </span>
        </div>

        {/* Flag */}
        <div className="relative z-10 shrink-0 pl-1">
          <Flag className="size-5 text-[#E54D2E] fill-[#E54D2E]" />
        </div>
      </div>
    </div>
  );
}
