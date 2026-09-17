'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { useProgress } from '@/hooks/use-progress';
import { getAlphabetVideosForMission, type AlphabetLetter } from '@/lib/alphabet-data';
import { allMissions, getMissionPosition, type Chapter, type Mission } from '@/lib/learning-data';
import { getMissionLearningState } from '@/lib/learning-progress';
import { recordMissionCompletion } from '@/lib/progress-storage';

const subscribeHydration = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export function AlphabetMission({ mission, chapter }: { mission: Mission; chapter: Chapter }) {
  const progress = useProgress();
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const learning = getMissionLearningState(mission, progress);
  const videos = getAlphabetVideosForMission(mission.id);
  const previousMission = allMissions[getMissionPosition(mission.id) - 1];
  const [watched, setWatched] = useState<Set<AlphabetLetter>>(() => new Set());
  const [unavailable, setUnavailable] = useState<Set<AlphabetLetter>>(() => new Set());
  const allWatched = videos.length > 0 && videos.every(({ letter }) => watched.has(letter));

  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <Link href="/missions" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-signal-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy">
          <ArrowLeft className="size-4" /> Kembali ke perjalanan
        </Link>

        <header className="mt-6 border-t-4 border-signal-teal bg-signal-navy px-6 py-8 text-white sm:px-9 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-signal-teal">
            Bab {chapter.number} · Misi {mission.number} · Materi alfabet
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Huruf {mission.title}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/75">
            Amati bentuk dan gerakan setiap huruf, lalu putar ulang untuk berlatih mengeja.
          </p>
          <p className="mt-4 text-sm font-bold text-signal-teal">
            {learning.missionComplete
              ? 'Misi selesai · dapat diulang kapan saja'
              : `${videos.length} video contoh · tanpa penilaian kamera`}
          </p>
        </header>

        {!ready ? (
          <p className="mt-7 border border-signal-navy/10 bg-card p-6 text-muted-foreground">Memuat progres misi…</p>
        ) : !learning.unlocked ? (
          <section className="mt-7 border border-signal-navy/10 bg-card p-6 sm:p-8">
            <LockKeyhole className="size-7 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-black text-signal-navy">Misi masih terkunci</h2>
            <p className="mt-2 text-muted-foreground">Selesaikan misi sebelumnya untuk membuka materi {mission.title}.</p>
            <Link href={previousMission?.href ?? '/missions'} className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy">
              Kembali ke misi sebelumnya <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-7 border border-signal-navy/10 bg-card p-6 sm:p-8" aria-labelledby="alphabet-material-title">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-signal-navy/10 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">Amati dan ulangi</p>
                  <h2 id="alphabet-material-title" className="mt-2 text-2xl font-black text-signal-navy sm:text-3xl">Huruf {mission.title}</h2>
                </div>
                <span aria-live="polite" className="text-sm font-bold text-muted-foreground">
                  {learning.missionComplete ? 'Materi telah selesai' : `${watched.size} dari ${videos.length} video ditonton`}
                </span>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Putar video sampai selesai untuk menandai huruf sebagai sudah diamati. Kamu bisa memutar ulang setiap contoh.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map(({ letter, videoSrc }) => (
                  <article key={letter} className="min-w-0 overflow-hidden border border-signal-navy/10 bg-background">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <h3 className="text-2xl font-black text-signal-navy">{letter}</h3>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        {watched.has(letter) ? <><Check className="size-4" /> Sudah ditonton</> : unavailable.has(letter) ? 'Video gagal dimuat' : 'Belum ditonton'}
                      </span>
                    </div>
                    <video
                      src={videoSrc}
                      aria-label={`Contoh gerakan huruf ${letter} dalam BISINDO`}
                      className="aspect-video w-full bg-black object-contain"
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      onEnded={() => setWatched((previous) => new Set(previous).add(letter))}
                      onError={() => setUnavailable((previous) => new Set(previous).add(letter))}
                    />
                  </article>
                ))}
              </div>
            </section>

            <nav aria-label="Navigasi misi alfabet" className="mt-7 flex flex-wrap items-center justify-between gap-4 border border-signal-navy/10 bg-card p-5 sm:p-6">
              <Link href={previousMission?.href ?? '/missions'} className="inline-flex items-center gap-2 text-sm font-bold text-signal-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy">
                <ArrowLeft className="size-4" /> Misi sebelumnya
              </Link>
              {learning.missionComplete ? (
                <Link href={learning.next.href} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-signal-teal px-6 py-2 font-black text-signal-navy hover:bg-signal-teal/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy">
                  {learning.next.label} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={!allWatched || unavailable.size > 0}
                  onClick={() => recordMissionCompletion(mission.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-signal-teal px-6 py-2 font-black text-signal-navy hover:bg-signal-teal/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Check className="size-4" /> Selesaikan materi
                </button>
              )}
            </nav>
            {!learning.missionComplete && !allWatched ? (
              <p className="mt-3 text-sm text-muted-foreground">Tonton seluruh {videos.length} contoh sebelum menyelesaikan misi.</p>
            ) : null}
            {unavailable.size > 0 ? (
              <p role="alert" className="mt-3 text-sm text-signal-coral">Ada video yang gagal dimuat. Periksa koneksi, lalu muat ulang halaman untuk mencoba lagi.</p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
