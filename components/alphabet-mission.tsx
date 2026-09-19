'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Trophy,
  X,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { AlphabetCameraChecker } from '@/components/alphabet-camera-checker';
import {
  MissionHeroProgressCard,
  ToastingIllustration,
} from '@/components/mission-learn-hero';
import {
  MissionVocabularyCarousel,
  type CarouselSignItem,
} from '@/components/mission-vocabulary-carousel';
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

  const alphabetSigns: CarouselSignItem[] = useMemo(
    () =>
      videos.map((v) => ({
        id: `letter-${v.letter.toLowerCase()}`,
        label: `Huruf ${v.letter}`,
        category: 'identitas' as const,
        videoSrc: v.videoSrc,
        tips: [letterTips[v.letter] ?? defaultLetterTip],
      })),
    [videos],
  );

  const validSections = useMemo(
    () => ['amati', 'tirukan', 'recognition', 'recall'] as const,
    [],
  );
  const requestedSection = initialSection as MissionSection | undefined;
  const defaultSection: MissionSection = 'amati';

  const [overrideSection, setOverrideSection] = useState<MissionSection | null>(null);

  const activeSection: MissionSection =
    overrideSection ??
    (requestedSection && (validSections as readonly string[]).includes(requestedSection)
      ? requestedSection
      : defaultSection);

  return (
    <main className="min-h-screen bg-[#FFE8A3] pb-44">
      <AppHeader active="home" />
      <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8 lg:py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="size-4" /> Kembali ke beranda
        </Link>

        {!ready ? (
          <div className="mt-6 rounded-2xl border border-amber-200/50 bg-white p-6 font-semibold text-slate-600">
            Memuat progres misi…
          </div>
        ) : !learning.unlocked ? (
          <section className="mt-6 rounded-[2rem] border border-amber-200/50 bg-white p-6 sm:p-8 shadow-xs">
            <LockKeyhole className="size-7 text-slate-500" />
            <h2 className="mt-4 text-2xl font-black text-slate-900">Misi masih terkunci</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Selesaikan misi sebelumnya untuk membuka materi {mission.title}.
            </p>
            <Link
              href={previousMission?.href ?? '/missions'}
              className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Kembali ke misi sebelumnya <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          <>
            {activeSection === 'amati' && (
              <>
                {/* Hero Card matching other chapters */}
                <section className="relative mt-4 overflow-hidden rounded-[2.5rem] bg-white p-7 sm:p-10 lg:p-12 border border-amber-200/50 shadow-xs">
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_350px] gap-8 items-center">
                    {/* Left: Mission Information */}
                    <div>
                      <span className="inline-block rounded-full bg-[#FFAE00] px-4 py-1 text-xs font-black text-slate-950 shadow-2xs">
                        Bab {chapter.number.replace(/^0/, '')} • Misi {mission.number.replace(/^0/, '')}
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block mt-4">
                        MISI AKTIF
                      </span>
                      <h1 className="mt-1.5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Huruf {mission.title}
                      </h1>
                      <p className="mt-4 max-w-xl text-sm sm:text-base font-semibold text-slate-600 leading-relaxed">
                        {mission.description}
                      </p>
                    </div>

                    {/* Right: Floating Progress Card with Toasting Illustration in background */}
                    <div className="relative flex justify-center lg:justify-end items-center">
                      <div className="absolute -top-20 -right-6 sm:-right-8 w-80 sm:w-96 h-80 sm:h-96 pointer-events-none select-none overflow-visible hidden sm:block">
                        <ToastingIllustration className="size-full" />
                      </div>
                      <MissionHeroProgressCard missionId={mission.id} />
                    </div>
                  </div>
                </section>

                {/* Target Pembelajaran & Amati Video Demonstration Carousel */}
                <MissionVocabularyCarousel mission={mission} signs={alphabetSigns} />
              </>
            )}

            {activeSection !== 'amati' && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-block rounded-full bg-[#00D5D1] px-4 py-1 text-xs font-black text-slate-900 shadow-2xs">
                    Bab {chapter.number.replace(/^0/, '')} • Misi {mission.number.replace(/^0/, '')}
                  </span>
                  {replay ? (
                    <Badge className="bg-[#FFAE00] text-slate-900 font-black rounded-full px-3 py-1">
                      <RotateCcw className="size-3" /> Mode ulang misi
                    </Badge>
                  ) : null}
                </div>

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
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed bottom timeline navigation */}
      <MissionSectionNavigation
        missionId={mission.id}
        section={activeSection}
        variant="bottom-bar"
      />
    </main>
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
      <header className="rounded-[2rem] border border-amber-200/50 bg-white p-6 sm:p-7 shadow-xs">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#E54D2E]">
          Tahap 2 · Tirukan
        </p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
          Tirukan bentuk dan gerakan huruf
        </h2>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
          Perhatikan video contoh, lalu peragakan huruf di depan kamera. Setiap huruf perlu lulus
          checker sebelum tahap berikutnya terbuka.
        </p>
      </header>

      {/* Letter Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-slate-700 mr-2">Pilih huruf:</span>
        {videos.map(({ letter }) => (
          <button
            key={letter}
            type="button"
            onClick={() => setSelectedLetter(letter)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition-all cursor-pointer select-none',
              selectedLetter === letter
                ? 'bg-slate-900 text-white shadow-xs'
                : practiced.has(letter)
                  ? 'border border-emerald-400 bg-emerald-100 text-emerald-950 hover:bg-emerald-200'
                  : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-500',
            )}
          >
            <span>{letter}</span>
            {practiced.has(letter) && <Check className="size-3.5 text-emerald-700 stroke-[3]" />}
          </button>
        ))}
        <span className="ml-auto text-xs font-bold text-slate-600">
          {practiced.size} dari {videos.length} huruf sesuai
        </span>
      </div>

      {/* Side-by-Side Reference & Practice View */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Reference Video */}
        <section className="overflow-hidden rounded-[2rem] border border-amber-200/50 bg-white shadow-xs">
          <div className="border-b border-amber-100 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                Video Referensi
              </span>
              <h3 className="text-xl font-black text-slate-900">Huruf {selectedLetter}</h3>
            </div>
            <Badge className="bg-[#FFAE00] text-slate-950 font-bold rounded-full">
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
          <div className="p-4 bg-amber-50/60 flex items-start gap-2.5 text-xs font-semibold text-slate-700 border-t border-amber-100">
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
              className="mt-4 w-full rounded-full bg-slate-900 font-bold text-white hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              Huruf berikutnya <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      <footer className="mt-8 rounded-[2rem] border border-amber-200/50 bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-black text-slate-900">
            {allPracticed
              ? 'Seluruh huruf dalam misi ini sudah sesuai dengan contoh.'
              : `${practiced.size} dari ${videos.length} huruf sudah sesuai.`}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Setelah semua huruf lulus checker, lanjutkan ke Uji pengenalan.
          </p>
        </div>
        <Button
          onClick={onFinish}
          disabled={!allPracticed}
          className="rounded-full bg-[#00D5D1] px-8 py-3 text-base font-black text-slate-900 hover:bg-[#00c2be] disabled:opacity-50 cursor-pointer shadow-xs"
        >
          Lanjut ke Uji pengenalan <ArrowRight className="size-4 ml-1" />
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
            'p-8 sm:p-10 border rounded-[2.5rem] bg-white shadow-xs',
            passed ? 'border-emerald-300' : 'border-amber-200',
          )}
        >
          {passed ? (
            <Trophy className="size-16 mx-auto text-[#00D5D1] stroke-[2.5]" />
          ) : (
            <RotateCcw className="size-16 mx-auto text-[#E54D2E]" />
          )}

          <h2 className="mt-5 text-3xl font-black text-slate-900">
            {passed ? 'Uji Pengenalan Lulus!' : 'Perlu Berlatih Lagi'}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {passed
              ? `Hebat! Kamu berhasil meraih skor ${score} dari 100 poin.`
              : `Kamu meraih skor ${score} dari 100 poin. Butuh minimal 70 poin untuk membuka tahap peragaan.`}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              onClick={handleRetry}
              className="rounded-full font-black border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="size-4 mr-2" /> Ulangi uji pengenalan
            </Button>
            {passed && (
              <Button
                onClick={onPass}
                className="rounded-full bg-[#00D5D1] font-black text-slate-900 hover:bg-[#00c2be] px-8 cursor-pointer shadow-xs"
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
      <header className="rounded-[2rem] border border-amber-200/50 bg-white p-6 sm:p-7 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#E54D2E]">
            Tahap 3 · Uji pengenalan
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Huruf apa yang diperagakan?
          </h2>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm font-black text-slate-900">
            Soal {currentIndex + 1} / {questions.length}
          </span>
          <p className="text-xs font-black text-emerald-700">Skor: {score}</p>
        </div>
      </header>

      {/* Mystery Video without label */}
      <div className="overflow-hidden rounded-[2rem] border border-amber-200/50 bg-black aspect-video w-full shadow-xs">
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
          let btnStyle = 'border-slate-200 bg-white hover:border-slate-400 text-slate-900';

          if (selectedOption !== null) {
            if (isCorrect) {
              btnStyle = 'border-emerald-500 bg-emerald-500 text-white font-black';
            } else if (isSelected) {
              btnStyle = 'border-[#E54D2E] bg-red-100 text-[#E54D2E] font-black';
            } else {
              btnStyle = 'border-slate-200 bg-white/50 text-slate-400 opacity-60';
            }
          }

          return (
            <button
              key={option}
              type="button"
              disabled={selectedOption !== null}
              onClick={() => handleSelectOption(option)}
              className={cn(
                'flex h-20 items-center justify-center rounded-2xl border text-3xl font-black shadow-xs transition-all active:scale-95 cursor-pointer',
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
        <div className="rounded-2xl border border-amber-200/50 bg-white p-4 shadow-xs flex items-center justify-between gap-4">
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
                <X className="size-5 text-[#E54D2E] stroke-[3]" />
                <span className="font-bold text-[#E54D2E] text-sm">
                  Kurang tepat. Jawaban yang benar adalah huruf {currentQ.letter}.
                </span>
              </>
            )}
          </div>
          <Button
            onClick={handleNextQuestion}
            className="rounded-full bg-slate-900 font-bold text-white text-xs px-6 hover:bg-slate-800 cursor-pointer shadow-xs"
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
        <div className="p-8 sm:p-10 border border-amber-200/50 bg-white rounded-[2.5rem] shadow-xs">
          <Trophy className="size-20 mx-auto text-[#FFAE00] stroke-[2.5]" />
          <h2 className="mt-6 text-4xl font-black text-slate-900">
            Misi Selesai!
          </h2>
          <p className="mt-3 text-base font-semibold text-slate-600">
            Selamat! Kamu telah menyelesaikan seluruh 4 tahap materi{' '}
            <strong className="text-slate-900">Huruf {mission.title}</strong>!
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              onClick={onRestart}
              className="rounded-full font-black border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="size-4 mr-2" /> Ulangi dari awal
            </Button>
            {nextMission ? (
              <Link
                href={nextMission.href}
                className={cn(
                  buttonVariants(),
                  'rounded-full bg-[#00D5D1] font-black text-slate-900 hover:bg-[#00c2be] px-8 shadow-xs',
                )}
              >
                Lanjut ke: {nextMission.title} <ArrowRight className="size-4 ml-2" />
              </Link>
            ) : (
              <Link
                href="/missions"
                className={cn(
                  buttonVariants(),
                  'rounded-full bg-[#00D5D1] font-black text-slate-900 hover:bg-[#00c2be] px-8 shadow-xs',
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
      <header className="rounded-[2rem] border border-amber-200/50 bg-white p-6 sm:p-7 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#E54D2E]">
            Tahap 4 · Uji peragaan
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Peragakan huruf dari ingatan tanpa contoh
          </h2>
        </div>
        <span className="font-mono text-sm font-black text-slate-900">
          Huruf {step + 1} / {videos.length}
        </span>
      </header>

      {/* Target Prompt */}
      <div className="rounded-[2rem] border border-amber-200/50 bg-white p-6 text-center shadow-xs">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Peragakan sekarang
        </p>
        <h3 className="mt-2 text-6xl font-black text-slate-900">
          Huruf {currentLetter}
        </h3>
        <p className="mt-3 text-xs font-semibold text-slate-600">
          Tunjukkan bentuk huruf ini di depan kamera cerminmu.
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-600">
          Luluskan huruf ini dengan checker untuk melanjutkan.
        </p>
      </div>

      <AlphabetCameraChecker letter={currentLetter} videoSrc={currentVideo.videoSrc} onPass={handlePassed} />

      {/* Hint toggle if stuck */}
      <div>
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="text-xs font-bold text-emerald-800 underline underline-offset-4 hover:text-slate-900 cursor-pointer"
        >
          {showHint ? 'Sembunyikan petunjuk' : 'Lupa bentuknya? Lihat petunjuk video'}
        </button>

        {showHint && currentVideo && (
          <div className="mt-4 p-4 border border-amber-200/50 bg-white rounded-2xl shadow-xs space-y-3">
            <p className="text-xs font-semibold text-slate-600">
              {letterTips[currentLetter] ?? defaultLetterTip}
            </p>
            <video
              src={currentVideo.videoSrc}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-48 rounded-xl bg-black mx-auto"
            >
              <track kind="captions" />
            </video>
          </div>
        )}
      </div>

      {/* Confirmation Button */}
      <div className="flex justify-end pt-4 border-t border-amber-200/50">
        <Button
          onClick={handleNextLetter}
          disabled={!passedLetters.has(currentLetter)}
          className="rounded-full bg-[#00D5D1] px-8 py-3 text-base font-black text-slate-900 hover:bg-[#00c2be] cursor-pointer shadow-xs disabled:opacity-50"
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
