'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Flag,
  LockKeyhole,
  Play,
  RefreshCw,
  Trophy,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { useProgress } from '@/hooks/use-progress';
import {
  getSign,
  signs,
  versionedSignVideo,
  type SignId,
} from '@/lib/curriculum-data';
import { allMissions, getMission, type Mission } from '@/lib/learning-data';
import {
  getMissionLearningState,
  RECOGNITION_PASS_SCORE,
} from '@/lib/learning-progress';
import {
  recordMissionCompletion,
  recordMissionRecognition,
} from '@/lib/progress-storage';
import { calculateScore, calculateStars } from '@/lib/scoring';
import { cn } from '@/lib/utils';

type View =
  | 'menu'
  | 'recognition'
  | 'recognition-result'
  | 'context'
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
  const progress = useProgress();
  const learning = getMissionLearningState(mission, progress);
  const initialView: View =
    initialMode === 'context'
      ? 'context'
      : initialMode === 'recognition' || initialMode === 'translation'
        ? 'recognition'
        : 'menu';
  const questions = useMemo(() => buildQuestions(mission), [mission]);
  const [view, setView] = useState<View>(initialView);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<SignId | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [contextIndex, setContextIndex] = useState(0);
  const [contextChoice, setContextChoice] = useState<SignId | null>(null);
  const [contextCorrect, setContextCorrect] = useState(false);

  const startRecognition = () => {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setView('recognition');
  };
  const startContext = () => {
    setContextIndex(0);
    setContextChoice(null);
    setContextCorrect(false);
    setView('context');
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
  if (view === 'context' && !learning.recognitionComplete)
    return (
      <Gate
        title="Uji pengenalan belum lulus"
        description={`Capai minimal ${RECOGNITION_PASS_SCORE} poin sebelum latihan konteks dibuka.`}
        href={`/missions/test?mission=${mission.id}&mode=recognition`}
        action="Mulai uji pengenalan"
      />
    );

  if (view === 'recognition') {
    const question = questions[index];
    const submit = () => {
      if (!selected) return;
      const nextAnswers = [
        ...answers,
        {
          signId: question.signId,
          selected,
          correct: selected === question.signId,
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
      }
    };
    return (
      <section className="border border-signal-navy/10 bg-card">
        <TopBar
          label="Uji pengenalan"
          current={index + 1}
          total={questions.length}
          onBack={() => setView('menu')}
        />
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-signal-navy p-5 sm:p-8">
            <div className="mb-4 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
                  Tanpa label
                </p>
                <h2 className="mt-1 text-xl font-black">Apa arti tanda ini?</h2>
              </div>
              <Video className="size-5 text-white/60" />
            </div>
            <AssessmentVideo
              src={getSign(question.signId).videoSrc}
              label={`Soal ${index + 1}`}
            />
          </div>
          <div className="flex min-h-[470px] flex-col justify-between p-6 sm:p-8">
            <div className="grid gap-3" role="radiogroup">
              {question.options.map((id, optionIndex) => {
                const option = getSign(id);
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex min-h-16 cursor-pointer items-center gap-4 border p-4 text-sm font-extrabold',
                      selected === id
                        ? 'border-signal-teal bg-signal-teal-soft'
                        : 'border-signal-navy/10 hover:border-signal-teal',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={selected === id}
                      onChange={() => setSelected(id)}
                    />
                    <span className="grid size-8 place-items-center rounded-full border border-signal-navy/15 text-xs">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option.label}
                  </label>
                );
              })}
            </div>
            <div className="mt-7">
              <p className="mb-4 flex gap-2 text-xs text-muted-foreground">
                <CircleAlert className="size-4" />
                Jawaban dibahas setelah semua soal selesai.
              </p>
              <Button
                size="lg"
                disabled={!selected}
                onClick={submit}
                className="w-full rounded-full bg-signal-navy font-extrabold text-white"
              >
                {index === questions.length - 1
                  ? 'Lihat hasil'
                  : 'Simpan & lanjut'}{' '}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (view === 'recognition-result') {
    const correct = answers.filter((answer) => answer.correct).length;
    const score = calculateScore(correct, questions.length);
    const passed = score >= RECOGNITION_PASS_SCORE;
    return (
      <section className="grid overflow-hidden border border-signal-navy/10 bg-card lg:grid-cols-[330px_1fr]">
        <div className="grid place-items-center bg-signal-navy p-8 text-center text-white">
          <div>
            <Trophy className="mx-auto size-10 text-signal-teal" />
            <p className="mt-5 text-7xl font-black">{score}</p>
            <p className="text-sm text-white/55">dari 100 poin</p>
          </div>
        </div>
        <div className="p-7 sm:p-10">
          <Badge
            className={
              passed
                ? 'bg-signal-teal-soft text-emerald-800'
                : 'bg-signal-coral/10 text-red-800'
            }
          >
            {passed ? 'Lulus' : 'Perlu diulang'}
          </Badge>
          <h2 className="mt-4 text-3xl font-black text-signal-navy">
            {correct} dari {questions.length} jawaban benar
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {passed
              ? 'Pengenalan tanda sudah stabil. Lanjutkan ke penggunaan dalam konteks.'
              : `Skor minimal adalah ${RECOGNITION_PASS_SCORE}. Tonton ulang tanda yang keliru lalu coba lagi.`}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {passed ? (
              <Button
                size="lg"
                onClick={startContext}
                className="rounded-full bg-signal-teal font-extrabold text-signal-navy"
              >
                Lanjut ke konteks <ArrowRight className="size-4" />
              </Button>
            ) : null}
            <Button
              size="lg"
              onClick={startRecognition}
              className="rounded-full bg-signal-navy font-extrabold text-white"
            >
              <RefreshCw className="size-4" /> Ulangi tes
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (view === 'context') {
    const challenge = mission.contextChallenges[contextIndex];
    const choose = (id: SignId) => {
      setContextChoice(id);
      setContextCorrect(id === challenge.answer);
    };
    const next = () => {
      if (!contextCorrect) return;
      if (contextIndex === mission.contextChallenges.length - 1) {
        recordMissionCompletion(mission.id);
        setView('complete');
      } else {
        setContextIndex((value) => value + 1);
        setContextChoice(null);
        setContextCorrect(false);
      }
    };
    return (
      <section className="border border-signal-navy/10 bg-card">
        <TopBar
          label="Pahami konteks"
          current={contextIndex + 1}
          total={mission.contextChallenges.length}
          onBack={() => setView('menu')}
        />
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-signal-navy p-5 sm:p-8">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
              Petunjuk dari lawan bicara
            </p>
            <AssessmentVideo
              src={getSign(challenge.cueSignId).videoSrc}
              label={`Konteks ${contextIndex + 1}`}
            />
          </div>
          <div className="flex min-h-[490px] flex-col justify-between p-6 sm:p-8">
            <div>
              <Badge className="bg-signal-yellow/30 text-amber-900">
                Situasi {contextIndex + 1}
              </Badge>
              <h2 className="mt-4 text-2xl font-black text-signal-navy">
                Bagaimana kamu merespons?
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {challenge.prompt}
              </p>
              <div className="mt-6 grid gap-3">
                {challenge.options.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choose(id)}
                    className={cn(
                      'min-h-16 border p-4 text-left text-sm font-extrabold',
                      contextChoice === id &&
                        (contextCorrect
                          ? 'border-signal-teal bg-signal-teal-soft'
                          : 'border-signal-coral bg-signal-coral/10'),
                    )}
                  >
                    {getSign(id).label}
                  </button>
                ))}
              </div>
              {contextChoice ? (
                <p
                  className={cn(
                    'mt-4 text-sm font-bold',
                    contextCorrect ? 'text-emerald-700' : 'text-signal-coral',
                  )}
                >
                  {contextCorrect
                    ? challenge.successMessage
                    : 'Respons itu belum sesuai. Perhatikan situasinya lalu pilih lagi.'}
                </p>
              ) : null}
            </div>
            <Button
              size="lg"
              disabled={!contextCorrect}
              onClick={next}
              className="mt-7 w-full rounded-full bg-signal-navy font-extrabold text-white"
            >
              {contextIndex === mission.contextChallenges.length - 1
                ? 'Selesaikan misi'
                : 'Lanjutkan situasi'}{' '}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (view === 'complete') {
    const missionIndex = allMissions.findIndex(
      (item) => item.id === mission.id,
    );
    const nextMission =
      missionIndex >= 0
        ? missionIndex + 1 < allMissions.length
          ? allMissions[missionIndex + 1]
          : null
        : null;
    return (
      <section className="grid min-h-[460px] place-items-center border border-signal-teal bg-signal-teal-soft p-8 text-center">
        <div className="max-w-xl">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-signal-teal">
            <Check className="size-9" strokeWidth={3} />
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Misi selesai
          </p>
          <h2 className="mt-3 text-4xl font-black text-signal-navy">
            {mission.title} dikuasai
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Progres, skor pengenalan, dan latihan konteks sudah disimpan.
          </p>
          <Link
            href={nextMission?.href ?? '/review'}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-7 rounded-full bg-signal-navy px-6 font-extrabold text-white',
            )}
          >
            {nextMission
              ? `Lanjut: ${nextMission.title}`
              : 'Mulai review adaptif'}{' '}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <ModeCard
        icon={Video}
        eyebrow="Tahap 3"
        title="Uji pengenalan"
        description={`Kenali ${questions.length} tanda tanpa label. Nilai minimum ${RECOGNITION_PASS_SCORE}.`}
        meta={`${learning.recognitionScore}/100 skor terbaik`}
        onStart={startRecognition}
        locked={!learning.practiceComplete}
      />
      <ModeCard
        icon={Flag}
        eyebrow="Tahap 4"
        title={mission.contextTitle}
        description="Pilih respons yang sesuai untuk menyelesaikan situasi bercabang."
        meta={`${mission.contextChallenges.length} situasi`}
        onStart={startContext}
        locked={!learning.recognitionComplete}
      />
    </section>
  );
}

function buildQuestions(mission: Mission) {
  const ids =
    mission.type === 'checkpoint' && mission.signIds.length > 7
      ? mission.signIds
          .filter(
            (_, index) => index % Math.ceil(mission.signIds.length / 6) === 0,
          )
          .slice(0, 6)
      : mission.signIds;
  return ids.map((signId, index) => {
    const pool = [
      ...new Set([...mission.signIds, ...signs.map((sign) => sign.id)]),
    ].filter((id) => id !== signId);
    const options = [
      signId,
      pool[(index * 3) % pool.length],
      pool[(index * 3 + 5) % pool.length],
    ] as SignId[];
    return {
      signId,
      options:
        index % 3 === 0
          ? options
          : index % 3 === 1
            ? [options[1], options[0], options[2]]
            : [options[2], options[1], options[0]],
    };
  });
}

function AssessmentVideo({ src, label }: { src: string; label: string }) {
  return (
    <video
      src={versionedSignVideo(src)}
      aria-label={label}
      className="aspect-video w-full bg-black object-cover"
      autoPlay
      loop
      muted
      playsInline
      controls
      controlsList="nodownload noplaybackrate"
    />
  );
}

function TopBar({
  label,
  current,
  total,
  onBack,
}: {
  label: string;
  current: number;
  total: number;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-5 border-b border-signal-navy/10 p-5">
      <button type="button" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="size-5" />
      </button>
      <div className="flex-1">
        <div className="mb-2 flex justify-between text-xs font-bold text-signal-navy">
          <span>
            {label} · {current} dari {total}
          </span>
          <span>{Math.round((current / total) * 100)}%</span>
        </div>
        <Progress value={(current / total) * 100}>
          <ProgressLabel className="sr-only">Progres</ProgressLabel>
        </Progress>
      </div>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  onStart,
  locked,
}: {
  icon: typeof Play;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  onStart: () => void;
  locked: boolean;
}) {
  return (
    <article className="flex min-h-80 flex-col justify-between border-t-4 border-signal-teal bg-card p-7">
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-signal-teal-soft text-emerald-800">
          <Icon className="size-6" />
        </span>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black text-signal-navy">{title}</h2>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-7 flex items-center justify-between border-t border-signal-navy/10 pt-5">
        <span className="text-xs font-bold text-muted-foreground">{meta}</span>
        <Button
          onClick={onStart}
          disabled={locked}
          className="rounded-full bg-signal-navy font-extrabold text-white"
        >
          {locked ? (
            <LockKeyhole className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
          {locked ? 'Terkunci' : 'Mulai'}
        </Button>
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
    <section className="grid min-h-[420px] place-items-center border border-signal-navy/10 bg-card p-8 text-center">
      <div className="max-w-xl">
        <LockKeyhole className="mx-auto size-10 text-amber-700" />
        <h2 className="mt-5 text-3xl font-black text-signal-navy">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <Link
          href={href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-7 rounded-full bg-signal-navy px-6 font-extrabold text-white',
          )}
        >
          {action} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
