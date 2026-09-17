import type { Metadata } from 'next';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { CameraPractice } from '@/components/camera-practice';
import { PracticeSignProgress } from '@/components/practice-sign-progress';
import { MissionSectionNavigation } from '@/components/mission-section-navigation';
import { Badge } from '@/components/ui/badge';
import { getSign, isSignId, versionedSignVideo } from '@/lib/curriculum-data';
import { getChapterForMission, getMission } from '@/lib/learning-data';

export const metadata: Metadata = {
  title: 'Latihan Kamera BISINDO',
  description: 'Latih tanda dengan contoh dan checker landmark tangan.',
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    mission?: string;
    sign?: string;
    source?: string;
    returnMission?: string;
    replay?: string;
  }>;
}) {
  const params = await searchParams;
  const mission = getMission(params.mission);
  const chapter = getChapterForMission(mission.id);
  const requestedSign =
    params.sign &&
    isSignId(params.sign) &&
    mission.signIds.includes(params.sign)
      ? params.sign
      : mission.signIds[0];
  const sign = getSign(requestedSign);
  const referenceVideoId = `${mission.id}-${sign.id}-reference-video`;
  const referenceVideoUrl = versionedSignVideo(sign.videoSrc);
  const reviewMode = params.source === 'review';
  const productionReturn =
    params.source === 'production' &&
    params.returnMission &&
    getMission(params.returnMission).id === params.returnMission
      ? `/missions/test?mission=${params.returnMission}&mode=recall`
      : null;
  const replayMode = params.replay === '1';

  const exampleCard = (
    <aside className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-xs border border-amber-200/50">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
          CONTOH TANDA
        </span>
        <div className="mt-4 overflow-hidden rounded-2xl bg-black aspect-[4/3] relative">
          <video
            id={referenceVideoId}
            className="size-full object-cover"
            src={referenceVideoUrl}
            aria-label={`Video contoh tanda ${sign.label}`}
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
          AMATI SECARA MENYELURUH
        </span>
        <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm font-black text-slate-800">
          <li className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-[#00D5D1] shrink-0" />
            <span>Bentuk tangan</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-[#FFAE00] shrink-0" />
            <span>Posisi terhadap tubuh</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-[#E54D2E] shrink-0" />
            <span>Arah telapak</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-[#1E293B] shrink-0" />
            <span>Ekspresi Wajah</span>
          </li>
        </ul>
      </div>
    </aside>
  );

  return (
    <main className="min-h-screen bg-[#FFE8A3] pb-28">
      <AppHeader active="home" />

      <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8 lg:py-5">
        {/* Back link */}
        <Link
          href={productionReturn ?? (reviewMode ? '/review' : '/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="size-4" />{' '}
          {productionReturn
            ? 'Kembali ke Uji peragaan'
            : reviewMode
              ? 'Kembali ke review'
              : 'Kembali ke beranda'}
        </Link>

        {/* Chapter / Mission Badge & Replay badge */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-[#00D5D1] px-4 py-1 text-xs font-black text-slate-900 shadow-2xs">
            Bab {chapter.number.replace(/^0/, '')} • Misi {mission.number}
          </span>
          {replayMode ? (
            <Badge className="bg-[#FFAE00] text-slate-900 font-black rounded-full px-3 py-1">
              <RotateCcw className="size-3" /> Mode ulang misi
            </Badge>
          ) : null}
        </div>

        {/* Heading */}
        <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
          Latih tanda “{sign.label}”
        </h1>

        {/* Horizontal Vocabulary Stepper */}
        {!reviewMode ? (
          <PracticeSignProgress
            activeSignId={sign.id}
            missionId={mission.id}
            signIds={mission.signIds}
          />
        ) : null}

        {/* 3-Column Practice Area (Contoh Tanda + Kamera + Kalibrasi/Hasil) */}
        <CameraPractice
          key={sign.id}
          signId={sign.id}
          signLabel={sign.label}
          referenceVideoUrl={referenceVideoUrl}
          referenceVideoElementId={referenceVideoId}
          missionId={mission.id}
          missionSignIds={mission.signIds}
          reviewMode={reviewMode}
          exampleCard={exampleCard}
        />
      </div>

      {/* Fixed Bottom Timeline Navigation */}
      {!reviewMode ? (
        <MissionSectionNavigation
          missionId={mission.id}
          section="tirukan"
          variant="bottom-bar"
        />
      ) : null}
    </main>
  );
}
