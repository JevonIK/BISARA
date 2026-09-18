import type { Metadata } from 'next';
import { ArrowLeft, Info, RotateCcw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/app-header';
import { CameraPractice } from '@/components/camera-practice';
import { PracticeSignProgress } from '@/components/practice-sign-progress';
import { ReferenceSignVideo } from '@/components/reference-sign-video';
import { MissionSectionNavigation } from '@/components/mission-section-navigation';
import { Badge } from '@/components/ui/badge';
import { getSign, isSignId, versionedSignVideo } from '@/lib/curriculum-data';
import { getChapterForMission, getMission } from '@/lib/learning-data';
import {
  getCuratedReferenceWindow,
  getPracticePreviewVideoUrl,
} from '@/lib/reference-window';

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
  if (mission.type === 'alphabet') {
    redirect(`/missions/learn?mission=${mission.id}&section=tirukan`);
  }
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

        <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="order-2 space-y-5 lg:order-1">
            <div className="border-t-4 border-signal-teal bg-card p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Contoh tanda
              </p>
              <ReferenceSignVideo
                key={sign.id}
                id={referenceVideoId}
                src={getPracticePreviewVideoUrl(referenceVideoUrl)}
                label={sign.label}
                window={getCuratedReferenceWindow(referenceVideoUrl)}
              />
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Fokus pengamatan
              </p>
              <ul className="mt-3 space-y-3 text-sm font-bold text-signal-navy">
                <li>• Bentuk dan jarak antarjari</li>
                <li>• {sign.focus}</li>
                <li>• Arah telapak dan titik akhir</li>
              </ul>
              <p className="mt-4 border-t border-signal-navy/10 pt-4 text-xs leading-5 text-muted-foreground">
                {sign.note}
              </p>
            </div>
            <div className="border border-signal-navy/10 bg-card p-6">
              <div className="flex gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Skor membandingkan gerakanmu dengan satu contoh per tanda
                  serta kosakata lain dalam kurikulum. Hasilnya belum merupakan
                  sertifikasi kemampuan BISINDO.
                </p>
              </div>
            </div>
          </aside>
          <div className="order-1 lg:order-2">
            <CameraPractice
              key={sign.id}
              signId={sign.id}
              signLabel={sign.label}
              referenceVideoUrl={referenceVideoUrl}
              referenceVideoElementId={referenceVideoId}
              missionId={mission.id}
              missionSignIds={mission.signIds}
              reviewMode={reviewMode}
            />
          </div>
        </section>

        <section className="mt-8 flex gap-3 border border-signal-navy/10 bg-card p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-sm font-black text-signal-navy">
              Privasi latihan kamera
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Frame diproses pada perangkat untuk menghasilkan landmark dan
              tidak diunggah atau disimpan oleh BISARA.
            </p>
          </div>
        </section>
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
