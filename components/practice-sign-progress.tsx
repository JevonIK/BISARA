'use client';

import { Check } from 'lucide-react';
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
  const passedCount = missionSigns.filter(
    (sign) => progress.signMastery[sign.id].passed,
  ).length;

  return (
    <section className="mb-5 border border-signal-navy/10 bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
            Urutan latihan
          </p>
          <h2 className="mt-1 text-base font-black text-signal-navy">
            Kuasai seluruh {missionSigns.length} tanda
          </h2>
        </div>
        <p className="text-xs font-bold text-muted-foreground">
          {passedCount} dari {missionSigns.length} lulus
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {missionSigns.map((sign, index) => {
          const passed = progress.signMastery[sign.id].passed;
          const active = sign.id === activeSignId;
          return (
            <li key={sign.id}>
              <Link
                href={`/missions/practice?mission=${missionId}&sign=${sign.id}`}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-2 border px-3 py-2 text-xs font-extrabold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  active && 'border-signal-yellow bg-signal-yellow/15',
                  !active && passed && 'border-signal-teal bg-signal-teal-soft',
                  !active &&
                    !passed &&
                    'border-signal-navy/10 hover:border-signal-teal',
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-[10px]',
                    passed
                      ? 'bg-signal-teal text-signal-navy'
                      : active
                        ? 'bg-signal-yellow text-signal-navy'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {passed ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate">{sign.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
