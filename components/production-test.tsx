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
      <section className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-xs border border-amber-200/50 text-center max-w-xl mx-auto space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <Check className="size-8 stroke-[2.5]" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Uji Peragaan Selesai!
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed">
            {signIds.length} tanda telah berhasil kamu peragakan di depan kamera tanpa contoh. Progresmu tersimpan!
          </p>
        </div>
        <Button
          onClick={onExit}
          className="h-12 w-full rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm flex items-center justify-center gap-2 shadow-xs"
        >
          Lihat Hasil Misi <ArrowRight className="size-4" />
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

  const progressPercent = Math.round((passedIds.length / signIds.length) * 100);

  return (
    <section className="space-y-6">
      <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 shadow-xs border border-amber-200/50">
        {/* Top Progress Bar matching recognition test */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-black tracking-wider text-slate-800 mb-2">
            <span>TANDA {passedIds.length + (activePassed ? 0 : 1)} DARI {signIds.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E54D2E] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#E54D2E] block mb-1">
              UJI PERAGAAN KAMERA
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Peragakan Tanda: <span className="text-[#00B4B0] underline decoration-[#00B4B0]/40">{sign.label}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Pikirkan gerakannya dulu. Aktifkan kamera dan tekan &ldquo;Mulai uji&rdquo; saat siap.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onExit}
            className="rounded-full border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Keluar uji
          </Button>
        </div>

        {/* Sign Stepper Pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          {signIds.map((id, index) => {
            const isCurrent = id === activeSignId;
            const isPassed = passedIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelectedSignId(id);
                  setLastResult(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-xs'
                    : isPassed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {isPassed ? <Check className="size-3 stroke-[3]" /> : <span>{index + 1}</span>}
                <span>{getSign(id).label}</span>
              </button>
            );
          })}
        </div>

        {progress.completedMissionIds.includes(missionId) && remainingIds.length > 0 ? (
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Misi ini sudah tercatat selesai sebelum uji peragaan memakai checker. Kamu dapat menguji ulang tanpa menghapus progres lama.
          </p>
        ) : null}
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <Check className="size-5 stroke-[3]" />
            </div>
            <p className="text-sm font-bold text-emerald-950">
              Hebat! Tanda <span className="font-black underline">{sign.label}</span> lulus uji tanpa contoh.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedSignId(nextSignId ?? null);
              setLastResult(null);
            }}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 h-auto flex items-center gap-2 shadow-xs"
          >
            {nextSignId
              ? `Lanjut ke ${getSign(nextSignId).label}`
              : 'Lihat ringkasan'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : result?.assessable && !result.passed ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-xs">
          <p className="max-w-xl text-xs sm:text-sm font-medium leading-relaxed text-amber-950">
            Tanda ini belum lulus. Coba lagi dengan tombol di hasil checker,
            atau pelajari ulang contohnya sebelum kembali ke uji.
          </p>
          <Link
            href={`/missions/practice?mission=${exampleMission?.id ?? missionId}&sign=${activeSignId}&source=production&returnMission=${missionId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-950 shadow-xs hover:bg-amber-100/50 transition-colors"
          >
            <RotateCcw className="size-3.5" /> Lihat contoh di Tirukan
          </Link>
        </div>
      ) : null}
    </section>
  );
}
