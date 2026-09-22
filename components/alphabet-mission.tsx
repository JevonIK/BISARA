'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  Flag,
  Hand,
  LoaderCircle,
  LockKeyhole,
  Play,
  RotateCcw,
  ShieldCheck,
  SunMedium,
  X,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
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
  isAlphabetPracticeCompleted,
  setAlphabetPracticeCompleted,
  type AlphabetLetter,
  type AlphabetQuestion,
} from '@/lib/alphabet-data';
import {
  scoreAlphabetWithAlternatives,
  type AlphabetAssessment,
  type AlphabetReferenceSet,
} from '@/lib/alphabet-scoring';
import {
  getRequiredHandCount,
  type GestureFrame,
  type HandObservation,
} from '@/lib/gesture-scoring';
import {
  getAlphabetReferenceFrames,
  getAlphabetReferenceSet,
} from '@/lib/reference-extractor';
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
        {activeSection === 'amati' ? (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="size-4" /> Kembali ke beranda
          </Link>
        ) : (
          <Link
            href={`/missions/learn?mission=${mission.id}&section=amati`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="size-4" /> Kembali ke detail misi
          </Link>
        )}

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
                {(activeSection === 'recognition' || activeSection === 'recall') && (
                  <div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-full bg-[#00D5D1] px-4 py-1 text-xs font-black text-slate-900 shadow-2xs">
                        Bab {chapter.number.replace(/^0/, '')} • Misi {mission.number}
                      </span>
                      <span className="rounded-full border border-[#E54D2E] bg-white/70 px-4 py-1 text-xs font-black text-[#E54D2E]">
                        Tahap Latihan
                      </span>
                      {replay ? (
                        <Badge className="bg-[#FFAE00] text-slate-900 font-black rounded-full px-3 py-1">
                          <RotateCcw className="size-3" /> Mode ulang misi
                        </Badge>
                      ) : null}
                    </div>
                    <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
                      Asah Kemampuanmu!
                    </h1>
                    <p className="mt-2 text-sm sm:text-base font-semibold text-slate-700">
                      Selesaikan latihan singkat ini untuk mengunci kosakata yang baru kamu pelajari
                    </p>
                  </div>
                )}

                {activeSection === 'tirukan' && (
                  <StageTirukan
                    missionId={mission.id}
                    chapterNumber={chapter.number.replace(/^0/, '')}
                    missionNumber={mission.number.replace(/^0/, '')}
                    videos={videos}
                    replay={replay}
                    onFinish={() => {
                      setAlphabetPracticeCompleted(mission.id);
                      setOverrideSection('recognition');
                    }}
                  />
                )}

                {activeSection === 'recognition' && (
                  !learning.practiceComplete ? (
                    <AlphabetGate
                      title="Selesaikan tahap Tirukan"
                      description={`Latihlah seluruh huruf ${mission.title} pada tahap Tirukan terlebih dahulu sebelum memulai uji pengenalan.`}
                      href={`/missions/learn?mission=${mission.id}&section=tirukan`}
                      action="Mulai tahap Tirukan"
                      onAction={() => setOverrideSection('tirukan')}
                    />
                  ) : (
                    <StageRecognition
                      mission={mission}
                      onPass={() => setOverrideSection('recall')}
                    />
                  )
                )}

                {activeSection === 'recall' && (
                  !learning.practiceComplete ? (
                    <AlphabetGate
                      title="Selesaikan tahap Tirukan"
                      description={`Latihlah seluruh huruf ${mission.title} pada tahap Tirukan terlebih dahulu sebelum memulai uji peragaan.`}
                      href={`/missions/learn?mission=${mission.id}&section=tirukan`}
                      action="Mulai tahap Tirukan"
                      onAction={() => setOverrideSection('tirukan')}
                    />
                  ) : !learning.recognitionComplete ? (
                    <AlphabetGate
                      title="Uji peragaan belum terbuka"
                      description="Selesaikan uji pengenalan dan raih nilai kelulusan minimal 70 terlebih dahulu sebelum memulai uji peragaan."
                      href={`/missions/learn?mission=${mission.id}&section=recognition`}
                      action="Mulai uji pengenalan"
                      onAction={() => setOverrideSection('recognition')}
                    />
                  ) : (
                    <StageRecall
                      mission={mission}
                      videos={videos}
                      onRestart={() => setOverrideSection('amati')}
                    />
                  )
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
// 2. TAHAP 2: TIRUKAN (Consistent with Chapter Practice UI)
// ---------------------------------------------------------------------------

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

type LightingStatus = 'unknown' | 'low' | 'good' | 'bright';

function lightingLabel(status: LightingStatus) {
  if (status === 'low') return 'Terlalu gelap';
  if (status === 'bright') return 'Terlalu terang';
  if (status === 'good') return 'Cukup';
  return 'Belum diperiksa';
}

function readFrameLighting(
  video: HTMLVideoElement,
  sampleCanvas: HTMLCanvasElement,
): LightingStatus {
  sampleCanvas.width = 32;
  sampleCanvas.height = 18;

  const context = sampleCanvas.getContext('2d', {
    willReadFrequently: true,
  });
  if (!context) return 'unknown';

  context.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const pixels = context.getImageData(
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  ).data;

  let luminance = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    luminance +=
      0.2126 * pixels[index] +
      0.7152 * pixels[index + 1] +
      0.0722 * pixels[index + 2];
  }

  const average = luminance / (pixels.length / 4);
  if (average < 55) return 'low';
  if (average > 220) return 'bright';
  return 'good';
}

function drawHandLandmarks(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: HandObservation[],
) {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const { landmarks } of hands) {
    context.strokeStyle = '#00D5D1';
    context.lineWidth = Math.max(3, canvas.width / 320);
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) continue;
      context.beginPath();
      context.moveTo(start.x * canvas.width, start.y * canvas.height);
      context.lineTo(end.x * canvas.width, end.y * canvas.height);
      context.stroke();
    }
    for (const [index, landmark] of landmarks.entries()) {
      context.beginPath();
      context.fillStyle = index === 0 ? '#FFAE00' : '#00D5D1';
      context.arc(
        landmark.x * canvas.width,
        landmark.y * canvas.height,
        index === 0 ? 7 : 5,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
}

const ALPHABET_LETTER_STORAGE_KEY = 'bisara_alphabet_letters';

function getPracticedLetters(missionId: string): Set<AlphabetLetter> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(
      `${ALPHABET_LETTER_STORAGE_KEY}_${missionId}`,
    );
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function savePracticedLetters(
  missionId: string,
  letters: Set<AlphabetLetter>,
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${ALPHABET_LETTER_STORAGE_KEY}_${missionId}`,
      JSON.stringify(Array.from(letters)),
    );
  } catch {}
}

function QualitativeMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const state =
    value >= 75
      ? 'Baik'
      : value >= 50
        ? 'Mendekati'
        : 'Perlu diperbaiki';

  return (
    <div className="flex items-center justify-between gap-3 text-xs font-bold">
      <span className="text-slate-900">{label}</span>
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
          value >= 75
            ? 'bg-emerald-100 text-emerald-800'
            : value >= 50
              ? 'bg-amber-100 text-amber-800'
              : 'bg-rose-100 text-rose-700',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            value >= 75
              ? 'bg-emerald-500'
              : value >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500',
          )}
        />
        {state}
      </span>
    </div>
  );
}

type TirukanPhase = 'idle' | 'countdown' | 'recording' | 'scoring' | 'result';

function StageTirukan({
  missionId,
  chapterNumber,
  missionNumber,
  videos,
  replay = false,
  onFinish,
}: {
  missionId: string;
  chapterNumber: string;
  missionNumber: string;
  videos: ReturnType<typeof getAlphabetVideosForMission>;
  replay?: boolean;
  onFinish: () => void;
}) {
  const [practiced, setPracticed] = useState<Set<AlphabetLetter>>(() => {
    const saved = getPracticedLetters(missionId);
    if (saved.size > 0) return saved;
    if (isAlphabetPracticeCompleted(missionId)) {
      return new Set(videos.map((v) => v.letter));
    }
    return new Set();
  });

  const [selectedLetter, setSelectedLetter] = useState<AlphabetLetter>(() => {
    const saved = getPracticedLetters(missionId);
    const unpracticed = videos.find((v) => !saved.has(v.letter));
    return unpracticed ? unpracticed.letter : videos[0].letter;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const referenceRef = useRef<GestureFrame[]>([]);
  const referencesRef = useRef<AlphabetReferenceSet>({ frames: {}, variants: {} });
  const capturedRef = useRef<GestureFrame[]>([]);
  const frameRequestRef = useRef<number | null>(null);
  const renderFrameRef = useRef<(() => void) | null>(null);
  const lastInferenceRef = useRef(0);
  const lastLightingCheckRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const recordStartRef = useRef(0);
  const phaseRef = useRef<TirukanPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const attemptLetterRef = useRef(selectedLetter);

  const [cameraActive, setCameraActive] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [referenceState, setReferenceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [phase, setPhase] = useState<TirukanPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [handCount, setHandCount] = useState(0);
  const [requiredHands, setRequiredHands] = useState<1 | 2>(1);
  const [lighting, setLighting] = useState<LightingStatus>('unknown');
  const [result, setResult] = useState<AlphabetAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentVideo = useMemo(
    () => videos.find((v) => v.letter === selectedLetter) ?? videos[0],
    [videos, selectedLetter],
  );

  const allPracticed = videos.length > 0 && videos.every((v) => practiced.has(v.letter));

  const handlePassed = useCallback(
    (letter: AlphabetLetter) => {
      setPracticed((previous) => {
        const next = new Set(previous).add(letter);
        savePracticedLetters(missionId, next);
        return next;
      });
    },
    [missionId],
  );

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    timerRef.current = null;
    countdownIntervalRef.current = null;
    if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
    frameRequestRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setCameraActive(false);
    setLoadingCamera(false);
    setHandCount(0);
    setLighting('unknown');
    phaseRef.current = 'idle';
    setPhase('idle');
  }, []);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.paused || !mountedRef.current) return;
    const now = performance.now();
    if (
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTimeRef.current &&
      now - lastInferenceRef.current >= 66
    ) {
      lastVideoTimeRef.current = video.currentTime;
      lastInferenceRef.current = now;
      try {
        const detection = landmarker.detectForVideo(video, now);
        const hands: HandObservation[] = detection.landmarks.map((landmarks, index) => ({
          landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
          worldLandmarks: detection.worldLandmarks[index]?.map(({ x, y, z }) => ({ x, y, z })),
          handedness: detection.handedness[index]?.[0]?.categoryName ?? 'Right',
          confidence: detection.handedness[index]?.[0]?.score ?? 0,
        }));
        if (canvasRef.current) drawHandLandmarks(canvasRef.current, video, hands);
        setHandCount((previous) => (previous === hands.length ? previous : hands.length));

        if (now - lastLightingCheckRef.current >= 600) {
          lastLightingCheckRef.current = now;
          if (!brightnessCanvasRef.current) {
            brightnessCanvasRef.current = document.createElement('canvas');
          }
          setLighting(readFrameLighting(video, brightnessCanvasRef.current));
        }

        if (phaseRef.current === 'recording') {
          capturedRef.current.push({ timeMs: Math.round(now - recordStartRef.current), hands });
        }
      } catch {
        // Keep loop alive
      }
    }
    frameRequestRef.current = requestAnimationFrame(() => renderFrameRef.current?.());
  }, []);

  const startCamera = useCallback(async () => {
    if (loadingCamera || cameraActive) return;
    setLoadingCamera(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Kamera tidak siap.');
      video.srcObject = stream;
      await video.play();
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (!mountedRef.current) {
        landmarker.close();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      landmarkerRef.current = landmarker;
      setCameraActive(true);
      setLoadingCamera(false);
      renderFrameRef.current = renderFrame;
      frameRequestRef.current = requestAnimationFrame(renderFrame);
    } catch {
      stopCamera();
      if (mountedRef.current) {
        setError('Kamera atau model landmark tidak dapat dimuat. Periksa izin dan koneksi, lalu coba lagi.');
      }
    }
  }, [cameraActive, loadingCamera, renderFrame, stopCamera]);

  const finishRecording = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    phaseRef.current = 'scoring';
    setPhase('scoring');
    const currentLetter = attemptLetterRef.current;
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current || currentLetter !== attemptLetterRef.current) return;
      const assessment = scoreAlphabetWithAlternatives(
        currentLetter,
        referenceRef.current,
        capturedRef.current,
        referencesRef.current,
      );
      setResult(assessment);
      phaseRef.current = 'result';
      setPhase('result');
      if (assessment.passed) {
        handlePassed(currentLetter);
      }
    }, 40);
  }, [handlePassed]);

  const beginRecording = useCallback(() => {
    if (
      !cameraActive ||
      referenceState !== 'ready' ||
      phaseRef.current === 'recording' ||
      phaseRef.current === 'countdown'
    )
      return;
    capturedRef.current = [];
    setResult(null);
    setCountdown(3);
    phaseRef.current = 'countdown';
    setPhase('countdown');
    let remaining = 3;
    countdownIntervalRef.current = setInterval(() => {
      if (phaseRef.current !== 'countdown') return;
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        recordStartRef.current = performance.now();
        phaseRef.current = 'recording';
        setPhase('recording');
        timerRef.current = setTimeout(
          finishRecording,
          selectedLetter === 'J' || selectedLetter === 'Z' ? 4000 : 3000,
        );
      }
    }, 1000);
  }, [cameraActive, finishRecording, referenceState, selectedLetter]);

  const cancelPractice = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    timerRef.current = null;
    countdownIntervalRef.current = null;
    capturedRef.current = [];
    phaseRef.current = 'idle';
    setPhase('idle');
  }, []);

  const retryPractice = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    timerRef.current = null;
    countdownIntervalRef.current = null;
    capturedRef.current = [];
    setResult(null);
    phaseRef.current = 'idle';
    setPhase('idle');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    attemptLetterRef.current = selectedLetter;
    referenceRef.current = [];
    capturedRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    timerRef.current = null;
    countdownIntervalRef.current = null;
    queueMicrotask(() => {
      if (cancelled) return;
      phaseRef.current = 'idle';
      setPhase('idle');
      setResult(null);
      setReferenceState('loading');
    });
    void Promise.all([
      getAlphabetReferenceFrames(currentVideo.videoSrc),
      getAlphabetReferenceSet(),
    ])
      .then(([frames, references]) => {
        if (cancelled) return;
        referenceRef.current = frames;
        referencesRef.current = references;
        setRequiredHands(getRequiredHandCount(frames));
        setReferenceState('ready');
      })
      .catch(() => {
        if (!cancelled) setReferenceState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLetter, currentVideo.videoSrc]);

  return (
    <div>
      {/* Chapter / Mission Badge & Replay badge */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full bg-[#00D5D1] px-4 py-1 text-xs font-black text-slate-900 shadow-2xs">
          Bab {chapterNumber} • Misi {missionNumber}
        </span>
        {replay ? (
          <Badge className="bg-[#FFAE00] text-slate-900 font-black rounded-full px-3 py-1">
            <RotateCcw className="size-3" /> Mode ulang misi
          </Badge>
        ) : null}
      </div>

      {/* Heading */}
      <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
        Latih tanda “Huruf {selectedLetter}”
      </h1>

      {/* Horizontal Alphabet Stepper */}
      <div className="my-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-[#FFAE00]/60 bg-[#FFFDF7] px-6 sm:px-8 py-3.5 shadow-xs">
        {/* HURUF Icon and Label */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="grid size-6 place-items-center rounded-full border-2 border-[#E54D2E]">
            <span className="size-2 rounded-full bg-[#E54D2E]" />
          </span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
            HURUF
          </span>
        </div>

        {/* Connected Word Track */}
        <div className="relative flex flex-1 items-center justify-between min-w-0 max-w-4xl px-2 sm:px-4 py-1 overflow-x-auto scrollbar-none">
          {/* Continuous Connecting Line */}
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-300 -z-0" />

          {videos.map(({ letter }, index) => {
            const active = letter === selectedLetter;
            const isPassed = practiced.has(letter);
            const isUnlocked =
              replay ||
              allPracticed ||
              index === 0 ||
              videos.slice(0, index).every((v) => practiced.has(v.letter));

            if (!isUnlocked) {
              return (
                <div key={letter} className="relative z-10 shrink-0 px-1">
                  <span
                    aria-disabled="true"
                    title="Selesaikan huruf sebelumnya terlebih dahulu"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#B8BFC6] px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 cursor-not-allowed select-none whitespace-nowrap"
                  >
                    <LockKeyhole className="size-3.5 text-slate-700 shrink-0 stroke-[2.5]" />
                    {letter}
                  </span>
                </div>
              );
            }

            return (
              <div key={letter} className="relative z-10 shrink-0 px-1">
                <button
                  type="button"
                  onClick={() => setSelectedLetter(letter)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer',
                    active
                      ? 'border-2 border-[#00D5D1] bg-white text-slate-900 shadow-xs ring-2 ring-[#00D5D1]/30'
                      : 'border border-transparent bg-[#ECEFF3] text-slate-700 hover:bg-slate-200 hover:text-slate-900',
                  )}
                >
                  {isPassed && !active ? (
                    <Check className="size-3.5 text-emerald-600 stroke-[3] shrink-0" />
                  ) : null}
                  {letter}
                </button>
              </div>
            );
          })}

          {/* Latihan pill */}
          <div className="relative z-10 shrink-0 px-1">
            {allPracticed ? (
              <button
                type="button"
                onClick={onFinish}
                className="inline-block rounded-full border-2 border-[#FFAE00] bg-white px-5 py-1.5 text-xs sm:text-sm font-black text-[#E54D2E] shadow-2xs hover:bg-amber-50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              >
                Latihan
              </button>
            ) : (
              <span
                aria-disabled="true"
                title="Selesaikan seluruh huruf sebelum latihan"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#B8BFC6] px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 cursor-not-allowed select-none whitespace-nowrap"
              >
                <LockKeyhole className="size-3.5 text-slate-700 shrink-0 stroke-[2.5]" />
                Latihan
              </span>
            )}
          </div>

          {/* Flag */}
          <div className="relative z-10 shrink-0 pl-1">
            <Flag
              className={cn(
                'size-5 transition-colors',
                allPracticed
                  ? 'text-[#E54D2E] fill-[#E54D2E]'
                  : 'text-[#8C95A0] fill-[#8C95A0]',
              )}
            />
          </div>
        </div>
      </div>

      {/* 3-Column Practice Area */}
      <div className="grid items-start gap-5 grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[300px_1fr_300px]">
        {/* Column 1: CONTOH TANDA */}
        <aside className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-xs border border-amber-200/50">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
              CONTOH TANDA
            </span>
            <div className="mt-4 overflow-hidden rounded-2xl bg-black aspect-[4/3] relative">
              <video
                key={currentVideo.videoSrc}
                className="size-full object-contain"
                src={currentVideo.videoSrc}
                aria-label={`Video contoh tanda Huruf ${selectedLetter}`}
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
              AMATI SECARA MENYELURUH
            </span>
            <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm font-black text-slate-800">
              <li className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-[#00D5D1] shrink-0" />
                <span>Bentuk tangan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-[#FFAE00] shrink-0" />
                <span>Posisi terhadap tubuh</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-[#E54D2E] shrink-0" />
                <span>Arah telapak</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-[#1E293B] shrink-0" />
                <span>Ekspresi Wajah</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Column 2: Center Camera Practice */}
        <section className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-xs border border-amber-200/50">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
                KAMERA LATIHAN
              </span>
              {cameraActive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Kamera Aktif
                </span>
              )}
            </div>

            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950 sm:min-h-[360px] shadow-inner">
              <video
                ref={videoRef}
                className={cn(
                  'absolute inset-0 size-full -scale-x-100 object-cover transition-opacity',
                  cameraActive ? 'opacity-100' : 'opacity-0',
                )}
                autoPlay
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 size-full -scale-x-100"
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-[10%] rounded-[45%] border border-dashed border-white/25"
                aria-hidden="true"
              />

              {!cameraActive && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div className="max-w-md">
                    <span className="mx-auto grid size-16 sm:size-20 place-items-center rounded-full border border-white/10 bg-white/5 text-white">
                      <Camera className="size-8" />
                    </span>
                    <h2 className="mt-5 text-2xl sm:text-3xl font-black text-white">
                      Siapkan kamera latihan
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/60">
                      Video diproses langsung di browser. BISARA tidak merekam atau
                      menyimpan video latihan ini.
                    </p>
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => {
                        void startCamera();
                      }}
                      disabled={loadingCamera}
                      className="mt-6 h-12 rounded-full bg-[#F8A51D] px-7 font-black text-slate-950 hover:bg-[#E59312] transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    >
                      {loadingCamera ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Camera className="size-4" />
                      )}
                      {loadingCamera ? 'Menyiapkan kamera…' : 'Aktifkan kamera'}
                    </Button>
                    {error && (
                      <p className="mt-3 text-xs leading-5 text-[#E54D2E]">
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {cameraActive && phase !== 'countdown' && phase !== 'scoring' && (
                <div className="absolute inset-x-3 top-3 flex items-start sm:inset-x-4 sm:top-4">
                  <span
                    className={cn(
                      'max-w-full whitespace-normal break-words rounded-full px-3 py-2 text-center text-xs font-extrabold leading-4 backdrop-blur-sm',
                      handCount > 0
                        ? 'bg-emerald-500 text-white'
                        : 'bg-black/45 text-white',
                    )}
                  >
                    {handCount > 0
                      ? handCount >= requiredHands && requiredHands === 2
                        ? 'Kedua tangan terdeteksi'
                        : 'Tangan terdeteksi'
                      : 'Posisikan tangan di dalam bingkai'}
                  </span>
                </div>
              )}

              {/* Countdown overlay */}
              {cameraActive && phase === 'countdown' && (
                <div className="absolute inset-0 grid place-items-center bg-slate-950/40 backdrop-blur-sm">
                  <output className="text-center" aria-live="polite">
                    <span className="mx-auto grid size-24 place-items-center rounded-full bg-[#FFAE00] text-5xl font-black text-slate-900">
                      {countdown}
                    </span>
                    <p className="mt-4 text-sm font-bold text-white">
                      Bersiap — peragakan huruf {selectedLetter} setelah hitungan
                    </p>
                    <p className="mt-2 text-xs text-white/70">
                      Pastikan tangan masuk bingkai saat “Mulai!”
                    </p>
                  </output>
                </div>
              )}

              {/* Recording indicator */}
              {cameraActive && phase === 'recording' && (
                <>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="rounded-full bg-[#F8A51D] px-6 py-3 text-2xl font-black text-slate-900 shadow-lg">
                      Mulai!
                    </span>
                  </div>
                  <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-full bg-black/50 px-4 py-2.5 backdrop-blur-sm">
                    <span className="size-3 animate-pulse rounded-full bg-[#E54D2E]" />
                    <span className="text-xs font-bold text-white">
                      Peragakan huruf {selectedLetter} lalu tahan…
                    </span>
                  </div>
                </>
              )}

              {/* Scoring overlay */}
              {cameraActive && phase === 'scoring' && (
                <div className="absolute inset-0 grid place-items-center bg-slate-950/60 p-6 text-center backdrop-blur-sm">
                  <div>
                    <LoaderCircle className="mx-auto size-8 animate-spin text-[#F8A51D]" />
                    <p className="mt-4 text-sm font-bold text-white">
                      Menganalisis kecocokan gerakan…
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Unified Bottom Control Bar matching rest of white cards */}
          <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between text-slate-900">
            <div aria-live="polite">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 block">
                STATUS KAMERA
              </span>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                {!cameraActive
                  ? 'Kamera belum aktif'
                  : phase === 'countdown'
                    ? 'Bersiap…'
                    : phase === 'recording'
                      ? `Merekam gerakan huruf “${selectedLetter}”…`
                      : phase === 'scoring'
                        ? 'Menganalisis kecocokan gerakan…'
                        : phase === 'result'
                          ? 'Latihan selesai'
                          : 'Kamera aktif & siap berlatih'}
              </p>
            </div>

            {cameraActive && (
              <div className="flex flex-wrap items-center gap-2">
                {phase === 'idle' && (
                  <Button
                    type="button"
                    onClick={beginRecording}
                    disabled={referenceState !== 'ready'}
                    className="rounded-full bg-[#F8A51D] px-5 py-2 font-black text-slate-950 hover:bg-[#E59312] shadow-xs cursor-pointer"
                  >
                    <Play className="size-4 fill-current" /> Mulai latihan
                  </Button>
                )}
                {(phase === 'countdown' || phase === 'recording') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelPractice}
                    className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                  >
                    <X className="size-4" /> Batalkan
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={retryPractice}
                  disabled={phase !== 'idle' && phase !== 'result'}
                  className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Muat ulang
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopCamera}
                  className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  <CameraOff className="size-4" /> Matikan
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Column 3: KALIBRASI or HASIL LATIHAN */}
        {phase === 'result' && result ? (
          <aside className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-xs border border-amber-200/50">
            <div>
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-[#E54D2E]">
                  HASIL LATIHAN
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {result.passed
                    ? 'Gerakan sesuai!'
                    : result.assessable
                      ? 'Belum sesuai'
                      : 'Belum bisa dinilai'}
                </h2>
                <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  {result.feedback}
                </p>
              </div>

              {result.assessable && (
                <div className="space-y-3">
                  <QualitativeMetric label="Bentuk tangan" value={result.shape} />
                  <QualitativeMetric label="Arah telapak" value={result.orientation} />
                  {result.coordination !== null && (
                    <QualitativeMetric
                      label="Koordinasi dua tangan"
                      value={result.coordination}
                    />
                  )}
                  {result.movement !== null && (
                    <QualitativeMetric label="Gerakan" value={result.movement} />
                  )}
                </div>
              )}

              {result.passed && (
                <div className="mt-5 border border-emerald-500 bg-emerald-50 p-4 rounded-2xl">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
                    <Check className="size-4" strokeWidth={3} />{' '}
                    {allPracticed
                      ? 'Tahap Tirukan selesai'
                      : `Huruf ${selectedLetter} lulus`}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-slate-700">
                    {allPracticed
                      ? 'Seluruh huruf dalam misi ini sudah sesuai dengan contoh.'
                      : `Bagus! Huruf ${selectedLetter} sudah sesuai. Lanjutkan ke huruf berikutnya.`}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-2">
              {result.passed &&
                (allPracticed ? (
                  <Button
                    type="button"
                    onClick={onFinish}
                    className="h-11 w-full rounded-full bg-[#F8A51D] font-black text-slate-900 hover:bg-[#E59312] shadow-xs cursor-pointer"
                  >
                    Lanjut ke Uji pengenalan <ArrowRight className="size-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      const nextLetter = videos.find(
                        (v) => !practiced.has(v.letter),
                      )?.letter;
                      if (nextLetter) {
                        setSelectedLetter(nextLetter);
                        retryPractice();
                      }
                    }}
                    className="h-11 w-full rounded-full bg-[#F8A51D] font-black text-slate-900 hover:bg-[#E59312] shadow-xs cursor-pointer"
                  >
                    Huruf berikutnya <ArrowRight className="size-4 ml-1" />
                  </Button>
                ))}
              <Button
                type="button"
                variant={result.passed ? 'outline' : 'default'}
                onClick={retryPractice}
                className={cn(
                  'h-11 w-full rounded-full font-black cursor-pointer',
                  result.passed
                    ? 'border-slate-300 text-slate-800 hover:bg-slate-50'
                    : 'bg-[#F8A51D] text-slate-900 hover:bg-[#E59312] shadow-xs',
                )}
              >
                <RotateCcw className="size-4 mr-1.5" /> Coba lagi
              </Button>
            </div>
          </aside>
        ) : (
          <aside className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-xs border border-amber-200/50">
            <div>
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                    KALIBRASI
                  </p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    Sebelum berlatih
                  </h2>
                </div>
                <ShieldCheck className="size-6 text-[#FFAE00]" />
              </div>

              <ul className="space-y-5">
                {/* 1. Kamera Aktif */}
                <li className="flex items-center gap-3.5">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-full',
                      cameraActive
                        ? 'bg-[#00D5D1]/20 text-emerald-800'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {cameraActive ? (
                      <Check className="size-5 stroke-[2.5] text-emerald-700" />
                    ) : (
                      <Camera className="size-5" />
                    )}
                  </span>
                  <div>
                    <span className="block text-sm font-black text-slate-900">
                      Kamera aktif
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {cameraActive ? 'Siap' : 'Belum siap'}
                    </span>
                  </div>
                </li>

                {/* 2. Pencahayaan */}
                <li className="flex items-center gap-3.5">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-full',
                      lighting === 'good'
                        ? 'bg-[#00D5D1]/20 text-emerald-800'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {lighting === 'good' ? (
                      <Check className="size-5 stroke-[2.5] text-emerald-700" />
                    ) : (
                      <SunMedium className="size-5" />
                    )}
                  </span>
                  <div>
                    <span className="block text-sm font-black text-slate-900">
                      Pencahayaan
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {cameraActive ? lightingLabel(lighting) : 'Belum diperiksa'}
                    </span>
                  </div>
                </li>

                {/* 3. Tangan Terlihat */}
                <li className="flex items-center gap-3.5">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-full',
                      handCount > 0
                        ? 'bg-[#00D5D1]/20 text-emerald-800'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {handCount > 0 ? (
                      <Check className="size-5 stroke-[2.5] text-emerald-700" />
                    ) : (
                      <Hand className="size-5" />
                    )}
                  </span>
                  <div>
                    <span className="block text-sm font-black text-slate-900">
                      Tangan terlihat
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {handCount > 0
                        ? handCount >= requiredHands && requiredHands === 2
                          ? 'Kedua tangan terdeteksi'
                          : 'Terdeteksi'
                        : 'Belum terdeteksi'}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-7 border-t border-slate-200 pt-5">
              <p className="text-xs font-medium leading-relaxed text-slate-500">
                Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat,
                dan beri ruang di sekitar kedua tangan.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. TAHAP 3: UJI PENGENALAN (Consistent with Image 2 & MissionAssessment)
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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState<
    Array<{ letter: AlphabetLetter; selected: AlphabetLetter; correct: boolean }>
  >([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ: AlphabetQuestion | undefined = questions[currentIndex];

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQ || isSubmitted) return;
    const isCorrect = selectedOption === currentQ.letter;
    setIsSubmitted(true);
    setAnswers((prev) => [
      ...prev,
      { letter: currentQ.letter, selected: selectedOption, correct: isCorrect },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
      const correctCount = answers.filter((a) => a.correct).length;
      const finalScore = Math.round((correctCount / questions.length) * 100);
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
    setIsSubmitted(false);
    setAnswers([]);
    setIsCompleted(false);
  };

  if (isCompleted) {
    const correctCount = answers.filter((a) => a.correct).length;
    const finalScore = Math.round((correctCount / questions.length) * 100);
    const passed = finalScore >= RECOGNITION_PASS_SCORE;
    const missed = answers.filter((a) => !a.correct);

    return (
      <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 lg:p-10 shadow-xs border border-amber-200/50">
        <div className="max-w-2xl mx-auto py-4">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider',
              passed
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#FFF0ED] text-[#E54D2E]',
            )}
          >
            {passed ? 'Lulus' : 'Perlu diulang'}
          </span>

          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            {correctCount} dari {questions.length} jawaban benar
          </h2>

          <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 max-w-xl">
            {passed
              ? `Bagus! Kamu sudah mencapai skor kelulusan (${finalScore}/100). Butuh minimal 70 poin untuk membuka tahap peragaan.`
              : `Skor minimal kelulusan adalah ${RECOGNITION_PASS_SCORE} poin (${finalScore}/100). Tonton ulang huruf yang keliru lalu coba lagi.`}
          </p>

          {/* Question Pills */}
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
          {missed.length > 0 && (
            <div className="mt-6 w-full rounded-2xl border border-amber-200/60 bg-[#FFFDF5] p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                Huruf yang perlu diperkuat :
              </p>
              <ul className="mt-2.5 space-y-2 text-xs sm:text-sm">
                {missed.map((answer) => (
                  <li
                    key={answer.letter}
                    className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-700"
                  >
                    <span>
                      Jawabanmu:{' '}
                      <strong className="text-slate-900 font-bold">
                        Huruf {answer.selected}
                      </strong>{' '}
                      · Huruf benar:{' '}
                      <strong className="text-emerald-700 font-bold">
                        Huruf {answer.letter}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="size-4 stroke-[2.5]" />
              <span>Coba lagi</span>
            </button>

            {passed && (
              <button
                type="button"
                onClick={onPass}
                className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00] px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xs transition-transform hover:bg-[#ff9f00] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Lanjut ke Uji peragaan</span>
                <ArrowRight className="size-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;
  const percentage = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 lg:p-10 shadow-xs border border-amber-200/50">
      {/* Top Progress Track matching Image 2 */}
      <div className="mb-6 sm:mb-8 border-b border-slate-100 pb-6">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
          <span className="text-slate-900">
            Soal {currentIndex + 1} dari {questions.length}
          </span>
          <span className="text-slate-500">{percentage}%</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#E54D2E] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Question Heading matching Image 2 */}
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
          PERHATIKAN TANDA
        </span>
        <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Apa arti tanda dalam video ini?
        </h2>
      </div>

      {/* 2-Column Grid matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 sm:gap-10 items-start mt-4">
        {/* Left: Video */}
        <div>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black shadow-inner">
            <div className="absolute top-3.5 left-3.5 z-10 rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
              WL-BISINDO • Banten
            </div>
            <video
              key={currentQ.videoSrc}
              src={currentQ.videoSrc}
              aria-label="Video peragaan huruf"
              className="size-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          </div>
        </div>

        {/* Right: Choices & Submit */}
        <div className="flex flex-col justify-between h-full pt-1">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 block mb-4">
              PILIH SATU JAWABAN
            </span>
            <div className="space-y-3" role="radiogroup">
              {currentQ.options.map((option, optionIndex) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentQ.letter;

                let containerStyle = isSelected
                  ? 'border-slate-900 bg-slate-50/50 shadow-xs'
                  : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/30';
                let circleStyle = isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700';

                if (isSubmitted) {
                  if (isCorrect) {
                    containerStyle = 'border-emerald-500 bg-emerald-50/60 shadow-xs';
                    circleStyle = 'border-emerald-600 bg-emerald-600 text-white';
                  } else if (isSelected) {
                    containerStyle = 'border-[#E54D2E] bg-red-50/60 shadow-xs';
                    circleStyle = 'border-[#E54D2E] bg-[#E54D2E] text-white';
                  } else {
                    containerStyle = 'border-slate-100 bg-white/50 opacity-60';
                  }
                }

                return (
                  <button
                    type="button"
                    key={option}
                    disabled={isSubmitted}
                    onClick={() => setSelectedOption(option)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border-2 p-4 sm:p-5 text-left transition-all cursor-pointer select-none',
                      containerStyle,
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 sm:size-9 shrink-0 place-items-center rounded-full border text-xs sm:text-sm font-black transition-colors',
                        circleStyle,
                      )}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-900">
                      Huruf {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback & Submit / Next button */}
          <div className="mt-6 sm:mt-8 space-y-3">
            {isSubmitted && (
              <div
                className={cn(
                  'rounded-2xl border p-4 flex items-center gap-3',
                  selectedOption === currentQ.letter
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-[#E54D2E]',
                )}
              >
                {selectedOption === currentQ.letter ? (
                  <>
                    <Check className="size-5 text-emerald-600 stroke-[3] shrink-0" />
                    <span className="font-bold text-xs sm:text-sm">
                      Tepat! Ini adalah huruf {currentQ.letter}.
                    </span>
                  </>
                ) : (
                  <>
                    <X className="size-5 text-[#E54D2E] stroke-[3] shrink-0" />
                    <span className="font-bold text-xs sm:text-sm">
                      Kurang tepat. Jawaban yang benar adalah huruf {currentQ.letter}.
                    </span>
                  </>
                )}
              </div>
            )}

            {!isSubmitted ? (
              <button
                type="button"
                disabled={selectedOption === null}
                onClick={handleSubmitAnswer}
                className={cn(
                  'w-full rounded-2xl py-4 text-sm font-black transition-all flex items-center justify-center gap-2 select-none shadow-xs',
                  selectedOption !== null
                    ? 'bg-slate-700 sm:bg-slate-800 hover:bg-slate-900 text-white cursor-pointer'
                    : 'bg-[#94A3B8] text-white cursor-not-allowed opacity-90',
                )}
              >
                <span>Periksa jawaban</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 py-4 text-sm font-black text-white cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span>
                  {currentIndex + 1 < questions.length
                    ? 'Lanjut ke soal berikutnya'
                    : 'Lihat hasil evaluasi'}
                </span>
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. TAHAP 4: UJI PERAGAAN (Consistent with Image 3 & ProductionTest)
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

  const currentVideo = videos[step] ?? videos[0];
  const currentLetter = currentVideo.letter;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const referenceRef = useRef<GestureFrame[]>([]);
  const referencesRef = useRef<AlphabetReferenceSet>({ frames: {}, variants: {} });
  const capturedRef = useRef<GestureFrame[]>([]);
  const frameRequestRef = useRef<number | null>(null);
  const renderFrameRef = useRef<(() => void) | null>(null);
  const lastInferenceRef = useRef(0);
  const lastLightingCheckRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const recordStartRef = useRef(0);
  const phaseRef = useRef<TirukanPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const attemptLetterRef = useRef(currentLetter);

  const [cameraActive, setCameraActive] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [referenceState, setReferenceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [phase, setPhase] = useState<TirukanPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [handCount, setHandCount] = useState(0);
  const [requiredHands, setRequiredHands] = useState<1 | 2>(1);
  const [lighting, setLighting] = useState<LightingStatus>('unknown');
  const [result, setResult] = useState<AlphabetAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setPracticePhase = useCallback((next: TirukanPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = null;
    if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
    frameRequestRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setCameraActive(false);
    setLoadingCamera(false);
    setHandCount(0);
    setPracticePhase('idle');
  }, [setPracticePhase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    attemptLetterRef.current = currentLetter;
    queueMicrotask(() => {
      if (cancelled) return;
      setReferenceState('loading');
      setResult(null);
    });
    void Promise.all([
      getAlphabetReferenceFrames(currentVideo.videoSrc),
      getAlphabetReferenceSet(),
    ])
      .then(([frames, references]) => {
        if (cancelled) return;
        referenceRef.current = frames;
        referencesRef.current = references;
        setRequiredHands(getRequiredHandCount(frames));
        setReferenceState('ready');
      })
      .catch(() => {
        if (!cancelled) setReferenceState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [currentLetter, currentVideo.videoSrc]);

  const finishRecording = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    phaseRef.current = 'scoring';
    setPhase('scoring');
    const letter = attemptLetterRef.current;
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current || letter !== attemptLetterRef.current) return;
      const assessment = scoreAlphabetWithAlternatives(
        letter,
        referenceRef.current,
        capturedRef.current,
        referencesRef.current,
      );
      setResult(assessment);
      setPracticePhase('result');
      if (assessment.passed) {
        setPassedLetters((prev) => new Set(prev).add(letter));
      }
    }, 40);
  }, [setPracticePhase]);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.paused || !mountedRef.current) return;
    const now = performance.now();
    if (
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTimeRef.current &&
      now - lastInferenceRef.current >= 66
    ) {
      lastVideoTimeRef.current = video.currentTime;
      lastInferenceRef.current = now;
      try {
        const detection = landmarker.detectForVideo(video, now);
        const hands: HandObservation[] = detection.landmarks.map((landmarks, index) => ({
          landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
          worldLandmarks: detection.worldLandmarks[index]?.map(({ x, y, z }) => ({ x, y, z })),
          handedness: detection.handedness[index]?.[0]?.categoryName ?? 'Right',
          confidence: detection.handedness[index]?.[0]?.score ?? 0,
        }));
        if (canvasRef.current) drawHandLandmarks(canvasRef.current, video, hands);
        setHandCount((previous) => (previous === hands.length ? previous : hands.length));

        if (now - lastLightingCheckRef.current >= 600) {
          lastLightingCheckRef.current = now;
          if (!brightnessCanvasRef.current) {
            brightnessCanvasRef.current = document.createElement('canvas');
          }
          setLighting(readFrameLighting(video, brightnessCanvasRef.current));
        }

        if (phaseRef.current === 'recording') {
          capturedRef.current.push({ timeMs: Math.round(now - recordStartRef.current), hands });
        }
      } catch {
        // Keep loop alive
      }
    }
    frameRequestRef.current = requestAnimationFrame(() => renderFrameRef.current?.());
  }, []);

  const startCamera = useCallback(async () => {
    if (loadingCamera || cameraActive) return;
    setLoadingCamera(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Kamera tidak siap.');
      video.srcObject = stream;
      await video.play();
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (!mountedRef.current) {
        landmarker.close();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      landmarkerRef.current = landmarker;
      setCameraActive(true);
      setLoadingCamera(false);
      renderFrameRef.current = renderFrame;
      frameRequestRef.current = requestAnimationFrame(renderFrame);
    } catch {
      stopCamera();
      if (mountedRef.current) {
        setError('Kamera atau model landmark tidak dapat dimuat. Periksa izin dan koneksi, lalu coba lagi.');
      }
    }
  }, [cameraActive, loadingCamera, renderFrame, stopCamera]);

  const beginPractice = useCallback(() => {
    if (!cameraActive || referenceState !== 'ready' || phaseRef.current === 'recording' || phaseRef.current === 'countdown') return;
    capturedRef.current = [];
    setResult(null);
    setCountdown(3);
    setPracticePhase('countdown');
    let remaining = 3;
    countdownIntervalRef.current = setInterval(() => {
      if (phaseRef.current !== 'countdown') return;
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        recordStartRef.current = performance.now();
        setPracticePhase('recording');
        timerRef.current = setTimeout(
          finishRecording,
          currentLetter === 'J' || currentLetter === 'Z' ? 4000 : 3000,
        );
      }
    }, 1000);
  }, [cameraActive, currentLetter, finishRecording, referenceState, setPracticePhase]);

  const handleNextLetter = () => {
    setShowHint(false);
    if (step + 1 < videos.length) {
      setStep((prev) => prev + 1);
      setResult(null);
      setPracticePhase('idle');
    } else {
      setCompleted(true);
      stopCamera();
      recordMissionCompletion(mission.id);
    }
  };

  if (completed) {
    const nextMission = allMissions[getMissionPosition(mission.id) + 1];
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
            {videos.length} huruf telah berhasil kamu peragakan di depan kamera tanpa contoh. Progresmu tersimpan!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onRestart}
            className="rounded-full font-black border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer w-full sm:w-auto"
          >
            <RotateCcw className="size-4 mr-2" /> Ulangi dari awal
          </Button>
          {nextMission ? (
            <Link
              href={nextMission.href}
              className={cn(
                buttonVariants(),
                'rounded-full bg-[#00D5D1] font-black text-slate-900 hover:bg-[#00c2be] px-8 shadow-xs w-full sm:w-auto',
              )}
            >
              Lanjut ke: {nextMission.title} <ArrowRight className="size-4 ml-2" />
            </Link>
          ) : (
            <Link
              href="/missions"
              className={cn(
                buttonVariants(),
                'rounded-full bg-[#00D5D1] font-black text-slate-900 hover:bg-[#00c2be] px-8 shadow-xs w-full sm:w-auto',
              )}
            >
              Kembali ke perjalanan <ArrowRight className="size-4 ml-2" />
            </Link>
          )}
        </div>
      </section>
    );
  }

  const isPassedCurrent = passedLetters.has(currentLetter);
  const progressPercent = Math.round(((step + 1) / videos.length) * 100);

  return (
    <section className="rounded-[2.5rem] bg-white p-6 sm:p-8 lg:p-10 shadow-xs border border-amber-200/50">
      {/* Top Progress Track matching Image 3 */}
      <div className="mb-6 sm:mb-8 border-b border-slate-100 pb-6">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
          <span className="text-slate-900">
            Soal {step + 1} dari {videos.length}
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

      {/* Heading matching Image 3 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block">
            TIRUKAN TANDA
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
            Tunjukkan isyarat untuk kata: <span className="text-slate-900">Huruf {currentLetter}</span>
          </h2>
        </div>
      </div>

      {/* 2-Column Layout matching Image 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 sm:gap-10 items-start mt-6 sm:mt-8">
        {/* Left Column: Camera Box */}
        <div className="overflow-hidden rounded-2xl bg-[#0F172A] shadow-inner border border-slate-800">
          <div className="relative aspect-[16/10] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                'absolute inset-0 size-full -scale-x-100 object-cover transition-opacity',
                cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              <track kind="captions" />
            </video>
            <canvas
              ref={canvasRef}
              className={cn(
                'pointer-events-none absolute inset-0 size-full -scale-x-100 transition-opacity',
                cameraActive ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden="true"
            />

            {!cameraActive && (
              <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-xs">
                  <Camera className="size-7" />
                </div>
                <h3 className="mt-4 text-xl sm:text-2xl font-black text-white">
                  Siapkan kamera latihan
                </h3>
                <p className="mt-2 max-w-sm text-xs font-medium text-slate-300 leading-relaxed">
                  Video diproses langsung di browser. BISARA tidak merekam atau menyimpan video latihan ini.
                </p>
                <button
                  type="button"
                  onClick={() => { void startCamera(); }}
                  disabled={loadingCamera}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F8A51D] px-7 py-3 text-xs sm:text-sm font-black text-slate-900 hover:bg-[#E59312] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingCamera ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" /> Menyiapkan kamera…
                    </>
                  ) : (
                    'Aktifkan kamera'
                  )}
                </button>
                {error && (
                  <p className="mt-3 text-xs text-[#E54D2E] font-bold max-w-sm">
                    {error}
                  </p>
                )}
              </div>
            )}

            {cameraActive && (
              <>
                {/* Overlays */}
                {phase === 'countdown' && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-7xl font-black text-white backdrop-blur-2xs"
                    aria-live="polite"
                  >
                    {countdown}
                  </div>
                )}
                {phase === 'recording' && (
                  <div className="absolute left-4 top-4 rounded-full bg-[#E54D2E] px-4 py-1.5 text-xs font-black text-white flex items-center gap-2 shadow-sm">
                    <span className="size-2 rounded-full bg-white animate-ping" />
                    Merekam gerakan
                  </div>
                )}
                {phase === 'scoring' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 text-white backdrop-blur-xs">
                    <LoaderCircle className="size-8 animate-spin text-[#F8A51D]" />
                    <p className="mt-3 text-xs sm:text-sm font-bold">Mengevaluasi gerakan…</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Unified Bottom Dark Status & Control Bar */}
          <div className="flex flex-col gap-3 border-t border-slate-800 bg-[#0F172A] px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 block">
                STATUS KAMERA
              </span>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
                {!cameraActive
                  ? 'Kamera belum aktif'
                  : phase === 'countdown'
                    ? 'Bersiap…'
                    : phase === 'recording'
                      ? `Merekam gerakan huruf ${currentLetter}…`
                      : phase === 'scoring'
                        ? 'Menganalisis kecocokan gerakan…'
                        : isPassedCurrent
                          ? `Tepat! Huruf ${currentLetter} berhasil diperagakan!`
                          : 'Kamera aktif & siap berlatih'}
              </p>
            </div>

            {cameraActive && (
              <div className="flex flex-wrap items-center gap-2">
                {phase === 'idle' || phase === 'result' ? (
                  <>
                    <button
                      type="button"
                      onClick={beginPractice}
                      disabled={referenceState !== 'ready'}
                      className="rounded-full bg-[#F8A51D] px-5 py-2 text-xs font-black text-slate-900 hover:bg-[#E59312] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="size-3.5 fill-current" />
                      {phase === 'result' ? 'Uji lagi' : 'Mulai uji'}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <CameraOff className="size-3.5 mr-1 inline" /> Matikan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (timerRef.current) clearTimeout(timerRef.current);
                      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                      setPracticePhase('idle');
                    }}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <X className="size-3.5 mr-1 inline" /> Batalkan
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Feedback Output Banner if evaluated */}
          {result && (
            <div
              className={cn(
                'border-t p-4 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3',
                result.passed
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-[#E54D2E]',
              )}
            >
              <div className="flex items-center gap-2">
                {result.passed ? (
                  <>
                    <Check className="size-5 text-emerald-700 stroke-[3] shrink-0" />
                    <span>Huruf {currentLetter} sesuai! Gerakan kamu tepat.</span>
                  </>
                ) : (
                  <>
                    <X className="size-5 text-[#E54D2E] stroke-[3] shrink-0" />
                    <span>{result.feedback || 'Gerakan belum sesuai. Silakan coba lagi.'}</span>
                  </>
                )}
              </div>
              {result.passed && (
                <span className="rounded-full bg-emerald-200 text-emerald-900 px-3 py-1 text-xs font-black">
                  Lulus
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Calibration Card matching Image 3 */}
        <aside className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-xs border border-amber-200/50">
          <div>
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#E54D2E]">
                  KALIBRASI
                </p>
                <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Sebelum berlatih
                </h2>
              </div>
              <ShieldCheck className="size-6 text-[#FFAE00]" />
            </div>

            <ul className="space-y-5">
              {/* 1. Kamera Aktif */}
              <li className="flex items-center gap-3.5">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full',
                    cameraActive
                      ? 'bg-[#00D5D1]/20 text-emerald-800'
                      : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {cameraActive ? (
                    <Check className="size-5 stroke-[2.5] text-emerald-700" />
                  ) : (
                    <Camera className="size-5" />
                  )}
                </span>
                <div>
                  <span className="block text-sm font-black text-slate-900">
                    Kamera aktif
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {cameraActive ? 'Siap' : 'Belum siap'}
                  </span>
                </div>
              </li>

              {/* 2. Pencahayaan */}
              <li className="flex items-center gap-3.5">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full',
                    lighting === 'good'
                      ? 'bg-[#00D5D1]/20 text-emerald-800'
                      : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {lighting === 'good' ? (
                    <Check className="size-5 stroke-[2.5] text-emerald-700" />
                  ) : (
                    <SunMedium className="size-5" />
                  )}
                </span>
                <div>
                  <span className="block text-sm font-black text-slate-900">
                    Pencahayaan
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {cameraActive ? lightingLabel(lighting) : 'Belum diperiksa'}
                  </span>
                </div>
              </li>

              {/* 3. Tangan Terlihat */}
              <li className="flex items-center gap-3.5">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full',
                    handCount > 0
                      ? 'bg-[#00D5D1]/20 text-emerald-800'
                      : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {handCount > 0 ? (
                    <Check className="size-5 stroke-[2.5] text-emerald-700" />
                  ) : (
                    <Hand className="size-5" />
                  )}
                </span>
                <div>
                  <span className="block text-sm font-black text-slate-900">
                    Tangan terlihat
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {handCount > 0
                      ? requiredHands === 2
                        ? handCount >= 2
                          ? 'Kedua tangan terdeteksi'
                          : '1 tangan terdeteksi (butuh 2)'
                        : 'Tangan terdeteksi'
                      : 'Belum terdeteksi'}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-5">
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat, dan beri ruang di sekitar kedua tangan.
            </p>
          </div>
        </aside>
      </div>

      {/* Underneath Controls: Letter Quick Jump & Video Hint Toggle */}
      <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">Daftar huruf:</span>
          {videos.map(({ letter }, idx) => {
            const isPassed = passedLetters.has(letter);
            const isCurrent = letter === currentLetter;
            return (
              <button
                type="button"
                key={letter}
                onClick={() => {
                  setStep(idx);
                  setResult(null);
                  setPracticePhase('idle');
                  setShowHint(false);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black transition-all cursor-pointer',
                  isCurrent
                    ? 'border-2 border-slate-900 bg-slate-900 text-white shadow-xs'
                    : isPassed
                      ? 'border-2 border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-2 border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {isPassed && <Check className="size-3 stroke-[3] text-emerald-600" />}
                Huruf {letter}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="text-xs font-bold text-emerald-800 underline underline-offset-4 hover:text-slate-900 cursor-pointer"
          >
            {showHint ? 'Sembunyikan petunjuk' : 'Lupa bentuknya? Lihat petunjuk video'}
          </button>

          <Button
            onClick={handleNextLetter}
            disabled={!isPassedCurrent}
            className={cn(
              'rounded-full px-7 py-3 text-sm font-black transition-all shadow-xs flex items-center gap-2 cursor-pointer',
              isPassedCurrent
                ? 'bg-[#00D5D1] text-slate-900 hover:bg-[#00c2be]'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75',
            )}
          >
            {step + 1 < videos.length ? (
              <>
                Huruf berikutnya <ArrowRight className="size-4" />
              </>
            ) : (
              <>
                Selesaikan misi <Check className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Video Hint Drawer */}
      {showHint && currentVideo && (
        <div className="mt-4 p-5 border border-amber-200/50 bg-[#FFFDF7] rounded-2xl shadow-xs space-y-3">
          <p className="text-xs font-semibold text-slate-600">
            {letterTips[currentLetter] ?? defaultLetterTip}
          </p>
          <video
            src={currentVideo.videoSrc}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="max-h-52 rounded-xl bg-black mx-auto"
          >
            <track kind="captions" />
          </video>
        </div>
      )}
    </section>
  );
}

function AlphabetGate({
  title,
  description,
  href,
  action,
  onAction,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  onAction?: () => void;
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
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-sm"
        >
          {action} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

