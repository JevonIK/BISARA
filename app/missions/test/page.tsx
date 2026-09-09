import type { Metadata } from 'next';
import { ArrowLeft, Flag } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { MissionAssessment } from '@/components/mission-assessment';
import { getChapterForMission, getMission } from '@/lib/learning-data';

export const metadata: Metadata = {
  title: 'Uji Misi BISINDO',
  description: 'Uji pengenalan tanda dan penerapannya dalam konteks.',
};

export default async function MissionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const mission = getMission(params.mission);
  const chapter = getChapterForMission(mission.id);
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <header className="mb-8 border-b border-signal-navy/10 pb-8">
          <Link
            href={mission.href}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-signal-navy"
          >
            <ArrowLeft className="size-4" /> Kembali ke detail misi
          </Link>
          <p className="mt-7 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-signal-coral">
            <Flag className="size-4" /> Bab {chapter.number} · Misi{' '}
            {mission.number}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-signal-navy sm:text-5xl">
            Kenali tandanya, lalu pilih respons dalam konteks.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {mission.title}: skor pengenalan minimal 70 membuka simulasi
            konteks.
          </p>
        </header>
        <MissionAssessment missionId={mission.id} initialMode={params.mode} />
      </div>
    </main>
  );
}
