import type { Metadata } from 'next';
import {
  ArrowLeft,
  Check,
  Hand,
  Info,
  Languages,
  MessageCircleMore,
  MoveRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { CameraPractice } from '@/components/camera-practice';
import { PracticeSignProgress } from '@/components/practice-sign-progress';
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
  searchParams: Promise<{ mission?: string; sign?: string; source?: string }>;
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

  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Link
              href={reviewMode ? '/review' : mission.href}
              className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-signal-navy"
            >
              <ArrowLeft className="size-4" />{' '}
              {reviewMode ? 'Kembali ke review' : 'Kembali ke detail misi'}
            </Link>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge className="bg-signal-teal text-signal-navy">
                Bab {chapter.number} · Misi {mission.number}
              </Badge>
              <Badge
                variant="outline"
                className="border-signal-navy/10 text-muted-foreground"
              >
                Tahap Tirukan
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-signal-navy sm:text-5xl">
              Latih tanda “{sign.label}”
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Amati contoh, aktifkan kamera, bersiap selama hitung mundur, lalu
              ikuti gerakan sampai indikator rekaman selesai.
            </p>
          </div>
          <ol
            className="flex items-center gap-2"
            aria-label="Tahap pembelajaran"
          >
            {[Check, Hand, Languages, MessageCircleMore].map((Icon, index) => (
              <li key={index} className="flex items-center gap-2">
                <span
                  className={`grid size-10 place-items-center rounded-full border ${index === 0 ? 'border-signal-teal bg-signal-teal' : index === 1 ? 'border-signal-yellow bg-signal-yellow' : 'border-signal-navy/10 bg-muted text-muted-foreground'}`}
                >
                  <Icon className="size-4" />
                </span>
                {index < 3 ? (
                  <MoveRight className="size-4 text-signal-navy/25" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>

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
              <video
                id={referenceVideoId}
                className="mt-5 aspect-[4/3] w-full bg-black object-cover"
                src={referenceVideoUrl}
                aria-label={`Video contoh tanda ${sign.label}`}
                autoPlay
                loop
                muted
                playsInline
                controls
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
                  Skor adalah kemiripan terhadap satu contoh, bukan klasifikasi
                  kata atau sertifikasi kemampuan.
                </p>
              </div>
            </div>
          </aside>
          <div className="order-1 lg:order-2">
            <CameraPractice
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
    </main>
  );
}
