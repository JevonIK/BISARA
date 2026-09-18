'use client';

import {
  ArrowRight,
  Brain,
  Check,
  LockKeyhole,
  Play,
  RefreshCw,
  RotateCcw,
  Trophy,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ProductionTest } from '@/components/production-test';
import { Button } from '@/components/ui/button';
import { useProgress } from '@/hooks/use-progress';
import {
  getSign,
  versionedSignVideo,
  type SignId,
} from '@/lib/curriculum-data';
import {
  allMissions,
  buildRecognitionQuestions,
  chapters,
  getChapterForMission,
  getMission,
} from '@/lib/learning-data';
import {
  getMissionActiveStageHref,
  getMissionLearningState,
  getMissionReplayAction,
  RECOGNITION_PASS_SCORE,
} from '@/lib/learning-progress';
import { recordMissionRecognition } from '@/lib/progress-storage';
import { calculateScore, calculateStars } from '@/lib/scoring';
import { cn } from '@/lib/utils';

type View =
  | 'menu'
  | 'recognition'
  | 'recognition-result'
  | 'recall'
  | 'complete';
type Answer = { signId: SignId; selected: SignId; correct: boolean };

export function MissionAssessment({
  missionId,
  initialMode,
}: {
  missionId: string;
  initialMode?: string;
}) {
  const mission = getMission(missionId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamMode = searchParams.get('mode') ?? initialMode;
  const progress = useProgress();
  const learning = getMissionLearningState(mission, progress);
  const initialView: View = ['context', 'conversation', 'recall'].includes(
    searchParamMode ?? '',
  )
    ? 'recall'
    : ['result', 'recognition-result'].includes(searchParamMode ?? '')
      ? 'recognition-result'
      : searchParamMode === 'recognition' || searchParamMode === 'translation'
        ? 'recognition'
        : 'menu';
  const [recognitionAttempt, setRecognitionAttempt] = useState(0);
  const questions = useMemo(
    () => buildRecognitionQuestions(mission, recognitionAttempt),
    [mission, recognitionAttempt],
  );
  const [view, setView] = useState<View>(initialView);

  const [prevMode, setPrevMode] = useState(searchParamMode);
  if (prevMode !== searchParamMode) {
    setPrevMode(searchParamMode);
    if (['context', 'conversation', 'recall'].includes(searchParamMode ?? '')) {
      setView('recall');
    } else if (
      searchParamMode === 'recognition' ||
      searchParamMode === 'translation'
    ) {
      setView('recognition');
    } else if (
      ['result', 'recognition-result'].includes(searchParamMode ?? '')
    ) {
      setView('recognition-result');
    }
  }
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<SignId | null>(null);
  const [answers, setAnswers] = useState<Answer[]>(() => {
    if (searchParamMode === 'result' && searchParams.get('score') === '100') {
      return buildRecognitionQuestions(mission, 0).map((q) => ({
        signId: q.signId,
        selected: q.signId,
        correct: true,
      }));
    }
    return [];
  });

  const [typedText, setTypedText] = useState('');
  const [preferMultipleChoice, setPreferMultipleChoice] = useState(false);

  const startRecognition = () => {
    setRecognitionAttempt((value) => value + 1);
    setIndex(0);
    setSelected(null);
    setTypedText('');
    setPreferMultipleChoice(false);
    setAnswers([]);
    setView('recognition');
  };

  if (!learning.unlocked && searchParamMode !== 'result')
    return (
      <Gate
        title="Misi masih terkunci"
        description="Selesaikan misi sebelumnya agar urutan belajar dan pengulangan materi tetap terjaga."
        href="/"
        action="Kembali ke beranda"
      />
    );
  if (view === 'recognition' && !learning.practiceComplete)
    return (
      <Gate
        title="Selesaikan tahap Tirukan"
        description={`${learning.masteredSignCount} dari ${learning.missionSigns.length} tanda misi sudah lulus checker.`}
        href={learning.next.href}
        action={learning.next.label}
      />
    );
  if (view === 'recall' && !learning.recognitionComplete)
    return (
      <Gate
        title="Uji peragaan belum terbuka"
        description="Selesaikan Tirukan dan uji pengenalan terlebih dahulu sebelum mencoba tanda dari ingatan."
        href={learning.next.href}
        action={learning.next.label}
      />
    );
  if (view === 'recall')
    return (
      <ProductionTest
        missionId={mission.id}
        onExit={() => {
          router.replace(`/missions/test?mission=${mission.id}`);
          setView(learning.missionComplete ? 'complete' : 'menu');
        }}
      />
    );

  if (view === 'recognition') {
    const question = questions[index];
    const sign = getSign(question.signId);
    // Question 3 in a 5-question set tests translation by typing (matching uploaded_media_2_1789658260613.png)
    const isTyping = !preferMultipleChoice && (index + 1) === 3;
    const canSubmit = isTyping ? typedText.trim().length > 0 : Boolean(selected);

    const submit = () => {
      if (!canSubmit) return;
      const isCorrect = isTyping
        ? typedText.trim().toLowerCase() === sign.label.toLowerCase()
        : selected === question.signId;

      const recordedAnswerId = isTyping
        ? (question.options.find(
            (opt) =>
              getSign(opt).label.toLowerCase() ===
              typedText.trim().toLowerCase(),
          ) ?? (isCorrect ? question.signId : question.options[0]))
        : selected!;

      const nextAnswers = [
        ...answers,
        {
          signId: question.signId,
          selected: recordedAnswerId,
          correct: isCorrect,
        },
      ];
      if (index === questions.length - 1) {
        const score = calculateScore(
          nextAnswers.filter((answer) => answer.correct).length,
          questions.length,
        );
        recordMissionRecognition(mission.id, score, calculateStars(score));
        setAnswers(nextAnswers);
        setView('recognition-result');
      } else {
        setAnswers(nextAnswers);
        setIndex((value) => value + 1);
        setSelected(null);
        setTypedText('');
        setPreferMultipleChoice(false);
      }
    };

    const percentage = Math.round(((index + 1) / questions.length) * 100);

    return (
      <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 lg:p-10 shadow-xs border border-amber-200/50">
        {/* Top Progress Track */}
        <div className="mb-6 sm:mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span className="text-slate-900">
              Soal {index + 1} dari {questions.length}
            </span>
            <span className="text-slate-500">{percentage}%</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#E54D2E] transition-all duration-300"
              style={{
                width: `${((index + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 2-Column Question Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 sm:gap-10 items-start">
          {/* Left Column: Video */}
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
              {isTyping ? 'TERJEMAHKAN TANDA' : 'PERHATIKAN TANDA'}
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Apa arti tanda dalam video ini?
            </h2>
            <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black shadow-inner">
              <div className="absolute top-3.5 left-3.5 z-10 rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                WL-BISINDO • Banten
              </div>
              <video
                key={question.signId}
                src={versionedSignVideo(sign.videoSrc)}
                aria-label={`Video tanda soal ${index + 1}`}
                className="size-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          </div>

          {/* Right Column: Answers */}
          <div className="flex flex-col justify-between h-full pt-1">
            {isTyping ? (
              <div>
                <span className="text-sm sm:text-base font-black text-slate-900 block mb-3">
                  Ketik kata yang diisyaratkan dalam video
                </span>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSubmit) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Ketik kata di sini…"
                  className="w-full rounded-2xl border-2 border-slate-200 px-5 py-4 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none transition-colors bg-white shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setPreferMultipleChoice(true)}
                  className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Beralih ke pilihan ganda
                </button>
              </div>
            ) : (
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 block mb-4">
                  PILIH SATU JAWABAN
                </span>
                <div className="space-y-3" role="radiogroup">
                  {question.options.map((id, optionIndex) => {
                    const option = getSign(id);
                    const isSelected = selected === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => setSelected(id)}
                        className={cn(
                          'flex w-full items-center gap-4 rounded-2xl border-2 p-4 sm:p-5 text-left transition-all cursor-pointer select-none',
                          isSelected
                            ? 'border-slate-900 bg-slate-50/50 shadow-xs'
                            : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/30',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-8 sm:size-9 shrink-0 place-items-center rounded-full border text-xs sm:text-sm font-black transition-colors',
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700',
                          )}
                        >
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={cn(
                'mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all shadow-xs cursor-pointer',
                canSubmit
                  ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]'
                  : 'bg-[#7E858B] text-white cursor-not-allowed opacity-90',
              )}
            >
              {index === questions.length - 1
                ? 'Lihat hasil'
                : 'Periksa jawaban'}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'recognition-result') {
    const correct = answers.filter((answer) => answer.correct).length;
    const score = calculateScore(correct, questions.length);
    const passed = score >= RECOGNITION_PASS_SCORE;
    const isPerfect = correct === questions.length;
    const missedAnswers = answers.filter((answer) => !answer.correct);
    const stars = calculateStars(score);
    const bestScore = Math.max(score, progress.missionScores[mission.id] ?? 0);
    const isCheckpoint = mission.type === 'checkpoint';

    const currentChapter = getChapterForMission(mission.id);
    const currentChapterIdx = chapters.findIndex(
      (c) => c.id === currentChapter.id,
    );
    const nextChapter =
      currentChapterIdx >= 0 && currentChapterIdx + 1 < chapters.length
        ? chapters[currentChapterIdx + 1]
        : null;
    const nextChapterMission = nextChapter?.missions[0];
    const nextChapterHref = nextChapterMission
      ? getMissionActiveStageHref(nextChapterMission, progress)
      : '/';

    if (isPerfect) {
      return (
        <div className="rounded-[2.5rem] bg-white p-7 sm:p-10 lg:p-12 shadow-xs border border-amber-200/50">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 xl:gap-14 items-center">
            {/* Left: Score Card matching Image */}
            <div className="relative overflow-hidden rounded-[2.25rem] border-2 border-[#FCD561] bg-[#FFF9E6] p-7 sm:p-9 flex flex-col items-center justify-center text-center w-full max-w-[340px] mx-auto lg:max-w-none aspect-square shadow-xs">
              <ScoreDoodleBackground />

              <div className="relative z-10 flex flex-col items-center justify-center">
                {/* Yellow Trophy Circle */}
                <div className="grid size-18 sm:size-20 place-items-center rounded-full bg-[#FFAE00] text-slate-950 shadow-xs">
                  <Trophy className="size-9 sm:size-10 stroke-[2.3]" />
                </div>

                <span className="mt-3 text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                  HASIL TES
                </span>

                <span className="mt-1 text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 leading-none">
                  {score}
                </span>

                <CelebrationStars starCount={3} />
              </div>
            </div>

            {/* Right: Info, Question Pills & Action Buttons matching Image */}
            <div className="flex flex-col items-start justify-center">
              <span className="inline-flex items-center rounded-full bg-[#00BDCD] px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-black text-white shadow-2xs">
                {isCheckpoint ? 'Bab berikutnya terbuka!' : 'Tahap pengenalan lulus!'}
              </span>

              <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
                {correct} dari {questions.length} jawaban benar !
              </h2>

              <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 max-w-xl">
                Luar biasa. Kamu mengenali seluruh tanda dalam tes ini. Skor terbaik tersimpan adalah {bestScore}.
              </p>

              {/* Question Pills: 01, 02, 03, 04, 05 */}
              <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className="inline-flex min-w-[68px] sm:min-w-[76px] items-center justify-center rounded-full border-2 border-[#00BDCD] bg-white px-5 sm:px-6 py-2 text-sm font-black text-slate-900 shadow-2xs"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(
                      `/missions/test?mission=${mission.id}&mode=recognition`,
                    );
                    startRecognition();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="size-4 stroke-[2.5]" />
                  <span>Coba lagi</span>
                </button>

                {isCheckpoint ? (
                  <Link
                    href={nextChapterHref}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Lanjut Bab selanjutnya</span>
                    <ArrowRight className="size-4 stroke-[2.5]" />
                  </Link>
                ) : (
                  <Link
                    href={`/missions/test?mission=${mission.id}&mode=recall`}
                    onClick={() => setView('recall')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Lanjut ke Uji peragaan</span>
                    <ArrowRight className="size-4 stroke-[2.5]" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[2.5rem] bg-white p-7 sm:p-10 lg:p-12 shadow-xs border border-amber-200/50">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 xl:gap-14 items-start">
          {/* Left: Score Card */}
          <div className="relative overflow-hidden rounded-[2.25rem] border-2 border-[#FCD561] bg-[#FFF9E6] p-7 sm:p-9 flex flex-col items-center justify-center text-center w-full max-w-[340px] mx-auto lg:max-w-none aspect-square shadow-xs">
            <ScoreDoodleBackground />

            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="grid size-18 sm:size-20 place-items-center rounded-full bg-[#FFAE00] text-slate-950 shadow-xs">
                <Trophy className="size-9 sm:size-10 stroke-[2.3]" />
              </div>

              <span className="mt-3 text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                HASIL TES
              </span>

              <span className="mt-1 text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 leading-none">
                {score}
              </span>

              <CelebrationStars starCount={stars} />
            </div>
          </div>

          {/* Right: Info, Question status, Missed answers & Actions */}
          <div className="flex flex-col items-start justify-center">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-black text-white shadow-2xs',
                passed ? 'bg-[#00BDCD]' : 'bg-[#E54D2E]',
              )}
            >
              {passed ? 'Lulus' : 'Perlu diulang'}
            </span>

            <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
              {correct} dari {questions.length} jawaban benar
            </h2>

            <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 max-w-xl">
              {passed
                ? `Bagus! Kamu sudah mencapai skor kelulusan (${score}/100). Skor terbaik tersimpan adalah ${bestScore}.`
                : `Skor minimal kelulusan adalah ${RECOGNITION_PASS_SCORE}. Tonton ulang tanda yang keliru lalu coba lagi.`}
            </p>

            {/* Question Pills with red border on wrong ones */}
            <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
              {questions.map((_, i) => {
                const isCorrect = answers[i]?.correct;
                return (
                  <div
                    key={i}
                    className={cn(
                      'inline-flex min-w-[68px] sm:min-w-[76px] items-center justify-center rounded-full border-2 px-5 sm:px-6 py-2 text-sm font-black shadow-2xs',
                      isCorrect
                        ? 'border-[#00BDCD] bg-white text-slate-900'
                        : 'border-[#E54D2E] bg-[#FFF0ED] text-[#E54D2E]',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Missed answers list if any */}
            {missedAnswers.length > 0 && (
              <div className="mt-6 w-full rounded-2xl border border-amber-200/60 bg-[#FFFDF5] p-4 sm:p-5">
                <p className="text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                  Tanda yang perlu diperkuat :
                </p>
                <ul className="mt-2.5 space-y-2 text-xs sm:text-sm">
                  {missedAnswers.map((answer) => (
                    <li
                      key={answer.signId}
                      className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-700"
                    >
                      <span>
                        Jawabanmu:{' '}
                        <strong className="text-slate-900 font-bold">
                          {getSign(answer.selected).label}
                        </strong>{' '}
                        · Tanda benar:{' '}
                        <strong className="text-emerald-700 font-bold">
                          {getSign(answer.signId).label}
                        </strong>
                      </span>
                      <Link
                        href={`/missions/practice?mission=${mission.id}&sign=${answer.signId}`}
                        className="font-black text-amber-600 hover:text-amber-700 underline"
                      >
                        Latih ulang
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  router.replace(
                    `/missions/test?mission=${mission.id}&mode=recognition`,
                  );
                  startRecognition();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="size-4 stroke-[2.5]" />
                <span>Coba lagi</span>
              </button>

              {passed && (
                isCheckpoint ? (
                  <Link
                    href={nextChapterHref}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Lanjut Bab selanjutnya</span>
                    <ArrowRight className="size-4 stroke-[2.5]" />
                  </Link>
                ) : (
                  <Link
                    href={`/missions/test?mission=${mission.id}&mode=recall`}
                    onClick={() => setView('recall')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Lanjut ke Uji peragaan</span>
                    <ArrowRight className="size-4 stroke-[2.5]" />
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'complete' && learning.missionComplete) {
    const missionIndex = allMissions.findIndex(
      (item) => item.id === mission.id,
    );
    const nextMission =
      missionIndex >= 0
        ? missionIndex + 1 < allMissions.length
          ? allMissions[missionIndex + 1]
          : null
        : null;
    const replay = getMissionReplayAction(mission);
    return (
      <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-xs border border-amber-200/50 text-center">
        <div className="max-w-xl mx-auto">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
            <Check className="size-9" strokeWidth={3} />
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-wider text-[#E54D2E]">
            Misi selesai
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Target latihan “{mission.title}” selesai
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600">
            {mission.type === 'checkpoint'
              ? 'Uji pengenalan dan Uji peragaan'
              : 'Tirukan, uji pengenalan, dan Uji peragaan'}{' '}
            selesai. Kamu dapat melanjutkan ke misi berikutnya atau review
            berkala.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={nextMission?.href ?? '/review'}
              className="rounded-full bg-slate-900 px-7 py-3.5 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
            >
              {nextMission
                ? `Lanjut: ${nextMission.title}`
                : 'Mulai review adaptif'}{' '}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={replay.href}
              className="rounded-full border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-800 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <RefreshCw className="size-4" /> {replay.label}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <ModeCard
        icon={Video}
        eyebrow={mission.type === 'checkpoint' ? 'Tahap 2' : 'Tahap 3'}
        title="Uji pengenalan"
        description={`Kenali ${questions.length} tanda tanpa label. Nilai minimum ${RECOGNITION_PASS_SCORE}.`}
        meta={`${learning.recognitionScore}/100 skor terbaik`}
        onStart={startRecognition}
        locked={!learning.practiceComplete}
      />
      <ModeCard
        icon={Brain}
        eyebrow={mission.type === 'checkpoint' ? 'Tahap 3' : 'Tahap 4'}
        title="Uji peragaan"
        description="Lihat kata, lalu peragakan dengan kamera tanpa contoh. Setiap tanda perlu melewati checker; progres tersimpan per tanda."
        meta={`${learning.productionPassedCount}/${learning.productionSignCount} tanda lulus`}
        href={`/missions/test?mission=${mission.id}&mode=recall`}
        onStart={() => setView('recall')}
        locked={!learning.recognitionComplete}
      />
    </section>
  );
}


function ModeCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  onStart,
  href,
  locked,
}: {
  icon: typeof Play;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  onStart?: () => void;
  href?: string;
  locked: boolean;
}) {
  return (
    <article className="flex min-h-80 flex-col justify-between rounded-[2.5rem] bg-white p-7 sm:p-8 shadow-xs border border-amber-200/50">
      <div>
        <span className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-900">
          <Icon className="size-6" />
        </span>
        <p className="mt-6 text-xs font-black uppercase tracking-wider text-[#E54D2E]">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      </div>
      <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
        <span className="text-xs font-bold text-slate-500">{meta}</span>
        {href && !locked ? (
          <Link
            href={href}
            onClick={onStart}
            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-black text-white hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Play className="size-4" /> Mulai
          </Link>
        ) : (
          <Button
            onClick={onStart}
            disabled={locked}
            className={cn(
              'rounded-full px-6 py-2.5 text-sm font-black transition-all flex items-center gap-2',
              locked
                ? 'bg-slate-100 text-slate-400'
                : 'bg-slate-900 text-white hover:bg-slate-800',
            )}
          >
            {locked ? (
              <LockKeyhole className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {locked ? 'Terkunci' : 'Mulai'}
          </Button>
        )}
      </div>
    </article>
  );
}

function Gate({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <section className="grid min-h-[380px] place-items-center rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-xs border border-amber-200/50 text-center">
      <div className="max-w-xl">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-900">
          <LockKeyhole className="size-7" />
        </span>
        <h2 className="mt-5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-sm"
        >
          {action} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function ScoreDoodleBackground() {
  return (
    <svg
      className="absolute inset-0 size-full pointer-events-none select-none opacity-45"
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top left 8-point star */}
      <path
        d="M32 42L35 52L45 55L35 58L32 68L29 58L19 55L29 52L32 42Z"
        fill="#F6D572"
      />
      {/* Top right swirl */}
      <path
        d="M260 40C270 30 290 35 285 50C280 65 260 60 265 75C270 90 290 85 295 95"
        stroke="#F6D572"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Left squiggle */}
      <path
        d="M35 120C45 130 35 145 45 155C55 165 40 180 50 190"
        stroke="#F6D572"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Upper left spiral loop */}
      <path
        d="M90 60C70 40 50 65 75 80C100 95 105 50 85 45"
        stroke="#F6D572"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right ribbon */}
      <path
        d="M275 140L290 155L280 160L295 175L275 180"
        stroke="#F6D572"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom right hand thumb doodle */}
      <path
        d="M260 230C260 220 270 215 278 220C285 225 280 235 280 245C285 245 295 245 295 255C295 265 280 275 265 275"
        stroke="#F6D572"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bottom left swirl */}
      <path
        d="M40 250C30 260 50 280 70 265C85 250 65 235 55 245"
        stroke="#F6D572"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Sparkle circles */}
      <circle cx="95" cy="140" r="4" fill="#F6D572" />
      <circle cx="240" cy="115" r="3.5" fill="#F6D572" />
      <circle cx="65" cy="210" r="3.5" fill="#F6D572" />
      <circle cx="230" cy="210" r="4.5" fill="#F6D572" />
      {/* Floating little stars */}
      <path
        d="M225 65L227 71L233 73L227 75L225 81L223 75L217 73L223 71L225 65Z"
        fill="#F6D572"
      />
      <path
        d="M80 275L82 280L87 282L82 284L80 289L78 284L73 282L78 280L80 275Z"
        fill="#F6D572"
      />
    </svg>
  );
}

function CelebrationStars({ starCount = 3 }: { starCount?: number }) {
  return (
    <div className="mt-2.5 flex items-center justify-center gap-1.5" aria-label={`${starCount} dari 3 bintang`}>
      {/* Left Star */}
      <div className="relative -rotate-[12deg] translate-x-1 transition-transform">
        <svg
          className="size-9 sm:size-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.14)]"
          viewBox="0 0 24 24"
        >
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={starCount >= 1 ? '#FFAE00' : '#D1D5DB'}
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Middle Star (Larger & Raised) */}
      <div className="relative -translate-y-2 z-10 transition-transform">
        <svg
          className="size-11 sm:size-13 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.18)]"
          viewBox="0 0 24 24"
        >
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={starCount >= 2 ? '#FFAE00' : '#D1D5DB'}
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Right Star */}
      <div className="relative rotate-[12deg] -translate-x-1 transition-transform">
        <svg
          className="size-9 sm:size-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.14)]"
          viewBox="0 0 24 24"
        >
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={starCount >= 3 ? '#FFAE00' : '#D1D5DB'}
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
