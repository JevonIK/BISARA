'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { AlphabetCameraChecker } from '@/components/alphabet-camera-checker';
import {
  MissionHeroProgress,
  MissionStageList,
} from '@/components/mission-learning-progress';
import {
  MissionSectionNavigation,
  type MissionSection,
} from '@/components/mission-section-navigation';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useProgress } from '@/hooks/use-progress';
import {
  buildAlphabetRecognitionQuestions,
  getAlphabetVideosForMission,
  setAlphabetPracticeCompleted,
  type AlphabetLetter,
  type AlphabetQuestion,
} from '@/lib/alphabet-data';
import { allMissions, getMissionPosition, type Chapter, type Mission } from '@/lib/learning-data';
import { getMissionLearningState, RECOGNITION_PASS_SCORE } from '@/lib/learning-progress';
import { recordMissionCompletion, recordMissionRecognition } from '@/lib/progress-storage';
import { calculateStars } from '@/lib/scoring';
import { cn } from '@/lib/utils';

const letterTips: Partial<Record<AlphabetLetter, string>> = {
  J: 'Amati bentuk awal, arah, dan lintasan tangan sepanjang video contoh.',
  Z: 'Amati bentuk awal, arah, dan lintasan tangan sepanjang video contoh.',
};
const defaultLetterTip = 'Ikuti jumlah tangan, bentuk jari, arah, dan hubungan kedua tangan sesuai video contoh.';

const subscribeHydration = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export function AlphabetMission({
  mission,
  chapter,
  initialSection,
  replay = false,
}: {
  mission: Mission;
  chapter: Chapter;
  initialSection?: string;
  replay?: boolean;
}) {
  const progress = useProgress();
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const learning = getMissionLearningState(mission, progress);
  const videos = useMemo(() => getAlphabetVideosForMission(mission.id), [mission.id]);
  const previousMission = allMissions[getMissionPosition(mission.id) - 1];

  const validSections = useMemo(
    () => ['amati', 'tirukan', 'recognition', 'recall'] as const,
    [],
  );
  const requestedSection = initialSection as MissionSection | undefined;
  const defaultSection: MissionSection =
    learning.missionComplete && !replay
      ? 'amati'
      : learning.recognitionComplete
        ? 'recall'
        : learning.practiceComplete
          ? 'recognition'
          : 'amati';

  const [overrideSection, setOverrideSection] = useState<MissionSection | null>(null);

  const activeSection: MissionSection =
    overrideSection ??
    (requestedSection && (validSections as readonly string[]).includes(requestedSection)
      ? requestedSection
      : defaultSection);

  // Watched set for Stage 1 Amati
  const [watched, setWatched] = useState<Set<AlphabetLetter>>(() => new Set());
  const handleMarkWatched = useCallback((letter: AlphabetLetter) => {
    setWatched((prev) => new Set(prev).add(letter));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <Link
          href="/missions"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-signal-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy"
        >
          <ArrowLeft className="size-4" /> Kembali ke perjalanan
        </Link>

        {/* Hero Section matching Chapters 1-4 */}
        <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-signal-navy px-6 py-9 text-white sm:px-9 lg:px-12">
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-signal-teal text-signal-navy">
                  Bab {chapter.number} · Misi {mission.number}
                </Badge>
                <Badge variant="outline" className="border-white/15 text-white/70">
                  BISINDO Alfabet
                </Badge>
                {replay ? (
                  <Badge className="bg-signal-yellow text-signal-navy">
                    <RotateCcw className="size-3" /> Mode ulang misi
                  </Badge>
                ) : null}
              </div>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-signal-teal">
                Misi belajar
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.05em] sm:text-5xl">
                Huruf {mission.title}
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
                  <Target className="size-4 text-signal-coral" />
                  {videos.length} huruf
                </span>
              </div>
            </div>
            <MissionHeroProgress missionId={mission.id} />
          </div>
        </section>

        {!ready ? (
          <p className="mt-7 border border-signal-navy/10 bg-card p-6 text-muted-foreground">
            Memuat progres misi…
          </p>
        ) : !learning.unlocked ? (
          <section className="mt-7 border border-signal-navy/10 bg-card p-6 sm:p-8">
            <LockKeyhole className="size-7 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-black text-signal-navy">Misi masih terkunci</h2>
            <p className="mt-2 text-muted-foreground">
              Selesaikan misi sebelumnya untuk membuka materi {mission.title}.
            </p>
            <Link
              href={previousMission?.href ?? '/missions'}
              className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-navy"
            >
              Kembali ke misi sebelumnya <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          <>
            {/* Section Navigation Tabs: Amati | Tirukan | Uji pengenalan | Uji peragaan */}
            <div className="pt-6">
              <MissionSectionNavigation missionId={mission.id} section={activeSection} />
            </div>

            {/* Active Stage Content */}
            {activeSection === 'amati' && (
              <StageAmati
                mission={mission}
                videos={videos}
                watched={watched}
                onMarkWatched={handleMarkWatched}
                onNext={() => setOverrideSection('tirukan')}
              />
            )}

            {activeSection === 'tirukan' && (
              <StageTirukan
                videos={videos}
                onFinish={() => {
                  setAlphabetPracticeCompleted(mission.id);
                  setOverrideSection('recognition');
                }}
              />
            )}

            {activeSection === 'recognition' && (
              <StageRecognition
                mission={mission}
                onPass={() => setOverrideSection('recall')}
              />
            )}

            {activeSection === 'recall' && (
              <StageRecall
                mission={mission}
                videos={videos}
                onRestart={() => setOverrideSection('amati')}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// 1. TAHAP 1: AMATI
// ---------------------------------------------------------------------------
function StageAmati({
  mission,
  videos,
  watched,
  onMarkWatched,
  onNext,
}: {
  mission: Mission;
  videos: ReturnType<typeof getAlphabetVideosForMission>;
  watched: Set<AlphabetLetter>;
  onMarkWatched: (letter: AlphabetLetter) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-10 py-6">
      {/* Vocabulary / Letters Overview */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="border border-signal-navy/10 bg-card p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
            Huruf dalam misi
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
            Kenali setiap huruf satu per satu
          </h2>
          <ul className="mt-7 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {videos.map(({ letter }, index) => (
              <li
                key={letter}
                className="flex min-h-20 items-end justify-between border-t-2 border-signal-teal bg-signal-teal-soft p-4"
              >
                <span className="text-xl font-black text-signal-navy">{letter}</span>
                <span className="font-mono text-[10px] font-black text-emerald-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="border-t-4 border-signal-yellow bg-card p-6 sm:p-8">
          <Sparkles className="size-7 text-amber-500" />
          <h2 className="mt-5 text-xl font-black text-signal-navy">Alfabet Jari BISINDO</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sistem ejaan jari dalam BISINDO digunakan untuk mengeja nama orang, tempat, istilah
            teknis, atau kata yang belum memiliki lambang isyarat tersendiri.
          </p>
          <p className="mt-4 border-t border-signal-navy/10 pt-4 text-xs leading-5 text-muted-foreground">
            Amati posisi jari, orientasi telapak tangan, dan arah gerakan sebelum berlatih menirukan
            di depan kamera.
          </p>
        </aside>
      </section>

      {/* Observation Video Grid */}
      <section>
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
            Tahap 1 · Amati
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-signal-navy">
            Amati demonstrasi setiap huruf
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Putar video sampai selesai untuk menandai huruf sebagai sudah diamati. Perhatikan
            bentuk jemari dan arah telapak tangan sebelum lanjut ke tahap Tirukan.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map(({ letter, videoSrc }) => (
            <article
              key={letter}
              className="min-w-0 overflow-hidden border border-signal-navy/10 bg-card"
            >
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="text-2xl font-black text-signal-navy">Huruf {letter}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {letterTips[letter] ? 'Gerakan tangan alfabet' : 'Materi alfabet'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  {watched.has(letter) ? (
                    <>
                      <Check className="size-4" /> Sudah diamati
                    </>
                  ) : (
                    'Belum diamati'
                  )}
                </span>
              </div>
              <video
                src={videoSrc}
                aria-label={`Contoh gerakan huruf ${letter} dalam BISINDO`}
                className="aspect-video w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                controlsList="nodownload noplaybackrate"
                onEnded={() => onMarkWatched(letter)}
              >
                <track kind="captions" />
              </video>
            </article>
          ))}
        </div>
      </section>

      {/* Mission Stages List */}
      <section className="border-t border-signal-navy/10 pt-10">
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
              Alur misi
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-signal-navy">
              Selesaikan setiap tahap untuk membuka misi berikutnya.
            </h2>
          </div>
          <p className="text-sm font-bold text-muted-foreground">
            Amati → Tirukan → Kenali → Uji peragaan
          </p>
        </div>
        <MissionStageList missionId={mission.id} />

        <div className="mt-8 flex justify-end">
          <Button
            onClick={onNext}
            className="rounded-full bg-signal-teal px-8 py-3 text-base font-black text-signal-navy hover:bg-signal-teal/90"
          >
            Mulai tahap Tirukan <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. TAHAP 2: TIRUKAN
// ---------------------------------------------------------------------------
function StageTirukan({
  videos,
  onFinish,
}: {
  videos: ReturnType<typeof getAlphabetVideosForMission>;
  onFinish: () => void;
}) {
  const [selectedLetter, setSelectedLetter] = useState<AlphabetLetter>(videos[0].letter);
  const [practiced, setPracticed] = useState<Set<AlphabetLetter>>(() => new Set());

  const currentVideo = useMemo(
    () => videos.find((v) => v.letter === selectedLetter) ?? videos[0],
    [videos, selectedLetter],
  );

  const handlePassed = useCallback(() => {
    setPracticed((previous) => new Set(previous).add(selectedLetter));
  }, [selectedLetter]);

  const allPracticed = videos.length > 0 && videos.every((v) => practiced.has(v.letter));

  return (
    <div className="space-y-8 py-6">
      <header className="border-b border-signal-navy/10 pb-6">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
          Tahap 2 · Tirukan
        </p>
        <h2 className="mt-2 text-3xl font-black text-signal-navy">
          Tirukan bentuk dan gerakan huruf
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Perhatikan video contoh, lalu peragakan huruf di depan kamera. Setiap huruf perlu lulus
          checker sebelum tahap berikutnya terbuka.
        </p>
      </header>

      {/* Letter Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted-foreground mr-2">Pilih huruf:</span>
        {videos.map(({ letter }) => (
          <button
            key={letter}
            type="button"
            onClick={() => setSelectedLetter(letter)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition-all',
              selectedLetter === letter
                ? 'bg-signal-navy text-white shadow-sm'
                : practiced.has(letter)
                  ? 'border border-signal-teal bg-signal-teal-soft text-signal-navy hover:bg-signal-teal/30'
                  : 'border border-signal-navy/10 bg-card text-muted-foreground hover:text-signal-navy',
            )}
          >
            <span>{letter}</span>
            {practiced.has(letter) && <Check className="size-3.5 text-emerald-700 stroke-[3]" />}
          </button>
        ))}
        <span className="ml-auto text-xs font-bold text-muted-foreground">
          {practiced.size} dari {videos.length} huruf sesuai
        </span>
      </div>

      {/* Side-by-Side Reference & Practice View */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Reference Video */}
        <section className="overflow-hidden border border-signal-navy/10 bg-card">
          <div className="border-b border-signal-navy/10 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-signal-coral">
                Video Referensi
              </span>
              <h3 className="text-xl font-black text-signal-navy">Huruf {selectedLetter}</h3>
            </div>
            <Badge className="bg-signal-yellow text-signal-navy">
              Petunjuk gerak
            </Badge>
          </div>
          <video
            key={currentVideo.videoSrc}
            src={currentVideo.videoSrc}
            aria-label={`Contoh gerakan huruf ${selectedLetter}`}
            className="aspect-video w-full bg-black object-contain"
            controls
            autoPlay
            loop
            muted
            playsInline
          >
            <track kind="captions" />
          </video>
          <div className="p-4 bg-muted/40 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
            <span>{letterTips[selectedLetter] ?? defaultLetterTip}</span>
          </div>
        </section>

        <div>
          <AlphabetCameraChecker letter={selectedLetter} videoSrc={currentVideo.videoSrc} onPass={handlePassed} />
          {practiced.has(selectedLetter) && videos.some((video) => !practiced.has(video.letter)) && (
            <Button
              type="button"
              onClick={() => setSelectedLetter(videos.find((video) => !practiced.has(video.letter))!.letter)}
              className="mt-4 w-full rounded-full bg-signal-navy font-bold text-white"
            >
              Huruf berikutnya <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      <footer className="mt-8 border border-signal-navy/10 bg-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold text-signal-navy">
            {allPracticed
              ? 'Seluruh huruf dalam misi ini sudah sesuai dengan contoh.'
              : `${practiced.size} dari ${videos.length} huruf sudah sesuai.`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Setelah semua huruf lulus checker, lanjutkan ke Uji pengenalan.
          </p>
        </div>
        <Button
          onClick={onFinish}
          disabled={!allPracticed}
          className="rounded-full bg-signal-teal px-8 py-3 text-base font-black text-signal-navy hover:bg-signal-teal/90 disabled:opacity-50"
        >
          Lanjut ke Uji pengenalan <ArrowRight className="size-4" />
        </Button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. TAHAP 3: UJI PENGENALAN
// ---------------------------------------------------------------------------
function StageRecognition({
  mission,
  onPass,
}: {
  mission: Mission;
  onPass: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const questions = useMemo(
    () => buildAlphabetRecognitionQuestions(mission.id, attempt),
    [mission.id, attempt],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<AlphabetLetter | null>(null);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ: AlphabetQuestion | undefined = questions[currentIndex];

  const handleSelectOption = (option: AlphabetLetter) => {
    if (selectedOption !== null || !currentQ) return;
    setSelectedOption(option);
    const isCorrect = option === currentQ.letter;
    if (isCorrect) {
      setScore((prev) => prev + Math.round(100 / questions.length));
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsCompleted(true);
      const finalScore = Math.min(100, score);
      if (finalScore >= RECOGNITION_PASS_SCORE) {
        const stars = calculateStars(finalScore);
        recordMissionRecognition(mission.id, finalScore, stars);
      }
    }
  };

  const handleRetry = () => {
    setAttempt((prev) => prev + 1);
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsCompleted(false);
  };

  const passed = score >= RECOGNITION_PASS_SCORE;

  if (isCompleted) {
    return (
      <div className="space-y-6 py-8 max-w-2xl mx-auto text-center">
        <div
          className={cn(
            'p-8 border rounded-3xl',
            passed
              ? 'border-signal-teal bg-signal-teal-soft'
              : 'border-signal-coral/30 bg-card',
          )}
        >
          {passed ? (
            <Trophy className="size-16 mx-auto text-signal-teal stroke-[2.5]" />
          ) : (
            <RotateCcw className="size-16 mx-auto text-signal-coral" />
          )}

          <h2 className="mt-5 text-3xl font-black text-signal-navy">
            {passed ? 'Uji Pengenalan Lulus!' : 'Perlu Berlatih Lagi'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {passed
              ? `Hebat! Kamu berhasil meraih skor ${score} dari 100 poin.`
              : `Kamu meraih skor ${score} dari 100 poin. Butuh minimal 70 poin untuk membuka tahap peragaan.`}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              onClick={handleRetry}
              className="rounded-full font-bold"
            >
              <RotateCcw className="size-4 mr-2" /> Ulangi uji pengenalan
            </Button>
            {passed && (
              <Button
                onClick={onPass}
                className="rounded-full bg-signal-teal font-black text-signal-navy hover:bg-signal-teal/90"
              >
                Lanjut ke Uji peragaan <ArrowRight className="size-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="space-y-8 py-6 max-w-3xl mx-auto">
      <header className="border-b border-signal-navy/10 pb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
            Tahap 3 · Uji pengenalan
          </p>
          <h2 className="mt-1 text-2xl font-black text-signal-navy">
            Huruf apa yang diperagakan?
          </h2>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm font-bold text-signal-navy">
            Soal {currentIndex + 1} / {questions.length}
          </span>
          <p className="text-xs font-bold text-emerald-700">Skor: {score}</p>
        </div>
      </header>

      {/* Mystery Video without label */}
      <div className="overflow-hidden border border-signal-navy/10 bg-black aspect-video w-full">
        <video
          key={currentQ.videoSrc}
          src={currentQ.videoSrc}
          aria-label="Soal video pengenalan huruf"
          className="w-full h-full object-contain"
          controls
          autoPlay
          loop
          playsInline
        >
          <track kind="captions" />
        </video>
      </div>

      {/* Multiple Choice Options */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {currentQ.options.map((option) => {
          const isSelected = selectedOption === option;
          const isCorrect = option === currentQ.letter;
          let btnStyle = 'border-signal-navy/15 bg-card hover:border-signal-navy text-signal-navy';

          if (selectedOption !== null) {
            if (isCorrect) {
              btnStyle = 'border-signal-teal bg-signal-teal text-signal-navy font-black';
            } else if (isSelected) {
              btnStyle = 'border-signal-coral bg-signal-coral/20 text-signal-coral font-black';
            } else {
              btnStyle = 'border-signal-navy/10 bg-card/50 text-muted-foreground opacity-60';
            }
          }

          return (
            <button
              key={option}
              type="button"
              disabled={selectedOption !== null}
              onClick={() => handleSelectOption(option)}
              className={cn(
                'flex h-20 items-center justify-center rounded-2xl border text-3xl font-black shadow-xs transition-all active:scale-95',
                btnStyle,
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Feedback & Next Button */}
      {selectedOption !== null && (
        <div className="border border-signal-navy/10 bg-card p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {selectedOption === currentQ.letter ? (
              <>
                <Check className="size-5 text-emerald-600 stroke-[3]" />
                <span className="font-bold text-emerald-800 text-sm">
                  Tepat! Ini adalah huruf {currentQ.letter}.
                </span>
              </>
            ) : (
              <>
                <X className="size-5 text-signal-coral stroke-[3]" />
                <span className="font-bold text-signal-coral text-sm">
                  Kurang tepat. Jawaban yang benar adalah huruf {currentQ.letter}.
                </span>
              </>
            )}
          </div>
          <Button
            onClick={handleNextQuestion}
            className="rounded-full bg-signal-navy font-bold text-white text-xs px-6"
          >
            {currentIndex + 1 < questions.length ? 'Soal berikutnya' : 'Lihat hasil'}
            <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. TAHAP 4: UJI PERAGAAN
// ---------------------------------------------------------------------------
function StageRecall({
  mission,
  videos,
  onRestart,
}: {
  mission: Mission;
  videos: ReturnType<typeof getAlphabetVideosForMission>;
  onRestart: () => void;
}) {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [passedLetters, setPassedLetters] = useState<Set<AlphabetLetter>>(() => new Set());

  const currentLetter = videos[step]?.letter;
  const currentVideo = videos[step];

  const handlePassed = useCallback(() => {
    if (currentLetter) setPassedLetters((previous) => new Set(previous).add(currentLetter));
  }, [currentLetter]);

  const handleNextLetter = () => {
    setShowHint(false);
    if (step + 1 < videos.length) {
      setStep((prev) => prev + 1);
    } else {
      setCompleted(true);
      recordMissionCompletion(mission.id);
    }
  };

  const nextMission = allMissions[getMissionPosition(mission.id) + 1];

  if (completed) {
    return (
      <div className="space-y-6 py-10 max-w-2xl mx-auto text-center">
        <div className="p-8 sm:p-10 border border-signal-teal bg-signal-teal-soft rounded-3xl">
          <Trophy className="size-20 mx-auto text-signal-teal stroke-[2.5]" />
          <h2 className="mt-6 text-4xl font-black text-signal-navy">
            Misi Selesai!
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Selamat! Kamu telah menyelesaikan seluruh 4 tahap materi{' '}
            <strong className="text-signal-navy">Huruf {mission.title}</strong>!
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              onClick={onRestart}
              className="rounded-full font-bold"
            >
              <RotateCcw className="size-4 mr-2" /> Ulangi dari awal
            </Button>
            {nextMission ? (
              <Link
                href={nextMission.href}
                className={cn(
                  buttonVariants(),
                  'rounded-full bg-signal-teal font-black text-signal-navy hover:bg-signal-teal/90 px-8',
                )}
              >
                Lanjut ke: {nextMission.title} <ArrowRight className="size-4 ml-2" />
              </Link>
            ) : (
              <Link
                href="/missions"
                className={cn(
                  buttonVariants(),
                  'rounded-full bg-signal-teal font-black text-signal-navy hover:bg-signal-teal/90 px-8',
                )}
              >
                Kembali ke perjalanan <ArrowRight className="size-4 ml-2" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6 max-w-3xl mx-auto">
      <header className="border-b border-signal-navy/10 pb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-signal-coral">
            Tahap 4 · Uji peragaan
          </p>
          <h2 className="mt-1 text-2xl font-black text-signal-navy">
            Peragakan huruf dari ingatan tanpa contoh
          </h2>
        </div>
        <span className="font-mono text-sm font-bold text-signal-navy">
          Huruf {step + 1} / {videos.length}
        </span>
      </header>

      {/* Target Prompt */}
      <div className="border border-signal-navy/10 bg-card p-6 text-center rounded-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Peragakan sekarang
        </p>
        <h3 className="mt-2 text-6xl font-black text-signal-navy">
          Huruf {currentLetter}
        </h3>
        <p className="mt-3 text-xs text-muted-foreground">
          Tunjukkan bentuk huruf ini di depan kamera cerminmu.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Luluskan huruf ini dengan checker untuk melanjutkan.
        </p>
      </div>

      <AlphabetCameraChecker letter={currentLetter} videoSrc={currentVideo.videoSrc} onPass={handlePassed} />

      {/* Hint toggle if stuck */}
      <div>
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="text-xs font-bold text-emerald-800 underline underline-offset-4 hover:text-signal-navy"
        >
          {showHint ? 'Sembunyikan petunjuk' : 'Lupa bentuknya? Lihat petunjuk video'}
        </button>

        {showHint && currentVideo && (
          <div className="mt-4 p-4 border border-signal-navy/10 bg-muted/40 rounded-xl space-y-3">
            <p className="text-xs text-muted-foreground">
              {letterTips[currentLetter] ?? defaultLetterTip}
            </p>
            <video
              src={currentVideo.videoSrc}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-48 rounded-lg bg-black mx-auto"
            >
              <track kind="captions" />
            </video>
          </div>
        )}
      </div>

      {/* Confirmation Button */}
      <div className="flex justify-end pt-4 border-t border-signal-navy/10">
        <Button
          onClick={handleNextLetter}
          disabled={!passedLetters.has(currentLetter)}
          className="rounded-full bg-signal-teal px-8 py-3 text-base font-black text-signal-navy hover:bg-signal-teal/90"
        >
          {step + 1 < videos.length ? (
            <>
              Huruf berikutnya <ArrowRight className="size-4 ml-1" />
            </>
          ) : (
            <>
              Selesaikan misi <Check className="size-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
