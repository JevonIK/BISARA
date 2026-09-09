'use client';

import {
  BookOpen,
  Check,
  Clock3,
  Hand,
  Languages,
  MessageCircleMore,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { useProgress } from '@/hooks/use-progress';
import { getMissionLearningState } from '@/lib/learning-progress';
import { getMission } from '@/lib/learning-data';
import { cn } from '@/lib/utils';

const stageDefinitions = [
  {
    number: '01',
    title: 'Kenali',
    description: 'Amati demonstrasi dan pahami kapan setiap tanda digunakan.',
    duration: '2 menit',
    icon: BookOpen,
  },
  {
    number: '02',
    title: 'Tirukan',
    description: 'Luluskan checker kamera untuk kelima tanda, satu per satu.',
    duration: '5–8 menit',
    icon: Hand,
  },
  {
    number: '03',
    title: 'Uji pengenalan',
    description: 'Kenali lima tanda tanpa label dan capai minimal 70 poin.',
    duration: '2 menit',
    icon: Languages,
  },
  {
    number: '04',
    title: 'Pahami konteks',
    description:
      'Pilih respons yang sesuai dalam simulasi percakapan bercabang.',
    duration: '2 menit',
    icon: MessageCircleMore,
  },
] as const;

export function MissionHeroProgress({
  missionId = 'berkenalan',
}: {
  missionId?: string;
}) {
  const progress = useProgress();
  const mission = getMission(missionId);
  const state = getMissionLearningState(mission, progress);
  const activeStage = state.conversationComplete
    ? 4
    : state.recognitionComplete
      ? 4
      : state.practiceComplete
        ? 3
        : 2;

  return (
    <aside className="border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">
            Progres misi
          </p>
          <p className="mt-1 text-3xl font-black">{state.progressPercent}%</p>
        </div>
        <span className="text-xs font-bold text-signal-teal">
          {state.conversationComplete
            ? 'Misi selesai'
            : `Tahap ${activeStage} dari 4`}
        </span>
      </div>
      <Progress value={state.progressPercent} className="mt-5 gap-2">
        <ProgressLabel className="sr-only">Progres misi</ProgressLabel>
      </Progress>
      <Link
        href={state.next.href}
        className={cn(
          buttonVariants({ size: 'lg' }),
          'mt-6 h-12 w-full rounded-full bg-signal-teal px-5 font-extrabold text-signal-navy hover:bg-signal-teal/90',
        )}
      >
        {state.next.label} <span aria-hidden="true">→</span>
      </Link>
      {!state.practiceComplete ? (
        <p className="mt-3 text-center text-xs text-white/55">
          {state.masteredSignCount} dari {state.missionSigns.length} tanda sudah
          lulus
        </p>
      ) : null}
    </aside>
  );
}

export function MissionStageList({
  missionId = 'berkenalan',
}: {
  missionId?: string;
}) {
  const progress = useProgress();
  const mission = getMission(missionId);
  const learning = getMissionLearningState(mission, progress);
  const completed = [
    true,
    learning.practiceComplete,
    learning.recognitionComplete,
    learning.conversationComplete,
  ];
  const currentIndex = completed.findIndex((value) => !value);

  return (
    <ol className="grid gap-4 lg:grid-cols-4">
      {stageDefinitions.map((stage, index) => {
        const state = completed[index]
          ? 'completed'
          : index === currentIndex
            ? 'current'
            : 'locked';
        const Icon = stage.icon;
        return (
          <li
            key={stage.number}
            className={cn(
              'relative min-h-72 border p-6 sm:p-7',
              state === 'current' && 'border-signal-yellow bg-signal-yellow/15',
              state === 'completed' && 'border-signal-teal bg-signal-teal-soft',
              state === 'locked' && 'border-signal-navy/10 bg-card',
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-full',
                  state === 'completed' && 'bg-signal-teal text-signal-navy',
                  state === 'current' && 'bg-signal-yellow text-signal-navy',
                  state === 'locked' && 'bg-muted text-muted-foreground',
                )}
              >
                {state === 'completed' ? (
                  <Check className="size-5" strokeWidth={3} />
                ) : (
                  <Icon className="size-5" />
                )}
              </span>
              <span className="font-mono text-xs font-black text-muted-foreground">
                {stage.number}
              </span>
            </div>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              {state === 'completed'
                ? 'Selesai'
                : state === 'current'
                  ? 'Tahap aktif'
                  : 'Terkunci'}
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
              {mission.type === 'checkpoint' && index === 1
                ? 'Bekal bab'
                : stage.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {mission.type === 'checkpoint' && index === 1
                ? 'Mastery dari misi sebelumnya dipakai kembali; tidak ada pengulangan checker wajib.'
                : index === 1
                  ? `Luluskan checker kamera untuk ${mission.signIds.length} tanda, satu per satu.`
                  : index === 2
                    ? `Kenali tanda misi tanpa label dan capai minimal 70 poin.`
                    : stage.description}
            </p>
            <p className="absolute bottom-6 left-6 right-6 flex items-center gap-2 text-xs font-bold text-signal-navy sm:left-7 sm:right-7">
              <Clock3 className="size-3.5" /> {stage.duration}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
