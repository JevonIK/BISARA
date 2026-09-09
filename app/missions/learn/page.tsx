import type { Metadata } from 'next';
import {
  ArrowLeft,
  Clock3,
  Flag,
  Info,
  ShieldCheck,
  Star,
  Target,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import {
  MissionHeroProgress,
  MissionStageList,
} from '@/components/mission-learning-progress';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { getSigns, versionedSignVideo } from '@/lib/curriculum-data';
import { getChapterForMission, getMission } from '@/lib/learning-data';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Misi Belajar BISINDO',
  description:
    'Pelajari tanda, latih dengan kamera, uji pengenalan, lalu gunakan dalam konteks.',
};

export default async function MissionLearningPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string }>;
}) {
  const { mission: missionId } = await searchParams;
  const mission = getMission(missionId);
  const chapter = getChapterForMission(mission.id);
  const missionSigns = getSigns(mission.signIds);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <Link
          href="/missions"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-signal-navy"
        >
          <ArrowLeft className="size-4" /> Kembali ke perjalanan
        </Link>

        <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-signal-navy px-6 py-9 text-white sm:px-9 lg:px-12">
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-signal-teal text-signal-navy">
                  Bab {chapter.number} · Misi {mission.number}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/15 text-white/70"
                >
                  {mission.type === 'checkpoint'
                    ? 'Checkpoint'
                    : 'BISINDO Banten'}
                </Badge>
              </div>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-signal-teal">
                {mission.type === 'checkpoint'
                  ? 'Evaluasi bab'
                  : 'Misi belajar'}
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.05em] sm:text-5xl">
                {mission.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
                {mission.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-6 text-sm font-bold text-white/75">
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4 text-signal-teal" />
                  {mission.duration} menit
                </span>
                <span className="flex items-center gap-2">
                  <Star
                    className="size-4 text-signal-yellow"
                    fill="currentColor"
                  />
                  +{mission.xp} XP
                </span>
                <span className="flex items-center gap-2">
                  <Target className="size-4 text-signal-coral" />
                  {mission.signIds.length} tanda
                </span>
              </div>
            </div>
            <MissionHeroProgress missionId={mission.id} />
          </div>
        </section>

        <section className="grid gap-6 py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="border border-signal-navy/10 bg-card p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
              Kosakata misi
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
              {mission.type === 'checkpoint'
                ? 'Tanda yang diambil dari seluruh bab'
                : 'Kenali satu tanda pada satu waktu'}
            </h2>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mission.vocabulary.map((word, index) => (
                <li
                  key={`${word}-${index}`}
                  className="flex min-h-20 items-end justify-between border-t-2 border-signal-teal bg-signal-teal-soft p-4"
                >
                  <span className="font-black text-signal-navy">{word}</span>
                  <span className="font-mono text-[10px] font-black text-emerald-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="border-t-4 border-signal-yellow bg-card p-6 sm:p-8">
            {mission.type === 'checkpoint' ? (
              <Flag className="size-7 text-signal-coral" />
            ) : (
              <ShieldCheck className="size-7 text-emerald-700" />
            )}
            <h2 className="mt-5 text-xl font-black text-signal-navy">
              {mission.type === 'checkpoint'
                ? 'Tes tanpa latihan ulang wajib'
                : 'Checker kemiripan gerak'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {mission.type === 'checkpoint'
                ? 'Checkpoint menguji pengenalan dan pemilihan respons. Tanda yang lemah dapat diulang dari halaman review.'
                : 'Checker membandingkan landmark tanganmu dengan satu demonstrasi referensi. Hasil dipakai sebagai umpan balik latihan.'}
            </p>
            <div className="mt-6 flex gap-3 border-t border-signal-navy/10 pt-5 text-xs leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              Video referensi berasal dari WL-BISINDO variasi Banten. Ambang
              perlu divalidasi bersama komunitas Tuli sebelum penggunaan formal.
            </div>
          </aside>
        </section>

        {mission.type === 'lesson' ? (
          <section className="pb-10">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                Tahap 1 · Kenali
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-signal-navy">
                Amati setiap tanda sebelum menirukan.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Putar ulang video, perhatikan bentuk jari, arah telapak, posisi
                terhadap tubuh, dan titik akhir gerakan.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {missionSigns.map((sign) => (
                <article
                  key={sign.id}
                  className="overflow-hidden border border-signal-navy/10 bg-card"
                >
                  <video
                    src={versionedSignVideo(sign.videoSrc)}
                    aria-label={`Demonstrasi tanda ${sign.label}`}
                    className="aspect-video w-full bg-black object-cover"
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    controlsList="nodownload noplaybackrate"
                  />
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <h3 className="font-black text-signal-navy">
                        {sign.label}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {sign.focus}
                      </p>
                    </div>
                    <Link
                      href={`/missions/practice?mission=${mission.id}&sign=${sign.id}`}
                      className={cn(
                        buttonVariants({ size: 'sm' }),
                        'rounded-full bg-signal-navy px-4 font-extrabold text-white',
                      )}
                    >
                      Latih
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="pb-12">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                Alur misi
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-signal-navy">
                Bantuan berkurang pada setiap tahap.
              </h2>
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              Kenali → Tirukan → Uji → Konteks
            </p>
          </div>
          <MissionStageList missionId={mission.id} />
        </section>
      </div>
    </main>
  );
}
