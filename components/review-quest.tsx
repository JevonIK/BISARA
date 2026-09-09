'use client';

import { Check, ChevronRight, Flame, Play, Star, Target } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { useProgress } from '@/hooks/use-progress';
import {
  getSigns,
  signs,
  type SignId,
  versionedSignVideo,
} from '@/lib/curriculum-data';
import { allMissions } from '@/lib/learning-data';
import { getReviewSignIds } from '@/lib/progress-storage';
import { cn } from '@/lib/utils';

export function ReviewQuest() {
  const userProgress = useProgress();
  const reviewSignIds = getReviewSignIds(userProgress);
  const reviewItems = getSigns(reviewSignIds);
  const [selectedSignId, setSelectedSignId] = useState<SignId | null>(null);
  const activeSignId = selectedSignId ?? reviewItems[0].id;
  const activeItem =
    signs.find((item) => item.id === activeSignId) ?? reviewItems[0];
  const ownerMission =
    allMissions.find((mission) => mission.signIds.includes(activeItem.id)) ??
    allMissions[0];
  const completed = reviewSignIds.filter((id) =>
    userProgress.reviewedSigns.includes(id),
  ).length;
  const total = reviewSignIds.length;
  const percentage = Math.round((completed / total) * 100);
  const isComplete = completed === total;
  const activeIsComplete = userProgress.reviewedSigns.includes(activeItem.id);

  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden bg-signal-navy text-white lg:grid-cols-[1fr_330px]">
        <div className="p-7 sm:p-10">
          <Badge className="bg-signal-coral text-signal-navy">
            Daily quest · +100 XP
          </Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.05em] sm:text-5xl">
            Perkuat tanda yang paling perlu perhatian.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
            Mulai dari tanda dengan skor terendah, tonton ulang demonstrasi,
            lalu buktikan perbaikannya melalui checker kamera.
          </p>
        </div>
        <aside className="flex flex-col justify-between border-t border-white/10 bg-white/[0.04] p-7 lg:border-l lg:border-t-0 sm:p-9">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
                Progres hari ini
              </p>
              <p className="mt-2 text-4xl font-black tracking-[-0.05em]">
                {completed}/{total}
              </p>
            </div>
            {isComplete ? (
              <Check className="size-7 text-signal-teal" strokeWidth={3} />
            ) : (
              <Flame className="size-7 text-signal-coral" fill="currentColor" />
            )}
          </div>
          <Progress value={percentage} className="mt-8 gap-2">
            <ProgressLabel className="text-xs font-bold text-white">
              {isComplete ? 'Quest selesai' : 'Sedang berjalan'}
            </ProgressLabel>
            <span className="ml-auto text-xs font-bold text-white/55">
              {percentage}%
            </span>
          </Progress>
        </aside>
      </section>

      {isComplete && (
        <section className="flex flex-col gap-5 border border-signal-teal bg-signal-teal-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-signal-teal text-signal-navy">
              <Star className="size-6" fill="currentColor" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-[-0.03em] text-signal-navy">
                Daily quest selesai
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kamu memperoleh 50 XP bonus karena menyelesaikan seluruh review.
              </p>
            </div>
          </div>
          <Badge className="h-8 bg-signal-navy px-4 text-white">
            +100 XP total
          </Badge>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="border border-signal-navy/10 bg-card p-4 sm:p-5">
          <p className="px-2 pb-4 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Daftar review
          </p>
          <ol className="space-y-2">
            {reviewItems.map((item, index) => {
              const done = userProgress.reviewedSigns.includes(item.id);
              const active = item.id === activeItem.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSignId(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-signal-teal bg-signal-teal-soft'
                        : 'border-transparent hover:bg-muted/50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full text-xs font-black',
                        done
                          ? 'bg-signal-teal text-signal-navy'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {done ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-signal-navy">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.focus}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <article className="grid overflow-hidden border border-signal-navy/10 bg-card xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="bg-signal-navy p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
                  Review tanda
                </p>
                <h2 className="mt-1 text-2xl font-black">{activeItem.label}</h2>
              </div>
              <Badge
                variant="outline"
                className="border-white/15 text-white/65"
              >
                <Play className="size-3" fill="currentColor" /> Demonstrasi
              </Badge>
            </div>
            <video
              key={activeItem.id}
              src={versionedSignVideo(activeItem.videoSrc)}
              aria-label={`Demonstrasi tanda ${activeItem.label}`}
              className="aspect-video w-full bg-black object-cover"
              autoPlay
              loop
              muted
              playsInline
              controls
              controlsList="nodownload noplaybackrate"
            />
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-7">
            <div>
              <span className="grid size-11 place-items-center rounded-full bg-signal-yellow/30 text-amber-700">
                <Target className="size-5" />
              </span>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Fokus review
              </p>
              <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-signal-navy">
                {activeItem.focus}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {activeItem.note}
              </p>
            </div>

            <Link
              href={`/missions/practice?mission=${ownerMission.id}&sign=${activeItem.id}&source=review`}
              aria-disabled={activeIsComplete}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'mt-8 h-12 w-full rounded-full bg-signal-navy px-5 font-extrabold text-white',
                activeIsComplete && 'pointer-events-none opacity-50',
              )}
            >
              {activeIsComplete ? (
                <>
                  <Check className="size-4" /> Sudah direview
                </>
              ) : (
                <>
                  <Play className="size-4" /> Latih dengan kamera · +10 XP
                </>
              )}
            </Link>
          </div>
        </article>
      </section>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Urutan review memilih lima tanda dari seluruh kurikulum berdasarkan skor
        dan waktu latihan. Ambang checker tetap perlu dikalibrasi bersama
        validator Tuli.
      </p>
    </div>
  );
}
