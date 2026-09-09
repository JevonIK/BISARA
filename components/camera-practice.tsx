'use client';

import type {
  HandLandmarker,
  HandLandmarkerResult,
} from '@mediapipe/tasks-vision';
import {
  Camera,
  CameraOff,
  Check,
  Hand,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SunMedium,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  scoreGesture,
  type GestureFrame,
  type GestureScore,
  type HandObservation,
} from '@/lib/gesture-scoring';
import { recordGestureAssessment } from '@/lib/progress-storage';
import { getReferenceFrames } from '@/lib/reference-extractor';
import { cn } from '@/lib/utils';

type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'loading-model'
  | 'loading-reference'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'error';

type PracticePhase = 'idle' | 'countdown' | 'recording' | 'scoring' | 'result';

type LightingStatus = 'unknown' | 'low' | 'good' | 'bright';

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const COUNTDOWN_SECONDS = 3;
const PRACTICE_PLAYBACK_RATE = 0.75;
const FALLBACK_RECORDING_DURATION_MS = 5000;
const REACTION_AND_FINAL_HOLD_MS = 1600;
const MIN_RECORDING_DURATION_MS = 4000;
const MAX_RECORDING_DURATION_MS = 10000;
const REFERENCE_SAMPLE_INTERVAL_MS = 66;

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

type CameraPracticeProps = {
  referenceVideoUrl: string;
  referenceVideoElementId?: string;
};

export function CameraPractice({
  referenceVideoUrl,
  referenceVideoElementId,
}: CameraPracticeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderFrameRef = useRef<FrameRequestCallback | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastInferenceRef = useRef(0);
  const lastBrightnessCheckRef = useRef(0);
  const mountedRef = useRef(true);

  // Scoring refs
  const referenceFramesRef = useRef<GestureFrame[]>([]);
  const frameBufferRef = useRef<GestureFrame[]>([]);
  const recordingStartRef = useRef(0);
  const recordingDurationRef = useRef(FALLBACK_RECORDING_DURATION_MS);
  const referenceStartRef = useRef(0);
  const practicePhaseRef = useRef<PracticePhase>('idle');
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [handCount, setHandCount] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [lighting, setLighting] = useState<LightingStatus>('unknown');

  // Scoring state
  const [practicePhase, setPracticePhase] = useState<PracticePhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(
    FALLBACK_RECORDING_DURATION_MS,
  );
  const [gestureScore, setGestureScore] = useState<GestureScore | null>(null);
  const [referenceReady, setReferenceReady] = useState(false);
  const [requiredHandCount, setRequiredHandCount] = useState(1);

  const updatePhase = useCallback((phase: PracticePhase) => {
    practicePhaseRef.current = phase;
    setPracticePhase(phase);
  }, []);

  const getReferenceVideo = useCallback(() => {
    if (!referenceVideoElementId) return null;
    return document.getElementById(
      referenceVideoElementId,
    ) as HTMLVideoElement | null;
  }, [referenceVideoElementId]);

  const resumeReferencePreview = useCallback(() => {
    const referenceVideo = getReferenceVideo();
    if (!referenceVideo) return;
    referenceVideo.loop = true;
    referenceVideo.playbackRate = 1;
    if (referenceVideo.ended) referenceVideo.currentTime = 0;
    void referenceVideo.play().catch(() => undefined);
  }, [getReferenceVideo]);

  const releaseResources = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    renderFrameRef.current = null;

    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recordingTimerRef.current !== null) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (scoringTimerRef.current !== null) {
      clearTimeout(scoringTimerRef.current);
      scoringTimerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stopCamera = useCallback(() => {
    releaseResources();
    setStatus('idle');
    setHandCount(0);
    setConfidence(null);
    setLighting('unknown');
    setErrorMessage('');
    updatePhase('idle');
    setGestureScore(null);
    setRecordingProgress(0);
    resumeReferencePreview();
    setCountdown(0);
  }, [releaseResources, resumeReferencePreview, updatePhase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseResources();
    };
  }, [releaseResources]);

  const startCamera = useCallback(async () => {
    releaseResources();
    setErrorMessage('');
    setHandCount(0);
    setConfidence(null);
    setLighting('unknown');
    updatePhase('idle');
    setGestureScore(null);
    setRecordingProgress(0);
    resumeReferencePreview();

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      setErrorMessage(
        'Browser ini belum mendukung akses kamera. Gunakan browser modern melalui HTTPS atau localhost.',
      );
      return;
    }

    try {
      setStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      setStatus('loading-model');
      const { FilesetResolver, HandLandmarker } =
        await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });

      if (!mountedRef.current) {
        landmarker.close();
        return;
      }

      landmarkerRef.current = landmarker;

      // Extract reference frames from the demo video
      setStatus('loading-reference');
      try {
        const refFrames = await getReferenceFrames(
          referenceVideoUrl,
          landmarker,
        );
        referenceFramesRef.current = refFrames;
        const timing = getReferenceTiming(refFrames);
        recordingDurationRef.current = timing.durationMs;
        referenceStartRef.current = timing.startMs;
        setRecordingDuration(timing.durationMs);
        setRequiredHandCount(getRequiredHandCount(refFrames));
        setReferenceReady(true);
      } catch {
        // Reference extraction failed — landmark-only mode continues
        setReferenceReady(false);
      }

      if (!mountedRef.current) return;

      setStatus('ready');

      const renderFrame: FrameRequestCallback = () => {
        const currentVideo = videoRef.current;
        const currentLandmarker = landmarkerRef.current;

        if (!currentVideo || !currentLandmarker || currentVideo.paused) return;

        const now = performance.now();
        const hasNewFrame =
          currentVideo.currentTime !== lastVideoTimeRef.current;
        const mayInfer = now - lastInferenceRef.current >= 66;

        if (currentVideo.readyState >= 2 && hasNewFrame && mayInfer) {
          lastVideoTimeRef.current = currentVideo.currentTime;
          lastInferenceRef.current = now;

          const results = currentLandmarker.detectForVideo(currentVideo, now);
          const overlay = canvasRef.current;
          if (overlay) {
            drawHandLandmarks(overlay, currentVideo, results);
          }

          const detectedHands = results.landmarks.length;
          setHandCount((previous) =>
            previous === detectedHands ? previous : detectedHands,
          );

          const nextConfidence = results.handedness[0]?.[0]?.score
            ? Math.round(results.handedness[0][0].score * 100)
            : null;
          setConfidence((previous) =>
            previous === nextConfidence ? previous : nextConfidence,
          );

          // Capture frames only while the timed recording window is open.
          if (practicePhaseRef.current === 'recording') {
            const elapsed = now - recordingStartRef.current;
            if (elapsed < recordingDurationRef.current) {
              const hands: HandObservation[] = results.landmarks.map(
                (landmarks, i) => ({
                  landmarks: landmarks.map((l) => ({
                    x: l.x,
                    y: l.y,
                    z: l.z,
                  })),
                  worldLandmarks: results.worldLandmarks[i]?.map((l) => ({
                    x: l.x,
                    y: l.y,
                    z: l.z,
                  })),
                  handedness:
                    results.handedness[i]?.[0]?.categoryName ?? 'Right',
                  confidence: results.handedness[i]?.[0]?.score ?? 0,
                }),
              );
              frameBufferRef.current.push({
                timeMs: Math.round(elapsed),
                hands,
              });

              const progress = Math.min(
                100,
                Math.round((elapsed / recordingDurationRef.current) * 100),
              );
              setRecordingProgress((prev) =>
                prev === progress ? prev : progress,
              );
            }
          }

          if (now - lastBrightnessCheckRef.current >= 1000) {
            lastBrightnessCheckRef.current = now;
            const sampleCanvas =
              brightnessCanvasRef.current ?? document.createElement('canvas');
            brightnessCanvasRef.current = sampleCanvas;
            setLighting(readFrameLighting(currentVideo, sampleCanvas));
          }
        }

        const nextFrame = renderFrameRef.current;
        if (nextFrame) {
          animationFrameRef.current = requestAnimationFrame(nextFrame);
        }
      };

      renderFrameRef.current = renderFrame;
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    } catch (error) {
      releaseResources();
      if (!mountedRef.current) return;

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setStatus('denied');
        setErrorMessage(
          'Izin kamera ditolak. Izinkan kamera melalui pengaturan browser, lalu coba lagi.',
        );
        return;
      }

      if (error instanceof DOMException && error.name === 'NotFoundError') {
        setStatus('unavailable');
        setErrorMessage(
          'Tidak ada kamera yang dapat digunakan pada perangkat ini.',
        );
        return;
      }

      setStatus('error');
      setErrorMessage(
        'Kamera atau model landmark gagal dimuat. Periksa koneksi dan coba lagi.',
      );
    }
  }, [
    releaseResources,
    referenceVideoUrl,
    resumeReferencePreview,
    updatePhase,
  ]);

  const completeRecording = useCallback(() => {
    if (practicePhaseRef.current !== 'recording') return;

    practicePhaseRef.current = 'scoring';
    setPracticePhase('scoring');
    setRecordingProgress(100);
    if (recordingTimerRef.current !== null) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    getReferenceVideo()?.pause();

    // Yield once so the scoring overlay is visible before doing synchronous work.
    scoringTimerRef.current = setTimeout(() => {
      scoringTimerRef.current = null;
      if (!mountedRef.current || practicePhaseRef.current !== 'scoring') return;
      const result = scoreGesture(
        referenceFramesRef.current,
        frameBufferRef.current,
      );
      setGestureScore(result);
      recordGestureAssessment(result.overall, result.passed);
      practicePhaseRef.current = 'result';
      setPracticePhase('result');
    }, 50);
  }, [getReferenceVideo]);

  const beginRecording = useCallback(() => {
    if (practicePhaseRef.current !== 'countdown') return;
    countdownTimerRef.current = null;
    setCountdown(0);

    const referenceVideo = getReferenceVideo();
    if (referenceVideo) {
      referenceVideo.loop = false;
      referenceVideo.playbackRate = PRACTICE_PLAYBACK_RATE;
      referenceVideo.currentTime = referenceStartRef.current / 1000;
      void referenceVideo.play().catch(() => undefined);
    }

    recordingStartRef.current = performance.now();
    updatePhase('recording');
    recordingTimerRef.current = setTimeout(
      completeRecording,
      recordingDurationRef.current,
    );
  }, [completeRecording, getReferenceVideo, updatePhase]);

  const startPractice = useCallback(() => {
    if (practicePhaseRef.current !== 'idle' || !referenceReady) return;

    frameBufferRef.current = [];
    setRecordingProgress(0);
    setGestureScore(null);

    const timing = getReferenceTiming(referenceFramesRef.current);
    recordingDurationRef.current = timing.durationMs;
    referenceStartRef.current = timing.startMs;
    setRecordingDuration(timing.durationMs);

    const referenceVideo = getReferenceVideo();
    if (referenceVideo) {
      referenceVideo.pause();
      referenceVideo.loop = false;
      referenceVideo.playbackRate = PRACTICE_PLAYBACK_RATE;
      referenceVideo.currentTime = timing.startMs / 1000;
    }

    updatePhase('countdown');
    setCountdown(COUNTDOWN_SECONDS);

    // Derive the visible number from a monotonic deadline so delayed timers do
    // not stretch a three-second countdown into four or five seconds.
    const deadline = performance.now() + COUNTDOWN_SECONDS * 1000;
    countdownTimerRef.current = setInterval(() => {
      if (practicePhaseRef.current !== 'countdown') return;
      const remainingMs = deadline - performance.now();
      if (remainingMs <= 0) {
        if (countdownTimerRef.current !== null) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        beginRecording();
        return;
      }
      setCountdown(Math.ceil(remainingMs / 1000));
    }, 100);
  }, [beginRecording, getReferenceVideo, referenceReady, updatePhase]);

  const resetPractice = useCallback(() => {
    frameBufferRef.current = [];
    setRecordingProgress(0);
    updatePhase('idle');
    resumeReferencePreview();
  }, [resumeReferencePreview, updatePhase]);

  const cancelPractice = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recordingTimerRef.current !== null) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (scoringTimerRef.current !== null) {
      clearTimeout(scoringTimerRef.current);
      scoringTimerRef.current = null;
    }
    frameBufferRef.current = [];
    setCountdown(0);
    setRecordingProgress(0);
    setGestureScore(null);
    updatePhase('idle');
    resumeReferencePreview();
  }, [resumeReferencePreview, updatePhase]);

  const isBusy =
    status === 'requesting' ||
    status === 'loading-model' ||
    status === 'loading-reference';
  const isReady = status === 'ready';
  const showSetup = (
    ['idle', 'requesting', 'denied', 'unavailable', 'error'] as CameraStatus[]
  ).includes(status);
  const canStartPractice =
    isReady && referenceReady && practicePhase === 'idle';

  const calibrationChecks = [
    {
      label: 'Kamera aktif',
      detail: isReady
        ? 'Siap'
        : status === 'loading-reference'
          ? 'Menyiapkan referensi…'
          : 'Belum siap',
      passed: isReady,
      icon: Camera,
    },
    {
      label: 'Pencahayaan',
      detail: lightingLabel(lighting),
      passed: lighting === 'good',
      icon: SunMedium,
    },
    {
      label: 'Tangan terlihat',
      detail:
        handCount >= requiredHandCount
          ? `${handCount} terdeteksi`
          : `${handCount}/${requiredHandCount} terdeteksi`,
      passed: handCount >= requiredHandCount,
      icon: Hand,
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="overflow-hidden border border-signal-navy/10 bg-signal-navy">
        <div className="relative aspect-video min-h-[360px] bg-[#0d1128]">
          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 size-full -scale-x-100 object-cover transition-opacity',
              isReady ||
                status === 'loading-model' ||
                status === 'loading-reference'
                ? 'opacity-100'
                : 'opacity-0',
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

          {showSetup && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid size-20 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-signal-teal">
                  {status === 'denied' || status === 'unavailable' ? (
                    <CameraOff className="size-8" />
                  ) : (
                    <Camera className="size-8" />
                  )}
                </span>
                <h2 className="mt-6 text-2xl font-black tracking-[-0.035em] text-white">
                  Siapkan kamera latihan
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  Video diproses langsung di browser. BISARA tidak merekam atau
                  menyimpan video latihan ini.
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={startCamera}
                  disabled={isBusy}
                  className="mt-6 h-12 rounded-full bg-signal-teal px-6 font-extrabold text-signal-navy hover:bg-signal-teal/90"
                >
                  {isBusy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  {status === 'requesting' && 'Menunggu izin kamera'}
                  {status === 'loading-model' && 'Memuat deteksi tangan'}
                  {!isBusy && 'Aktifkan kamera'}
                </Button>
              </div>
            </div>
          )}

          {status === 'loading-model' && (
            <div className="absolute inset-0 grid place-items-center bg-signal-navy/55 p-6 text-center backdrop-blur-sm">
              <div>
                <LoaderCircle className="mx-auto size-8 animate-spin text-signal-teal" />
                <p className="mt-4 text-sm font-bold text-white">
                  Menyiapkan 21 titik landmark per tangan…
                </p>
              </div>
            </div>
          )}

          {status === 'loading-reference' && (
            <div className="absolute inset-0 grid place-items-center bg-signal-navy/55 p-6 text-center backdrop-blur-sm">
              <div>
                <LoaderCircle className="mx-auto size-8 animate-spin text-signal-teal" />
                <p className="mt-4 text-sm font-bold text-white">
                  Menyiapkan referensi gerakan…
                </p>
              </div>
            </div>
          )}

          {isReady &&
            practicePhase !== 'countdown' &&
            practicePhase !== 'scoring' && (
              <div className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded-full px-3 py-2 text-xs font-extrabold backdrop-blur-sm',
                    handCount > 0
                      ? 'bg-signal-teal text-signal-navy'
                      : 'bg-black/45 text-white',
                  )}
                >
                  {handCount > 0
                    ? `${handCount} tangan terdeteksi`
                    : 'Posisikan tangan di dalam bingkai'}
                </span>
                {confidence !== null && (
                  <span className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
                    Confidence {confidence}%
                  </span>
                )}
              </div>
            )}

          {/* Countdown overlay */}
          {practicePhase === 'countdown' && (
            <div className="absolute inset-0 grid place-items-center bg-signal-navy/40 backdrop-blur-sm">
              <output className="text-center" aria-live="polite">
                <span className="mx-auto grid size-24 place-items-center rounded-full bg-signal-yellow text-5xl font-black text-signal-navy">
                  {countdown}
                </span>
                <p className="mt-4 text-sm font-bold text-white">
                  Bersiap — contoh diputar perlahan setelah hitungan
                </p>
                <p className="mt-2 text-xs text-white/70">
                  Pastikan tangan masuk bingkai saat “Mulai!”
                </p>
              </output>
            </div>
          )}

          {/* Recording indicator */}
          {practicePhase === 'recording' && (
            <>
              {recordingProgress < 15 && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="rounded-full bg-signal-teal px-6 py-3 text-2xl font-black text-signal-navy shadow-lg">
                    Mulai!
                  </span>
                </div>
              )}
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-full bg-black/50 px-4 py-2.5 backdrop-blur-sm">
                <span className="size-3 animate-pulse rounded-full bg-signal-coral" />
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-signal-coral transition-[width] duration-100"
                      style={{ width: `${recordingProgress}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-white">
                  Ikuti contoh, lalu tahan ·{' '}
                  {Math.max(
                    0,
                    Math.ceil(
                      (recordingDuration * (100 - recordingProgress)) / 100000,
                    ),
                  )}{' '}
                  dtk
                </span>
              </div>
            </>
          )}

          {/* Scoring overlay */}
          {practicePhase === 'scoring' && (
            <div className="absolute inset-0 grid place-items-center bg-signal-navy/55 p-6 text-center backdrop-blur-sm">
              <div>
                <LoaderCircle className="mx-auto size-8 animate-spin text-signal-teal" />
                <p className="mt-4 text-sm font-bold text-white">
                  Mengevaluasi gerakan…
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite">
            <p className="text-xs font-black uppercase tracking-[0.13em] text-signal-teal">
              Status kamera
            </p>
            <p className="mt-1 text-sm font-bold">
              {cameraStatusLabel(status, handCount)}
            </p>
            {errorMessage && (
              <p className="mt-1 max-w-xl text-xs leading-5 text-signal-coral">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {isReady && practicePhase === 'idle' && (
              <Button
                type="button"
                onClick={startPractice}
                disabled={!canStartPractice}
                className="bg-signal-teal font-extrabold text-signal-navy hover:bg-signal-teal/90"
              >
                <Play className="size-4" /> Mulai latihan
              </Button>
            )}
            {isReady &&
              (practicePhase === 'countdown' ||
                practicePhase === 'recording') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelPractice}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" /> Batalkan
                </Button>
              )}
            {isReady && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className="size-4" /> Muat ulang
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopCamera}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <CameraOff className="size-4" /> Matikan
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Sidebar: score results or calibration */}
      {practicePhase === 'result' && gestureScore ? (
        <aside className="border-t-4 border-signal-coral bg-card p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.13em] text-signal-coral">
              Skor latihan
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-5xl font-black tracking-[-0.06em] text-signal-navy">
                {gestureScore.overall}
              </span>
              <Badge
                className={cn(
                  'font-extrabold',
                  gestureScore.passed
                    ? 'bg-signal-teal text-signal-navy'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {gestureScore.passed ? 'Lulus ✓' : 'Belum lulus'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <ScoreBar label="Bentuk tangan" value={gestureScore.handshape} />
            <ScoreBar label="Gerakan" value={gestureScore.movement} />
            <ScoreBar label="Orientasi" value={gestureScore.orientation} />
            <ScoreBar label="Posisi" value={gestureScore.position} />
            <ScoreBar label="Koordinasi" value={gestureScore.coordination} />
          </div>

          <div className="mt-5 border-t border-signal-navy/10 pt-4">
            <ScoreBar
              label="Kualitas deteksi"
              value={gestureScore.detectionQuality}
            />
          </div>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {gestureScore.feedback}
          </p>

          <Button
            type="button"
            onClick={resetPractice}
            className="mt-5 w-full bg-signal-teal font-extrabold text-signal-navy hover:bg-signal-teal/90"
          >
            <RotateCcw className="size-4" /> Coba lagi
          </Button>
        </aside>
      ) : (
        <aside className="border-t-4 border-signal-yellow bg-card p-6">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.13em] text-amber-700">
                Kalibrasi
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-signal-navy">
                Sebelum berlatih
              </h2>
            </div>
            <ShieldCheck className="size-6 text-amber-600" />
          </div>

          <ul className="space-y-4">
            {calibrationChecks.map((check) => {
              const Icon = check.icon;
              return (
                <li key={check.label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full',
                      check.passed
                        ? 'bg-signal-teal text-signal-navy'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {check.passed ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-signal-navy">
                      {check.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {check.detail}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-7 border-t border-signal-navy/10 pt-5">
            <p className="text-xs leading-5 text-muted-foreground">
              {referenceReady
                ? 'Referensi siap. Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat, dan beri ruang di sekitar kedua tangan.'
                : 'Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat, dan beri ruang di sekitar kedua tangan.'}
            </p>
            {isReady && !referenceReady && (
              <p className="mt-3 text-xs leading-5 text-signal-coral">
                Referensi gerakan tidak dapat dimuat. Penilaian skor tidak
                tersedia saat ini.
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function cameraStatusLabel(status: CameraStatus, handCount: number) {
  if (status === 'requesting') return 'Menunggu keputusan izin kamera…';
  if (status === 'loading-model') return 'Memuat model landmark tangan…';
  if (status === 'loading-reference') return 'Menyiapkan referensi gerakan…';
  if (status === 'ready' && handCount > 0) return 'Landmark tangan aktif';
  if (status === 'ready') return 'Kamera siap — angkat tangan ke dalam bingkai';
  if (status === 'denied') return 'Akses kamera belum diberikan';
  if (status === 'unavailable') return 'Kamera tidak tersedia';
  if (status === 'error') return 'Terjadi kendala saat menyiapkan kamera';
  return 'Kamera belum aktif';
}

function lightingLabel(status: LightingStatus) {
  if (status === 'low') return 'Terlalu gelap';
  if (status === 'bright') return 'Terlalu terang';
  if (status === 'good') return 'Cukup';
  return 'Belum diperiksa';
}

function drawHandLandmarks(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  results: HandLandmarkerResult,
) {
  if (
    canvas.width !== video.videoWidth ||
    canvas.height !== video.videoHeight
  ) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const landmarks of results.landmarks) {
    context.strokeStyle = '#55c7b5';
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
      context.fillStyle = index === 0 ? '#f4c95d' : '#ff6f61';
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

function getReferenceTiming(frames: GestureFrame[]) {
  const visibleFrames = frames.filter((frame) => frame.hands.length > 0);
  if (visibleFrames.length < 2) {
    return { startMs: 0, durationMs: FALLBACK_RECORDING_DURATION_MS };
  }

  const startMs = visibleFrames[0].timeMs;
  const visibleDuration =
    visibleFrames[visibleFrames.length - 1].timeMs -
    startMs +
    REFERENCE_SAMPLE_INTERVAL_MS;
  return {
    startMs,
    durationMs: Math.round(
      Math.min(
        MAX_RECORDING_DURATION_MS,
        Math.max(
          MIN_RECORDING_DURATION_MS,
          visibleDuration / PRACTICE_PLAYBACK_RATE + REACTION_AND_FINAL_HOLD_MS,
        ),
      ),
    ),
  };
}

function getRequiredHandCount(frames: GestureFrame[]) {
  const frequency = new Map<number, number>();
  for (const frame of frames) {
    if (!frame.hands.length) continue;
    frequency.set(
      frame.hands.length,
      (frequency.get(frame.hands.length) ?? 0) + 1,
    );
  }
  let expected = 1;
  let mostFrames = 0;
  for (const [count, occurrences] of frequency) {
    if (
      occurrences > mostFrames ||
      (occurrences === mostFrames && count > expected)
    ) {
      expected = count;
      mostFrames = occurrences;
    }
  }
  return expected;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
        <span className="text-signal-navy">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            value >= 75
              ? 'bg-signal-teal'
              : value >= 50
                ? 'bg-signal-yellow'
                : 'bg-signal-coral',
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
