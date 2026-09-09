'use client';

import {
  Check,
  ChevronRight,
  Flag,
  LockKeyhole,
  Map,
  Play,
  Sparkles,
  Star,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { useProgress } from '@/hooks/use-progress';
import { allMissions, chapters, type Mission } from '@/lib/learning-data';
import {
  getChapterProgress,
  getCurrentMission,
  getPrototypeMissionCount,
  isMissionUnlocked,
} from '@/lib/learning-progress';
import { cn } from '@/lib/utils';

export function MissionJourney() {
  const userProgress = useProgress();
  const completedMissions = getPrototypeMissionCount(userProgress);
  const overallProgress = Math.round(
    (completedMissions / allMissions.length) * 100,
  );
  const currentMission = getCurrentMission(userProgress);

  return (
    <div className="mx-auto max-w-7xl px-5 py-9 lg:px-8 lg:py-12">
      <header className="grid gap-8 border-b border-signal-navy/10 pb-10 lg:grid-cols-[1fr_370px] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            <Map className="size-4" /> Perjalanan belajar
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-signal-navy sm:text-5xl">
            Setiap misi membawamu lebih dekat ke percakapan nyata.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Pelajari materi secara berurutan. Setiap bab dimulai dengan tanda
            dasar, dilanjutkan latihan kamera, lalu ditutup dengan tes tanpa
            petunjuk.
          </p>
        </div>

        <aside className="border-l-4 border-signal-teal bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.13em] text-emerald-700">
                Progres keseluruhan
              </p>
              <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-signal-navy">
                {overallProgress}%
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-signal-yellow/30 text-amber-700">
              <Sparkles className="size-5" />
            </span>
          </div>
          <Progress value={overallProgress} className="gap-2">
            <ProgressLabel className="text-xs font-bold text-signal-navy">
              {completedMissions} dari {allMissions.length} misi selesai
            </ProgressLabel>
          </Progress>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Misi berikutnya: {currentMission.title}. Seluruh 32 tanda tersedia
            dalam empat bab berurutan.
          </p>
        </aside>
      </header>

      <div className="space-y-10 py-10 lg:py-14">
        {chapters.map((chapter) => {
          const chapterMissions = chapter.missions.map((mission) => ({
            ...mission,
            status: userProgress.completedMissionIds.includes(mission.id)
              ? ('completed' as const)
              : currentMission.id === mission.id
                ? ('current' as const)
                : ('locked' as const),
          }));
          const chapterProgress = getChapterProgress(chapter.id, userProgress);
          const chapterUnlocked = chapterMissions.some((mission) =>
            isMissionUnlocked(mission.id, userProgress),
          );

          return (
            <section
              key={chapter.id}
              aria-labelledby={`${chapter.id}-title`}
              className={cn(
                'grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]',
                !chapterUnlocked && 'opacity-75',
              )}
            >
              <header className="lg:sticky lg:top-6 lg:self-start">
                <div
                  className={cn(
                    'mb-5 grid size-16 place-items-center rounded-full text-xl font-black',
                    chapterUnlocked
                      ? 'bg-signal-teal text-signal-navy'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {!chapterUnlocked ? (
                    <LockKeyhole className="size-6" />
                  ) : (
                    chapter.number
                  )}
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700">
                  Bab {chapter.number} · {chapter.eyebrow}
                </p>
                <h2
                  id={`${chapter.id}-title`}
                  className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy"
                >
                  {chapter.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {chapter.description}
                </p>
                {chapterUnlocked ? (
                  <div className="mt-5">
                    <Progress value={chapterProgress} className="gap-2">
                      <ProgressLabel className="text-xs font-bold text-signal-navy">
                        Progres bab
                      </ProgressLabel>
                      <span className="ml-auto text-xs font-bold text-muted-foreground">
                        {chapterProgress}%
                      </span>
                    </Progress>
                  </div>
                ) : null}
              </header>

              <ol className="space-y-3">
                {chapterMissions.map((mission) => (
                  <MissionRow key={mission.id} mission={mission} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MissionRow({ mission }: { mission: Mission }) {
  const content = (
    <>
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full border',
          mission.status === 'completed' &&
            'border-signal-teal bg-signal-teal text-signal-navy',
          mission.status === 'current' &&
            'border-signal-yellow bg-signal-yellow text-signal-navy',
          mission.status === 'locked' &&
            'border-signal-navy/10 bg-muted text-muted-foreground',
        )}
      >
        {mission.status === 'completed' ? (
          <Check className="size-4" strokeWidth={3} />
        ) : null}
        {mission.status === 'current' ? (
          <Play className="size-4" fill="currentColor" />
        ) : null}
        {mission.status === 'locked' ? (
          <LockKeyhole className="size-4" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            Misi {mission.number}
          </span>
          {mission.type === 'checkpoint' ? (
            <Badge
              variant="outline"
              className="h-5 border-signal-coral/20 text-[10px] text-signal-coral"
            >
              <Flag className="size-2.5" /> Tes bab
            </Badge>
          ) : null}
        </span>
        <span className="mt-1 block text-base font-black text-signal-navy">
          {mission.title}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {mission.description}
        </span>
      </span>
      <span className="hidden shrink-0 text-right sm:block">
        <span className="flex items-center justify-end gap-1 text-xs font-bold text-signal-navy">
          <Star className="size-3.5 text-amber-500" fill="currentColor" />+
          {mission.xp} XP
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {mission.duration} menit
        </span>
      </span>
      {mission.status === 'current' ? (
        <ChevronRight className="size-5 shrink-0 text-emerald-700" />
      ) : null}
    </>
  );
  const className = cn(
    'flex items-center gap-4 border bg-card p-4 text-left transition-all sm:p-5',
    mission.status === 'current'
      ? 'border-signal-teal hover:-translate-y-0.5 hover:border-emerald-600'
      : 'border-signal-navy/10',
  );

  return (
    <li>
      {mission.status !== 'locked' ? (
        <Link href={mission.href} className={className}>
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}
