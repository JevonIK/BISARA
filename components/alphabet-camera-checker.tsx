'use client';

import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, Check, LoaderCircle, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { AlphabetLetter } from '@/lib/alphabet-data';
import { scoreAlphabetWithAlternatives, type AlphabetAssessment, type AlphabetReferenceSet } from '@/lib/alphabet-scoring';
import { getRequiredHandCount, type GestureFrame, type HandObservation } from '@/lib/gesture-scoring';
import { drawHandLandmarkOverlay } from '@/lib/landmark-overlay';
import { getAlphabetReferenceFrames, getAlphabetReferenceSet } from '@/lib/reference-extractor';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

type Phase = 'idle' | 'countdown' | 'recording' | 'scoring' | 'result';

export function AlphabetCameraChecker({
  letter,
  videoSrc,
  onPass,
}: {
  letter: AlphabetLetter;
  videoSrc: string;
  onPass: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const referenceRef = useRef<GestureFrame[]>([]);
  const referencesRef = useRef<AlphabetReferenceSet>({ frames: {}, variants: {} });
  const capturedRef = useRef<GestureFrame[]>([]);
  const frameRequestRef = useRef<number | null>(null);
  const renderFrameRef = useRef<(() => void) | null>(null);
  const lastInferenceRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const recordStartRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const attemptLetterRef = useRef(letter);

  const [cameraActive, setCameraActive] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [referenceState, setReferenceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [handCount, setHandCount] = useState(0);
  const [requiredHands, setRequiredHands] = useState<1 | 2>(1);
  const [result, setResult] = useState<AlphabetAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setPracticePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
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
      if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    attemptLetterRef.current = letter;
    referenceRef.current = [];
    capturedRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    queueMicrotask(() => {
      if (cancelled) return;
      setPracticePhase('idle');
      setResult(null);
      setReferenceState('loading');
    });
    void Promise.all([getAlphabetReferenceFrames(videoSrc), getAlphabetReferenceSet()]).then(([frames, references]) => {
      if (cancelled) return;
      referenceRef.current = frames;
      referencesRef.current = references;
      setRequiredHands(getRequiredHandCount(frames));
      setReferenceState('ready');
    }).catch(() => {
      if (!cancelled) setReferenceState('error');
    });
    return () => { cancelled = true; };
  }, [letter, videoSrc, setPracticePhase]);

  const finishRecording = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    setPracticePhase('scoring');
    const currentLetter = attemptLetterRef.current;
    // Let the scoring state paint before comparing the recorded landmarks.
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current || currentLetter !== attemptLetterRef.current) return;
      const assessment = scoreAlphabetWithAlternatives(currentLetter, referenceRef.current, capturedRef.current, referencesRef.current);
      setResult(assessment);
      setPracticePhase('result');
      if (assessment.passed) onPass();
    }, 30);
  }, [onPass, setPracticePhase]);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.paused || !mountedRef.current) return;
    const now = performance.now();
    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current && now - lastInferenceRef.current >= 66) {
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
        setHandCount((previous) => previous === hands.length ? previous : hands.length);
        if (phaseRef.current === 'recording') {
          capturedRef.current.push({ timeMs: Math.round(now - recordStartRef.current), hands });
        }
      } catch {
        // Keep the recording alive when one camera frame cannot be decoded.
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
      if (mountedRef.current) setError('Kamera atau model landmark tidak dapat dimuat. Periksa izin dan koneksi, lalu coba lagi.');
    }
  }, [cameraActive, loadingCamera, renderFrame, stopCamera]);

  const beginRecording = useCallback(() => {
    if (!cameraActive || referenceState !== 'ready' || phaseRef.current === 'recording' || phaseRef.current === 'countdown') return;
    capturedRef.current = [];
    setResult(null);
    setCountdown(3);
    setPracticePhase('countdown');
    let remaining = 3;
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== 'countdown') return;
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        recordStartRef.current = performance.now();
        setPracticePhase('recording');
        timerRef.current = setTimeout(finishRecording, letter === 'J' || letter === 'Z' ? 4000 : 3000);
      }
    }, 1000);
  }, [cameraActive, finishRecording, letter, referenceState, setPracticePhase]);

  return (
    <section className="overflow-hidden border border-signal-navy/10 bg-card" aria-label={`Checker huruf ${letter}`}>
      <div className="flex items-center justify-between gap-3 border-b border-signal-navy/10 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Checker kamera</p>
          <h3 className="text-xl font-bold text-signal-navy">Peragakan huruf {letter}</h3>
        </div>
        <Button size="sm" variant={cameraActive ? 'outline' : 'default'} onClick={cameraActive ? stopCamera : () => { void startCamera(); }} disabled={loadingCamera} className="rounded-full gap-2 text-xs font-bold">
          {loadingCamera ? <><LoaderCircle className="size-3.5 animate-spin" /> Memuat</> : cameraActive ? <><CameraOff className="size-3.5" /> Matikan</> : <><Camera className="size-3.5" /> Nyalakan</>}
        </Button>
      </div>
      <div className="relative aspect-video bg-slate-950">
        <video ref={videoRef} playsInline muted className={`h-full w-full -scale-x-100 object-cover ${cameraActive ? '' : 'invisible'}`}><track kind="captions" /></video>
        <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full -scale-x-100 ${cameraActive ? '' : 'invisible'}`} aria-hidden="true" />
        {!cameraActive && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">{error ?? 'Aktifkan kamera untuk memeriksa gerakan huruf.'}</div>}
        {cameraActive && phase === 'countdown' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-7xl font-bold text-white" aria-live="polite">{countdown}</div>}
        {cameraActive && phase === 'recording' && <div className="absolute left-4 top-4 rounded-full bg-signal-coral px-4 py-2 text-xs font-bold text-white">● Merekam gerakan</div>}
      </div>
      <div className="space-y-3 border-t border-signal-navy/10 p-4">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {referenceState === 'loading' ? 'Menyiapkan contoh huruf…' : referenceState === 'error' ? 'Landmark video contoh belum dapat dibaca. Muat ulang halaman dan coba lagi.' : cameraActive ? `${handCount === requiredHands ? (requiredHands === 2 ? 'Kedua tangan terdeteksi' : 'Satu tangan terdeteksi') : `Tunjukkan ${requiredHands === 2 ? 'kedua tangan' : 'satu tangan'} seperti video contoh`}. ${phase === 'recording' ? 'Pertahankan gerakan sampai perekaman selesai.' : ''}` : `Video kamera hanya diproses di perangkatmu. Contoh memakai ${requiredHands === 2 ? 'dua tangan' : 'satu tangan'}.`}
        </p>
        {result && <output className={`block border p-3 text-sm ${result.passed ? 'border-signal-teal bg-signal-teal-soft text-emerald-900' : 'border-signal-coral/25 bg-signal-coral/5 text-signal-navy'}`}>
          <p className="font-bold">{result.passed ? <><Check className="mr-1 inline size-4" /> Huruf {letter} sesuai</> : result.assessable ? 'Belum sesuai' : 'Belum bisa dinilai'}</p>
          <p className="mt-1">{result.feedback}</p>
          {result.assessable && <p className="mt-1 text-xs">Bentuk {result.shape} · Arah {result.orientation}{result.coordination !== null ? ` · Koordinasi ${result.coordination}` : ''}{result.movement !== null ? ` · Gerakan ${result.movement}` : ''}</p>}
        </output>}
        <Button onClick={beginRecording} disabled={!cameraActive || referenceState !== 'ready' || phase === 'countdown' || phase === 'recording' || phase === 'scoring'} className="w-full rounded-full bg-signal-teal font-bold text-signal-navy hover:bg-signal-teal/90">
          {phase === 'result' ? <><RotateCcw className="mr-2 size-4" /> Coba lagi</> : phase === 'recording' ? 'Sedang merekam…' : phase === 'scoring' ? 'Memeriksa gerakan…' : 'Mulai peragaan (3 · 2 · 1)'}
        </Button>
      </div>
    </section>
  );
}

function drawHandLandmarks(canvas: HTMLCanvasElement, video: HTMLVideoElement, hands: HandObservation[]) {
  drawHandLandmarkOverlay(canvas, video, hands, HAND_CONNECTIONS);
}
