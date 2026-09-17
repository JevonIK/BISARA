'use client';

import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CameraPractice } from '@/components/camera-practice';
import { Button } from '@/components/ui/button';
import {
  getSign,
  versionedSignVideo,
  type SignId,
} from '@/lib/curriculum-data';
import type { GestureScore } from '@/lib/gesture-scoring';
import { allMissions } from '@/lib/learning-data';
import {
  getProductionTestSignIds,
  hasPassedProductionTest,
  recordProductionAssessment,
} from '@/lib/progress-storage';
import { useProgress } from '@/hooks/use-progress';

export function ProductionTest({
  missionId,
  onExit,
}: {
  missionId: string;
  onExit: () => void;
}) {
  const progress = useProgress();
  const signIds = getProductionTestSignIds(missionId);
  const passedIds = signIds.filter((id) =>
    hasPassedProductionTest(progress, missionId, id),
  );
  const remainingIds = signIds.filter((id) => !passedIds.includes(id));
  const [selectedSignId, setSelectedSignId] = useState<SignId | null>(null);
  const [lastResult, setLastResult] = useState<{
    signId: SignId;
    score: GestureScore;
  } | null>(null);
  const activeSignId = selectedSignId ?? remainingIds[0];

  if (!activeSignId) {
    return (
      <section className="border border-signal-teal bg-signal-teal-soft p-7 sm:p-10">
        <Check className="size-10 text-emerald-700" />
        <h2 className="mt-4 text-3xl font-black text-signal-navy">
          Uji peragaan selesai
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {signIds.length} tanda telah melewati checker tanpa contoh. Progres
          tersimpan, dan misi berikutnya kini terbuka.
        </p>
        <Button
          onClick={onExit}
          className="mt-7 rounded-full bg-signal-navy text-white"
        >
          Lihat hasil misi <ArrowRight className="size-4" />
        </Button>
      </section>
    );
  }

  const sign = getSign(activeSignId);
  const exampleMission = allMissions.find(
    (item) => item.type === 'lesson' && item.signIds.includes(activeSignId),
  );
  const activePassed = passedIds.includes(activeSignId);
  const result = lastResult?.signId === activeSignId ? lastResult.score : null;
  const nextSignId = remainingIds.find((id) => id !== activeSignId);
  const handleResult = (score: GestureScore) => {
    setSelectedSignId(activeSignId);
    setLastResult({ signId: activeSignId, score });
    recordProductionAssessment(missionId, activeSignId, score);
  };

  return (
    <section className="space-y-5">
      <div className="border border-signal-navy/10 bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              Uji peragaan tanpa contoh
            </p>
            <h2 className="mt-2 text-2xl font-black text-signal-navy">
              {passedIds.length} dari {signIds.length} tanda lulus
            </h2>
          </div>
          <Button variant="outline" onClick={onExit} className="rounded-full">
            Keluar uji
          </Button>
        </div>
        <progress
          className="mt-5 h-2 w-full accent-signal-teal"
          value={passedIds.length}
          max={signIds.length}
          aria-label="Tanda uji peragaan yang lulus"
        />
        <ol className="mt-5 flex flex-wrap gap-2">
          {signIds.map((id, index) => (
            <li
              key={id}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${id === activeSignId ? 'border-signal-yellow bg-signal-yellow/20 text-signal-navy' : passedIds.includes(id) ? 'border-signal-teal bg-signal-teal-soft text-signal-navy' : 'border-signal-navy/10 text-muted-foreground'}`}
            >
              {passedIds.includes(id) ? '✓' : index + 1} · {getSign(id).label}
            </li>
          ))}
        </ol>
        {progress.completedMissionIds.includes(missionId) &&
        remainingIds.length > 0 ? (
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Misi ini sudah tercatat selesai sebelum uji peragaan memakai
            checker. Kamu dapat menguji ulang tanpa menghapus progres lama.
          </p>
        ) : null}
        <div className="mt-5 border-t border-signal-navy/10 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-coral">
            Kata yang harus diperagakan
          </p>
          <h3 className="mt-2 text-4xl font-black text-signal-navy">
            {sign.label}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Pikirkan gerakannya dulu. Aktifkan kamera dan tekan “Mulai uji” saat
            siap. Contoh tetap tersembunyi selama pengambilan gerakan.
          </p>
        </div>
      </div>

      <CameraPractice
        key={activeSignId}
        signId={activeSignId}
        signLabel={sign.label}
        referenceVideoUrl={versionedSignVideo(sign.videoSrc)}
        missionId={missionId}
        missionSignIds={signIds}
        productionMode
        onProductionResult={handleResult}
      />

      {activePassed ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-signal-teal bg-signal-teal-soft p-5">
          <p className="font-black text-signal-navy">
            <Check className="mr-2 inline size-5" /> Tanda {sign.label} lulus
            tanpa contoh.
          </p>
          <Button
            onClick={() => {
              setSelectedSignId(nextSignId ?? null);
              setLastResult(null);
            }}
            className="rounded-full bg-signal-navy text-white"
          >
            {nextSignId
              ? `Lanjut ke ${getSign(nextSignId).label}`
              : 'Lihat ringkasan'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : result?.assessable && !result.passed ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-signal-yellow bg-signal-yellow/10 p-5">
          <p className="max-w-xl text-sm leading-6 text-signal-navy">
            Tanda ini belum lulus. Coba lagi dengan tombol di hasil checker,
            atau pelajari ulang contohnya sebelum kembali ke uji.
          </p>
          <Link
            href={`/missions/practice?mission=${exampleMission?.id ?? missionId}&sign=${activeSignId}&source=production&returnMission=${missionId}`}
            className="inline-flex items-center gap-2 rounded-full border border-signal-navy/15 px-4 py-2 text-sm font-bold text-signal-navy"
          >
            <RotateCcw className="size-4" /> Lihat contoh di Tirukan
          </Link>
        </div>
      ) : null}
    </section>
  );
}
