'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Flag,
  Hand,
  Keyboard,
  MessageCircleMore,
  Play,
  RefreshCw,
  Star,
  Trophy,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import {
  conversationTurns,
  translationQuestions,
} from '@/lib/chapter-test-data';
import {
  calculateScore,
  calculateStars,
  resultMessage,
  type StarRating,
} from '@/lib/scoring';
import {
  recordConversationCompletion,
  recordTranslationTest,
} from '@/lib/progress-storage';
import { cn } from '@/lib/utils';

type TestView =
  | 'menu'
  | 'translation'
  | 'translation-result'
  | 'conversation'
  | 'conversation-result';

type TranslationAnswer = {
  questionId: string;
  selected: string;
  expected: string;
  correct: boolean;
};

type ChapterTestProps = {
  initialView?: Extract<TestView, 'menu' | 'conversation'>;
};

export function ChapterTest({ initialView = 'menu' }: ChapterTestProps) {
  const [view, setView] = useState<TestView>(initialView);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState<TranslationAnswer[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [conversationChoice, setConversationChoice] = useState('');
  const [conversationFeedback, setConversationFeedback] = useState('');
  const [conversationPassed, setConversationPassed] = useState(false);

  const startTranslationTest = () => {
    setQuestionIndex(0);
    setSelectedAnswer('');
    setAnswers([]);
    setView('translation');
  };

  const submitTranslationAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = translationQuestions[questionIndex];
    const nextAnswers = [
      ...answers,
      {
        questionId: currentQuestion.id,
        selected: selectedAnswer,
        expected: currentQuestion.answer,
        correct: selectedAnswer === currentQuestion.answer,
      },
    ];

    if (questionIndex === translationQuestions.length - 1) {
      const correctCount = nextAnswers.filter(
        (answer) => answer.correct,
      ).length;
      const score = calculateScore(correctCount, translationQuestions.length);
      const stars = calculateStars(score);
      const updatedProgress = recordTranslationTest(score, stars);
      setAnswers(nextAnswers);
      setBestScore(updatedProgress.bestChapterScore);
      setView('translation-result');
      return;
    }

    setAnswers(nextAnswers);
    setQuestionIndex((previous) => previous + 1);
    setSelectedAnswer('');
  };

  const startConversation = () => {
    setConversationIndex(0);
    setConversationChoice('');
    setConversationFeedback('');
    setConversationPassed(false);
    setView('conversation');
  };

  const chooseConversationResponse = (choice: string) => {
    const turn = conversationTurns[conversationIndex];
    const correct = choice === turn.correctAnswer;
    setConversationChoice(choice);
    setConversationPassed(correct);
    setConversationFeedback(correct ? turn.successMessage : turn.retryMessage);
  };

  const continueConversation = () => {
    if (!conversationPassed) return;

    if (conversationIndex === conversationTurns.length - 1) {
      recordConversationCompletion();
      setView('conversation-result');
      return;
    }

    setConversationIndex((previous) => previous + 1);
    setConversationChoice('');
    setConversationFeedback('');
    setConversationPassed(false);
  };

  if (view === 'translation') {
    const question = translationQuestions[questionIndex];
    const progress = ((questionIndex + 1) / translationQuestions.length) * 100;

    return (
      <section className="border border-signal-navy/10 bg-card">
        <TestTopBar
          label="Tes arti tanda"
          progress={progress}
          progressLabel={`Soal ${questionIndex + 1} dari ${translationQuestions.length}`}
          onBack={() => setView('menu')}
        />

        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="bg-signal-navy p-5 sm:p-8">
            <div className="mb-4 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
                  Perhatikan tanda
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Apa arti tanda dalam video ini?
                </h2>
              </div>
              <Badge
                variant="outline"
                className="border-white/15 text-white/65"
              >
                <Video className="size-3" /> Tanpa petunjuk
              </Badge>
            </div>
            <TestVideo
              key={question.id}
              src={question.videoSrc}
              label={`Video soal ${questionIndex + 1}`}
            />
          </div>

          <div className="flex min-h-[480px] flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Pilih satu jawaban
              </p>
              <div className="mt-5 grid gap-3" role="radiogroup">
                {question.options.map((option, index) => (
                  <label
                    key={option}
                    className={cn(
                      'flex min-h-16 cursor-pointer items-center gap-4 border p-4 text-left text-sm font-extrabold outline-none transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring',
                      selectedAnswer === option
                        ? 'border-signal-teal bg-signal-teal-soft text-signal-navy'
                        : 'border-signal-navy/10 bg-background text-signal-navy hover:border-signal-teal',
                    )}
                  >
                    <input
                      type="radio"
                      name={`answer-${question.id}`}
                      value={option}
                      checked={selectedAnswer === option}
                      onChange={() => setSelectedAnswer(option)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full border text-xs',
                        selectedAnswer === option
                          ? 'border-signal-teal bg-signal-teal'
                          : 'border-signal-navy/15',
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="mb-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                Jawaban benar tidak ditampilkan sampai seluruh tes selesai.
              </p>
              <Button
                type="button"
                size="lg"
                disabled={!selectedAnswer}
                onClick={submitTranslationAnswer}
                className="h-12 w-full rounded-full bg-signal-navy px-5 font-extrabold text-white"
              >
                {questionIndex === translationQuestions.length - 1
                  ? 'Lihat hasil tes'
                  : 'Simpan & lanjut'}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (view === 'translation-result') {
    const correctCount = answers.filter((answer) => answer.correct).length;
    const score = calculateScore(correctCount, translationQuestions.length);
    const stars = calculateStars(score);

    return (
      <TranslationResult
        answers={answers}
        score={score}
        stars={stars}
        bestScore={bestScore}
        onRetry={startTranslationTest}
        onMenu={() => setView('menu')}
      />
    );
  }

  if (view === 'conversation') {
    const turn = conversationTurns[conversationIndex];
    const progress = ((conversationIndex + 1) / conversationTurns.length) * 100;

    return (
      <section className="border border-signal-navy/10 bg-card">
        <TestTopBar
          label="Simulasi percakapan"
          progress={progress}
          progressLabel={`Giliran ${conversationIndex + 1} dari ${conversationTurns.length}`}
          onBack={() => setView('menu')}
        />

        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="bg-signal-navy p-5 sm:p-8">
            <div className="mb-4 flex items-center gap-3 text-white">
              <span className="grid size-10 place-items-center rounded-full bg-signal-coral font-black text-signal-navy">
                T
              </span>
              <div>
                <p className="text-xs font-bold text-white/50">
                  {turn.speaker}
                </p>
                <p className="text-sm font-black">
                  Sedang berkomunikasi denganmu
                </p>
              </div>
            </div>
            <TestVideo
              key={turn.id}
              src={turn.videoSrc}
              label={`Giliran percakapan ${conversationIndex + 1}`}
            />
          </div>

          <div className="flex min-h-[500px] flex-col justify-between p-6 sm:p-8">
            <div>
              <Badge className="bg-signal-yellow/35 text-amber-900">
                Cabang {conversationIndex + 1}
              </Badge>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.035em] text-signal-navy">
                Bagaimana kamu merespons?
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {turn.prompt}
              </p>

              <div className="mt-6 grid gap-3">
                {turn.options.map((option) => {
                  const selected = conversationChoice === option;
                  const selectedCorrect = selected && conversationPassed;
                  const selectedWrong = selected && !conversationPassed;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseConversationResponse(option)}
                      className={cn(
                        'flex min-h-14 items-center justify-between border p-4 text-left text-sm font-extrabold text-signal-navy outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        !selected &&
                          'border-signal-navy/10 bg-background hover:border-signal-teal',
                        selectedCorrect &&
                          'border-signal-teal bg-signal-teal-soft',
                        selectedWrong &&
                          'border-signal-coral bg-signal-coral/10',
                      )}
                    >
                      {option}
                      {selectedCorrect && (
                        <Check className="size-4 text-emerald-700" />
                      )}
                      {selectedWrong && (
                        <CircleAlert className="size-4 text-signal-coral" />
                      )}
                    </button>
                  );
                })}
              </div>

              {conversationFeedback && (
                <div
                  aria-live="polite"
                  className={cn(
                    'mt-5 border-l-4 p-4 text-sm font-bold leading-6',
                    conversationPassed
                      ? 'border-signal-teal bg-signal-teal-soft text-emerald-900'
                      : 'border-signal-coral bg-signal-coral/10 text-red-900',
                  )}
                >
                  {conversationFeedback}
                </div>
              )}
            </div>

            <Button
              type="button"
              size="lg"
              disabled={!conversationPassed}
              onClick={continueConversation}
              className="mt-8 h-12 w-full rounded-full bg-signal-navy px-5 font-extrabold text-white"
            >
              {conversationIndex === conversationTurns.length - 1
                ? 'Selesaikan percakapan'
                : 'Lanjutkan percakapan'}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (view === 'conversation-result') {
    return (
      <section className="grid overflow-hidden border border-signal-navy/10 bg-card lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid min-h-[430px] place-items-center bg-signal-teal p-8 text-center text-signal-navy">
          <div>
            <span className="mx-auto grid size-24 place-items-center rounded-full bg-signal-navy text-signal-teal">
              <MessageCircleMore className="size-10" />
            </span>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.15em]">
              Skenario selesai
            </p>
            <p className="mt-2 text-5xl font-black tracking-[-0.06em]">
              +100 XP
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
          <h2 className="text-3xl font-black tracking-[-0.04em] text-signal-navy">
            Kamu berhasil menjaga percakapan tetap berjalan.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Simulasi ini menguji pemahaman konteks dan pilihan respons. Versi
            berikutnya akan mengganti pilihan teks dengan respons kamera yang
            dinilai oleh model BISINDO.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              onClick={startConversation}
              className="h-12 rounded-full bg-signal-navy px-5 font-extrabold text-white"
            >
              <RefreshCw className="size-4" /> Ulangi skenario
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setView('menu')}
              className="h-12 rounded-full px-5 font-extrabold"
            >
              Kembali ke pilihan tes
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <ModeCard
        eyebrow="Mode 01"
        title="Terjemahkan tanda"
        description="Tonton lima demonstrasi BISINDO dan pilih arti yang tepat. Jawaban ditampilkan setelah seluruh tes selesai."
        meta="5 soal · skor & bintang"
        icon={Keyboard}
        color="teal"
        onStart={startTranslationTest}
      />
      <ModeCard
        eyebrow="Mode 02"
        title="Simulasi percakapan"
        description="Pahami tanda dari lawan bicara, pilih respons yang sesuai, dan lihat bagaimana percakapan bercabang."
        meta="3 giliran · +100 XP"
        icon={MessageCircleMore}
        color="coral"
        onStart={startConversation}
      />

      <aside className="border-l-4 border-signal-yellow bg-card p-6 lg:col-span-2 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-signal-yellow/30 text-amber-700">
              <Hand className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-signal-navy">
                Mode respons langsung dengan kamera
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                Antarmuka kameranya sudah tersedia, tetapi hasil belum dihitung
                ke skor karena classifier BISINDO belum diintegrasikan. Sistem
                tidak menganggap “tangan terdeteksi” sebagai jawaban yang benar.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="h-7 shrink-0 border-signal-yellow text-amber-800"
          >
            Model pending
          </Badge>
        </div>
      </aside>
    </section>
  );
}

function TestTopBar({
  label,
  progress,
  progressLabel,
  onBack,
}: {
  label: string;
  progress: number;
  progressLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-4 border-b border-signal-navy/10 p-5 sm:grid-cols-[170px_1fr] sm:items-center sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-left text-sm font-extrabold text-muted-foreground hover:text-signal-navy"
      >
        <ArrowLeft className="size-4" /> {label}
      </button>
      <Progress value={progress} className="gap-2">
        <ProgressLabel className="text-xs font-bold text-signal-navy">
          {progressLabel}
        </ProgressLabel>
        <span className="ml-auto text-xs font-bold text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </Progress>
    </div>
  );
}

function TestVideo({ src, label }: { src: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackState, setPlaybackState] = useState<
    'loading' | 'playing' | 'paused' | 'error'
  >('loading');

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playRequest = video.play();
    if (playRequest) {
      void playRequest.catch(() => setPlaybackState('paused'));
    }
  }, []);

  useEffect(() => {
    startPlayback();
  }, [src, startPlayback]);

  return (
    <div className="relative overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        aria-label={label}
        className="aspect-video w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        controls
        controlsList="nodownload noplaybackrate"
        onCanPlay={() => {
          if (videoRef.current?.paused) startPlayback();
        }}
        onPlaying={() => setPlaybackState('playing')}
        onPause={() => setPlaybackState('paused')}
        onWaiting={() => setPlaybackState('loading')}
        onError={() => setPlaybackState('error')}
      />

      {playbackState === 'loading' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 text-white">
          <span className="flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-xs font-extrabold">
            <RefreshCw className="size-4 animate-spin" /> Menyiapkan video…
          </span>
        </div>
      ) : null}

      {playbackState === 'paused' ? (
        <button
          type="button"
          onClick={startPlayback}
          className="absolute inset-0 grid place-items-center bg-black/35 text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal-teal"
          aria-label={`Putar ${label.toLowerCase()}`}
        >
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-signal-navy shadow-lg">
            <Play className="size-4" fill="currentColor" /> Putar video
          </span>
        </button>
      ) : null}

      {playbackState === 'error' ? (
        <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center text-white">
          <div>
            <CircleAlert className="mx-auto size-6 text-signal-coral" />
            <p className="mt-2 text-sm font-extrabold">Video gagal dimuat</p>
            <button
              type="button"
              onClick={() => {
                videoRef.current?.load();
                setPlaybackState('loading');
                startPlayback();
              }}
              className="mt-3 text-xs font-bold text-signal-teal underline underline-offset-4"
            >
              Muat ulang video
            </button>
          </div>
        </div>
      ) : null}

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
        WL-BISINDO · Banten
      </span>
    </div>
  );
}

function TranslationResult({
  answers,
  score,
  stars,
  bestScore,
  onRetry,
  onMenu,
}: {
  answers: TranslationAnswer[];
  score: number;
  stars: StarRating;
  bestScore: number;
  onRetry: () => void;
  onMenu: () => void;
}) {
  const correctCount = answers.filter((answer) => answer.correct).length;

  return (
    <section className="overflow-hidden border border-signal-navy/10 bg-card">
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div className="grid min-h-[430px] place-items-center bg-signal-navy p-8 text-center text-white">
          <div>
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-signal-teal text-signal-navy">
              <Trophy className="size-8" />
            </span>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.15em] text-signal-teal">
              Hasil tes
            </p>
            <p className="mt-2 text-7xl font-black tracking-[-0.07em]">
              {score}
            </p>
            <p className="text-sm font-bold text-white/55">dari 100 poin</p>
            <div
              className="mt-6 flex justify-center gap-2"
              aria-label={`${stars} bintang`}
            >
              {[1, 2, 3].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'size-8',
                    star <= stars ? 'text-signal-yellow' : 'text-white/15',
                  )}
                  fill="currentColor"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-10">
          <Badge
            className={cn(
              stars > 0
                ? 'bg-signal-teal-soft text-emerald-800'
                : 'bg-signal-coral/10 text-red-800',
            )}
          >
            {stars > 0 ? 'Bab berikutnya terbuka' : 'Perlu latihan ulang'}
          </Badge>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-signal-navy">
            {correctCount} dari {translationQuestions.length} jawaban benar
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {resultMessage(stars)} Skor terbaik tersimpan adalah {bestScore}.
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-5">
            {answers.map((answer, index) => (
              <div
                key={answer.questionId}
                className={cn(
                  'border p-3 text-center',
                  answer.correct
                    ? 'border-signal-teal bg-signal-teal-soft'
                    : 'border-signal-coral bg-signal-coral/10',
                )}
              >
                <p className="font-mono text-[10px] font-black text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <p className="mt-1 text-xs font-black text-signal-navy">
                  {answer.correct ? 'Benar' : answer.expected}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              onClick={onRetry}
              className="h-12 rounded-full bg-signal-navy px-5 font-extrabold text-white"
            >
              <RefreshCw className="size-4" /> Coba lagi
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onMenu}
              className="h-12 rounded-full px-5 font-extrabold"
            >
              Pilih mode lain
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  eyebrow,
  title,
  description,
  meta,
  icon: Icon,
  color,
  onStart,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  icon: typeof Flag;
  color: 'teal' | 'coral';
  onStart: () => void;
}) {
  return (
    <article
      className={cn(
        'flex min-h-[360px] flex-col justify-between border-t-4 bg-card p-7 sm:p-9',
        color === 'teal' ? 'border-signal-teal' : 'border-signal-coral',
      )}
    >
      <div>
        <span
          className={cn(
            'grid size-14 place-items-center rounded-full',
            color === 'teal'
              ? 'bg-signal-teal-soft text-emerald-800'
              : 'bg-signal-coral/10 text-signal-coral',
          )}
        >
          <Icon className="size-6" />
        </span>
        <p
          className={cn(
            'mt-7 text-xs font-black uppercase tracking-[0.15em]',
            color === 'teal' ? 'text-emerald-700' : 'text-signal-coral',
          )}
        >
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-signal-navy">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-signal-navy/10 pt-6">
        <span className="text-xs font-bold text-muted-foreground">{meta}</span>
        <Button
          type="button"
          onClick={onStart}
          className="rounded-full bg-signal-navy px-4 font-extrabold text-white"
        >
          <Play className="size-4" fill="currentColor" /> Mulai
        </Button>
      </div>
    </article>
  );
}
