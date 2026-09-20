'use client';

import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  recordMissionCompletion,
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

  useEffect(() => {
    if (!activeSignId && signIds.length > 0) {
      recordMissionCompletion(missionId);
    }
  }, [activeSignId, missionId, signIds.length]);

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
          onClick={() => {
            recordMissionCompletion(missionId);
            onExit();
          }}
          className="h-12 w-full rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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

  const currentIndex = signIds.indexOf(activeSignId);
  const questionNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
  const progressPercent = Math.round((questionNumber / signIds.length) * 100);

  return (
    <section className="space-y-6">
      <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 lg:p-10 shadow-xs border border-amber-200/50">
        {/* Top Progress Track matching reference */}
        <div className="mb-6 sm:mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span className="text-slate-900">
              Soal {questionNumber} dari {signIds.length}
            </span>
            <span className="text-slate-500">{progressPercent}%</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#E54D2E] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Heading matching reference */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
              TIRUKAN TANDA
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
              Tunjukkan isyarat untuk kata: <span className="text-slate-900">{sign.label}</span>
            </h2>
          </div>
          <Button
            variant="outline"
            onClick={onExit}
            className="rounded-full border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Keluar uji
          </Button>
        </div>

        {/* Camera Practice with Calibration Card */}
        <div className="mt-6 sm:mt-8">
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
        </div>

        {/* Sign Stepper Quick Jump */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
          <span className="text-xs font-bold text-slate-400 mr-1">Daftar tanda:</span>
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
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
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

        {/* Result Action Banner */}
        {activePassed ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-xs">
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
                ? `Lanjut ke soal berikutnya →`
                : 'Lihat ringkasan'}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : result?.assessable && !result.passed ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-xs">
            <p className="max-w-xl text-xs sm:text-sm font-medium leading-relaxed text-amber-950">
              Tanda ini belum lulus. Coba lagi dengan tombol di hasil checker,
              atau pelajari ulang contohnya sebelum kembali ke uji.
            </p>
            <Link
              href={`/missions/practice?mission=${exampleMission?.id ?? missionId}&sign=${activeSignId}&source=production&returnMission=${missionId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-950 shadow-xs hover:bg-amber-100/50 transition-colors"
            >
              <RotateCcw className="size-3.5" /> Pelajari ulang di Tirukan
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
