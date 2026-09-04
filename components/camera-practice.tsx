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
  RefreshCw,
  ShieldCheck,
  SunMedium,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'loading-model'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'error';

type LightingStatus = 'unknown' | 'low' | 'good' | 'bright';

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

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

export function CameraPractice() {
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

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [handCount, setHandCount] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [lighting, setLighting] = useState<LightingStatus>('unknown');

  const releaseResources = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    renderFrameRef.current = null;

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
  }, [releaseResources]);

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
  }, [releaseResources]);

  const isBusy = status === 'requesting' || status === 'loading-model';
  const isReady = status === 'ready';
  const showSetup = (
    ['idle', 'requesting', 'denied', 'unavailable', 'error'] as CameraStatus[]
  ).includes(status);
  const calibrationChecks = [
    {
      label: 'Kamera aktif',
      detail: isReady ? 'Siap' : 'Belum siap',
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
      detail: handCount > 0 ? `${handCount} terdeteksi` : 'Belum terdeteksi',
      passed: handCount > 0,
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
              isReady || status === 'loading-model'
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

          {isReady && (
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

          {isReady && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </section>

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
            Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat,
            dan beri ruang di sekitar kedua tangan.
          </p>
        </div>
      </aside>
    </div>
  );
}

function cameraStatusLabel(status: CameraStatus, handCount: number) {
  if (status === 'requesting') return 'Menunggu keputusan izin kamera…';
  if (status === 'loading-model') return 'Memuat model landmark tangan…';
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
