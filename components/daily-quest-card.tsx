'use client';

import { ArrowRight, Check, Trophy } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { useProgress } from '@/hooks/use-progress';
import { getReviewSignIds } from '@/lib/progress-storage';

export function DailyQuestCard() {
  const userProgress = useProgress();
  const reviewSignIds = getReviewSignIds(userProgress);
  const completed = reviewSignIds.filter((id) =>
    userProgress.reviewedSigns.includes(id),
  ).length;
  const total = reviewSignIds.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total;

  return (
    <aside
      id="daily-quest"
      className="flex flex-col justify-between border-t-4 border-signal-coral bg-card p-6 sm:p-8"
    >
      <div>
        <div className="mb-8 flex items-start justify-between">
          <div className="grid size-12 place-items-center rounded-full bg-signal-coral/10 text-signal-coral">
            {isComplete ? (
              <Check className="size-6" strokeWidth={3} />
            ) : (
              <Trophy className="size-6" />
            )}
          </div>
          <Badge
            variant="outline"
            className="h-7 border-signal-coral/20 px-3 text-signal-coral"
          >
            {isComplete
              ? 'Tidak ada yang tertunda'
              : `${total - completed} tanda`}
          </Badge>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-signal-coral">
          Review berkala
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
          {isComplete
            ? 'Latihan hari ini sudah selesai'
            : `Ingat kembali ${total - completed} tanda`}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isComplete
            ? 'Beri jeda sebelum mengulang. Kamu bisa melanjutkan materi berikutnya.'
            : 'Coba tanpa contoh, lalu bandingkan dan catat bantuan yang dibutuhkan.'}
        </p>
      </div>
      <div className="mt-10">
        <Progress value={percentage} className="gap-2">
          <ProgressLabel className="font-bold text-signal-navy">
            Progres hari ini
          </ProgressLabel>
          <span className="ml-auto text-sm font-bold text-muted-foreground">
            {completed} dari {total}
          </span>
        </Progress>
        <Link
          href="/review"
          className="mt-6 flex w-full items-center justify-between border-t border-signal-navy/10 pt-5 text-left text-sm font-extrabold text-signal-navy transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isComplete ? 'Lihat jadwal review' : 'Mulai review'}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </aside>
  );
}
