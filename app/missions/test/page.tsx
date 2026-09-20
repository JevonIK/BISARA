import type { Metadata } from 'next';
import { ArrowLeft, Flag } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Suspense } from 'react';

import { AppHeader } from '@/components/app-header';
import { MissionAssessment } from '@/components/mission-assessment';
import { MissionSectionNavigation } from '@/components/mission-section-navigation';
import { getChapterForMission, getMission } from '@/lib/learning-data';

export const metadata: Metadata = {
  title: 'Uji Misi BISINDO',
  description: 'Uji pengenalan tanda dan peragaan tanpa contoh.',
};

export default async function MissionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string; mode?: string; replay?: string }>;
}) {
  const params = await searchParams;
  const mission = getMission(params.mission);
  if (mission.type === 'alphabet') {
    const section =
      params.mode === 'recall' ||
      params.mode === 'context' ||
      params.mode === 'conversation'
        ? 'recall'
        : 'recognition';
    redirect(`/missions/learn?mission=${mission.id}&section=${section}`);
  }
  if (mission.type === 'checkpoint' && params.mode === 'recall') {
    redirect(`/missions/test?mission=${mission.id}&mode=recognition`);
  }
  const chapter = getChapterForMission(mission.id);
  const isComplete = params.mode === 'complete';
  const isRecall =
    mission.type !== 'checkpoint' &&
    (params.mode === 'recall' ||
      params.mode === 'context' ||
      params.mode === 'conversation');
  const section = isComplete ? 'complete' : isRecall ? 'recall' : 'recognition';

  return (
    <main className="min-h-screen bg-[#FFE8A3] pb-44">
      <AppHeader active="home" />
      <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8 lg:py-5">
        {/* Back link */}
        <Link
          href={mission.href}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="size-4" /> Kembali ke detail misi
        </Link>

        {/* Dynamic header matching attachment */}
        {mission.type === 'checkpoint' ? (
          <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-[#E54D2E]">
            <Flag className="size-4 fill-[#E54D2E]" /> TES BAB {chapter.number.replace(/^0/, '')}
          </div>
        ) : (
          <div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[#00D5D1] px-4 py-1 text-xs font-black text-slate-900 shadow-2xs">
                Bab {chapter.number.replace(/^0/, '')} • Misi {mission.number}
              </span>
              <span className="rounded-full border border-[#E54D2E] bg-white/70 px-4 py-1 text-xs font-black text-[#E54D2E]">
                {isComplete ? 'Misi Selesai' : 'Tahap Latihan'}
              </span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
              {isComplete ? 'Hebat, Misi Terselesaikan!' : 'Asah Kemampuanmu!'}
            </h1>
            <p className="mt-2 text-sm sm:text-base font-semibold text-slate-700">
              {isComplete
                ? 'Seluruh tahapan latihan telah berhasil kamu selesaikan dengan baik.'
                : 'Selesaikan latihan singkat ini untuk mengunci kosakata yang baru kamu pelajari'}
            </p>
          </div>
        )}

        <div className="mt-6">
          <Suspense fallback={null}>
            <MissionAssessment
              key={`${mission.id}:${params.mode ?? 'menu'}`}
              missionId={mission.id}
              initialMode={params.mode}
            />
          </Suspense>
        </div>
      </div>

      {/* Fixed bottom timeline navigation */}
      {mission.type !== 'checkpoint' && (
        <MissionSectionNavigation
          missionId={mission.id}
          section={section}
          variant="bottom-bar"
        />
      )}
    </main>
  );
}
