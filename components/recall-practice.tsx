'use client';

import { ArrowRight, Brain, Check, Eye, Hand, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  getSign,
  type SignId,
  versionedSignVideo,
} from '@/lib/curriculum-data';
import { allMissions } from '@/lib/learning-data';
import {
  recordRecallAttempt,
  type RecallOutcome,
} from '@/lib/progress-storage';
import { cn } from '@/lib/utils';

const outcomeLabels: Record<RecallOutcome, string> = {
  independent: 'Ingat tanpa bantuan',
  assisted: 'Berlatih dengan bantuan',
  'needs-practice': 'Perlu diulang',
};

// The queue stays fixed for this session even as each answer updates progress.
export function RecallPractice({
  signIds,
  onExit,
}: {
  signIds: SignId[];
  onExit: () => void;
}) {
  const [queue] = useState(signIds);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'prompt' | 'compare' | 'saved'>('prompt');
  const [usedHelp, setUsedHelp] = useState(false);
  const [results, setResults] = useState<
    Array<{ id: SignId; outcome: RecallOutcome; due: string }>
  >([]);
  const savedRef = useRef(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);

  if (index >= queue.length)
    return (
      <section className="border border-signal-teal bg-signal-teal-soft p-6 sm:p-9">
        <Check className="size-9 text-emerald-700" />
        <h2 className="mt-4 text-3xl font-black text-signal-navy">
          Latihan mengingat selesai
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Catatanmu tersimpan. Tanda yang masih membutuhkan bantuan akan muncul
          lebih cepat dalam review.
        </p>
        <ul className="mt-6 divide-y divide-signal-navy/10">
          {results.map(({ id, outcome, due }) => (
            <li key={id} className="flex flex-wrap justify-between gap-2 py-4">
              <span className="font-black text-signal-navy">
                {getSign(id).label}
              </span>
              <span className="text-sm text-muted-foreground">
                {outcomeLabels[outcome]} · Review {due}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Hasil ini adalah penilaian mandiri setelah membandingkan contoh,
          terpisah dari skor checker.
        </p>
        <Button
          onClick={onExit}
          className="mt-6 rounded-full bg-signal-navy text-white"
        >
          Selesai <ArrowRight className="size-4" />
        </Button>
      </section>
    );

  const sign = getSign(queue[index]);
  const ownerMission = allMissions.find((mission) =>
    mission.signIds.includes(sign.id),
  )!;
  const save = (outcome: RecallOutcome) => {
    if (savedRef.current || !videoReady) return;
    savedRef.current = true;
    const honestOutcome =
      usedHelp && outcome === 'independent' ? 'assisted' : outcome;
    const updated = recordRecallAttempt(sign.id, honestOutcome);
    setResults((previous) => [
      ...previous,
      {
        id: sign.id,
        outcome: honestOutcome,
        due: updated.signMastery[sign.id].recall!.nextReviewAt,
      },
    ]);
    setPhase('saved');
  };
  const next = () => {
    setIndex((value) => value + 1);
    setPhase('prompt');
    setUsedHelp(false);
    setVideoReady(false);
    setVideoError(false);
    savedRef.current = false;
  };

  return (
    <section className="overflow-hidden border border-signal-navy/10 bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-signal-navy/10 p-5 text-sm font-bold">
        <span>
          Ingat & peragakan · {index + 1} dari {queue.length}
        </span>
        <Button variant="ghost" onClick={onExit}>
          Keluar latihan
        </Button>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="bg-signal-navy p-6 text-white sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
            Peragakan dari ingatan
          </p>
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">{sign.label}</h2>
          {phase === 'prompt' ? (
            <div className="mt-8 grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/25 p-6 text-center">
              <div>
                <Brain className="mx-auto size-12 text-signal-teal" />
                <p className="mt-5 font-bold">Contoh disembunyikan</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Coba gerakannya dengan tanganmu. Ambil waktu yang kamu
                  perlukan.
                </p>
              </div>
            </div>
          ) : (
            <>
              <video
                key={`${sign.id}:${videoAttempt}`}
                src={versionedSignVideo(sign.videoSrc)}
                aria-label={`Bandingkan tanda ${sign.label}`}
                className="mt-7 aspect-video w-full bg-black object-contain"
                autoPlay
                loop
                muted
                playsInline
                controls
                onLoadedData={() => setVideoReady(true)}
                onError={() => {
                  setVideoError(true);
                  setVideoReady(false);
                }}
              />
              {videoError ? (
                <div role="alert" className="mt-3 text-sm">
                  <p>
                    Contoh belum bisa dimuat. Muat ulang sebelum membandingkan.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 text-signal-navy"
                    onClick={() => {
                      setVideoError(false);
                      setVideoAttempt((value) => value + 1);
                    }}
                  >
                    Muat ulang contoh
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-9">
          {phase === 'prompt' ? (
            <>
              <Hand className="size-8 text-emerald-700" />
              <h3 className="mt-4 text-2xl font-black">
                Masih ingat gerakannya?
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Peragakan dulu tanpa contoh. Setelah itu, bandingkan bentuk
                jari, arah telapak, dan lintasannya. Latihan ini bisa dilakukan
                tanpa kamera.
              </p>
              <Button
                size="lg"
                onClick={() => setPhase('compare')}
                className="mt-7 h-auto whitespace-normal rounded-full bg-signal-teal py-3 font-bold text-signal-navy"
              >
                Sudah mencoba — bandingkan{' '}
                <ArrowRight className="size-4 shrink-0" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setUsedHelp(true);
                  setPhase('compare');
                }}
                className="mt-3 rounded-full"
              >
                <Eye className="size-4" /> Lihat bantuan
              </Button>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Bantuan boleh digunakan. Catatannya dibedakan dari mengingat
                mandiri, dan tidak mengunci misi.
              </p>
            </>
          ) : phase === 'compare' ? (
            <>
              <h3 className="text-2xl font-black">
                Bandingkan dengan gerakanmu
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {sign.note} Perhatikan juga bentuk jari dan arah telapak. Kamu
                boleh memutar ulang contoh.
              </p>
              <p className="mt-4 text-sm font-bold">
                {usedHelp
                  ? 'Kamu membuka bantuan sebelum mencoba mandiri.'
                  : 'Apakah gerakan yang kamu coba tadi sesuai contoh?'}
              </p>
              <Button
                disabled={!videoReady}
                size="lg"
                onClick={() => save(usedHelp ? 'assisted' : 'independent')}
                className="mt-6 h-auto whitespace-normal rounded-full bg-signal-teal py-3 text-signal-navy"
              >
                {usedHelp
                  ? 'Sudah berlatih dengan bantuan'
                  : 'Ya, ingat tanpa bantuan'}
              </Button>
              <Button
                disabled={!videoReady}
                size="lg"
                variant="outline"
                onClick={() => save('needs-practice')}
                className="mt-3 rounded-full"
              >
                Masih perlu latihan
              </Button>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Catatan ini berdasarkan perbandinganmu sendiri; tidak mengubah
                nilai atau kelulusan checker.
              </p>
            </>
          ) : (
            <div aria-live="polite">
              <Check className="size-8 text-emerald-700" />
              <h3 className="mt-4 text-2xl font-black">
                {outcomeLabels[results.at(-1)!.outcome]}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Tersimpan. Jadwal review berikutnya: {results.at(-1)!.due}.
              </p>
              <Button
                size="lg"
                onClick={next}
                className="mt-6 rounded-full bg-signal-navy text-white"
              >
                {index + 1 === queue.length
                  ? 'Lihat ringkasan'
                  : 'Tanda berikutnya'}{' '}
                <ArrowRight className="size-4" />
              </Button>
              <Link
                href={`/missions/practice?mission=${ownerMission.id}&sign=${sign.id}`}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'mt-3 w-full whitespace-normal',
                )}
              >
                <RotateCcw className="size-4" /> Latih ulang dengan contoh &
                kamera
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
