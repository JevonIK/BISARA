'use client';

import {
  ArrowRight,
  Check,
  Brain,
  LockKeyhole,
  Play,
  RefreshCw,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ProductionTest } from '@/components/production-test';
import { Badge } from '@/components/ui/badge';
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
  getMission,
} from '@/lib/learning-data';
import {
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
    }
  }
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<SignId | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

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

  if (!learning.unlocked)
    return (
      <Gate
        title="Misi masih terkunci"
        description="Selesaikan misi sebelumnya agar urutan belajar dan pengulangan materi tetap terjaga."
        href="/missions"
        action="Kembali ke perjalanan"
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
    const missedAnswers = answers.filter((answer) => !answer.correct);
    return (
      <div className="rounded-[2.5rem] bg-white p-7 sm:p-10 shadow-xs border border-amber-200/50">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <Badge
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-black',
                passed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800',
              )}
            >
              {passed ? 'Lulus' : 'Perlu diulang'}
            </Badge>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {correct} dari {questions.length} jawaban benar
            </h2>
            <p className="mt-2 text-sm sm:text-base font-semibold text-slate-600">
              {passed
                ? 'Uji pengenalan lulus! Lanjutkan ke Uji peragaan tanpa contoh untuk menyelesaikan misi.'
                : `Skor minimal adalah ${RECOGNITION_PASS_SCORE}. Tonton ulang tanda yang keliru lalu coba lagi.`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-5xl sm:text-6xl font-black text-slate-900 block">
              {score}
            </span>
            <span className="text-xs font-bold text-slate-500">
              dari 100 poin
            </span>
          </div>
        </div>

        {missedAnswers.length ? (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-wider text-slate-800">
              Tanda yang perlu diperkuat
            </p>
            <ul className="mt-3 space-y-2.5">
              {missedAnswers.map((answer) => (
                <li
                  key={answer.signId}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold"
                >
                  <span className="text-slate-600">
                    Jawabanmu{' '}
                    <strong className="text-slate-900">
                      {getSign(answer.selected).label}
                    </strong>
                    ; tanda yang benar{' '}
                    <strong className="text-emerald-700">
                      {getSign(answer.signId).label}
                    </strong>
                    .
                  </span>
                  <Link
                    href={`/missions/practice?mission=${mission.id}&sign=${answer.signId}`}
                    className="font-black text-amber-700 hover:text-amber-800 underline"
                  >
                    Latih ulang
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {passed ? (
            <Link
              href={`/missions/test?mission=${mission.id}&mode=recall`}
              onClick={() => {
                setView('recall');
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm sm:text-base font-black text-white hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
            >
              Lanjut ke Uji peragaan <ArrowRight className="size-4" />
            </Link>
          ) : null}
          <Button
            size="lg"
            onClick={() => {
              router.replace(
                `/missions/test?mission=${mission.id}&mode=recognition`,
              );
              startRecognition();
            }}
            className="rounded-full border-2 border-slate-200 bg-white font-black text-slate-800 hover:bg-slate-50 px-6 py-3.5 cursor-pointer"
          >
            <RefreshCw className="size-4" /> Ulangi tes
          </Button>
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
