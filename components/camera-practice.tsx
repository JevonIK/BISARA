'use client';

import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  ArrowRight,
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
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useProgress } from '@/hooks/use-progress';
import {
  getSigns,
  signIds as allSignIds,
  versionedSignVideo,
  type SignId,
} from '@/lib/curriculum-data';
import { isCurriculumDebugUnlocked } from '@/lib/debug-unlock';
import {
  canAlternativeOutscore,
  getRequiredHandCount,
  getReferenceGestureWindow,
  scoreGesture,
  scoreGestureWithAlternatives,
  selectBodyPoseLandmarks,
  smoothLiveHandObservations,
  type GestureFrame,
  type GestureScore,
  type HandObservation,
} from '@/lib/gesture-scoring';
import { getMissionLearningState } from '@/lib/learning-progress';
import { recordGestureAssessment } from '@/lib/progress-storage';
import {
  getBodyAnchoredReferenceFrames,
  getReferenceFrames,
  getStoredReferenceFrames,
} from '@/lib/reference-extractor';
import { getPracticePreviewVideoUrl } from '@/lib/reference-window';
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
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const COUNTDOWN_SECONDS = 3;
const PRACTICE_PLAYBACK_RATE = 0.75;
const FALLBACK_RECORDING_DURATION_MS = 4000;
const REACTION_AND_FINAL_HOLD_MS = 600;
const MIN_RECORDING_DURATION_MS = 3000;
const MAX_RECORDING_DURATION_MS = 10000;
const REFERENCE_SAMPLE_INTERVAL_MS = 66;
const POSE_INFERENCE_INTERVAL_MS = 132;
const MAX_POSE_AGE_MS = 300;
const START_HAND_STABILITY_MS = 300;

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
  signId: SignId;
  signLabel: string;
  referenceVideoUrl: string;
  referenceVideoElementId?: string;
  missionId?: string;
  missionSignIds?: SignId[];
  reviewMode?: boolean;
  productionMode?: boolean;
  onProductionResult?: (result: GestureScore) => void;
  exampleCard?: React.ReactNode;
};

type NextAction = {
  href: string;
  label: string;
  description: string;
  practiceComplete: boolean;
};

async function loadVocabularyAlternatives(targetSignId: SignId) {
  const signs = getSigns(allSignIds).filter((sign) => sign.id !== targetSignId);
  const loaded = await Promise.allSettled(
    signs.map((sign) =>
      getStoredReferenceFrames(versionedSignVideo(sign.videoSrc)),
    ),
  );
  if (loaded.some((result) => result.status === 'rejected')) {
    return null;
  }
  return loaded.flatMap((result, index) =>
    result.status === 'fulfilled'
      ? [
          {
            label: signs[index].label,
            frames: result.value,
            requiredHandCount: getRequiredHandCount(result.value),
          },
        ]
      : [],
  );
}

export function CameraPractice({
  signId,
  signLabel,
  referenceVideoUrl,
  referenceVideoElementId,
  missionId = 'berkenalan',
  missionSignIds = ['saya', 'siapa', 'teman', 'terima-kasih', 'maaf'],
  reviewMode = false,
  productionMode = false,
  onProductionResult,
  exampleCard,
}: CameraPracticeProps) {
  const userProgress = useProgress();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderFrameRef = useRef<FrameRequestCallback | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastInferenceRef = useRef(0);
  const lastPoseInferenceRef = useRef(0);
  const poseTimestampOffsetRef = useRef(0);
  const latestPoseAtRef = useRef(0);
  const stableHandsSinceRef = useRef(0);
  const latestPoseLandmarksRef =
    useRef<GestureFrame['poseLandmarks']>(undefined);
  const lastBrightnessCheckRef = useRef(0);
  const mountedRef = useRef(true);

  // Scoring refs
  const referenceFramesRef = useRef<GestureFrame[]>([]);
  const requiredHandCountRef = useRef<1 | 2>(1);
  const alternativeFramesPromiseRef = useRef<
    | Promise<Array<{
        label: string;
        frames: GestureFrame[];
        requiredHandCount: 1 | 2;
      }> | null>
    | undefined
  >(undefined);
  const frameBufferRef = useRef<GestureFrame[]>([]);
  const rawFrameBufferRef = useRef<GestureFrame[]>([]);
  const smoothedFrameBufferRef = useRef<GestureFrame[]>([]);
  const smoothedHandsRef = useRef<HandObservation[]>([]);
  const recordingStartRef = useRef(0);
  const recordingDurationRef = useRef(FALLBACK_RECORDING_DURATION_MS);
  const practicePhaseRef = useRef<PracticePhase>('idle');
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [handCount, setHandCount] = useState(0);
  const [lighting, setLighting] = useState<LightingStatus>('unknown');

  // Scoring state
  const [practicePhase, setPracticePhase] = useState<PracticePhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [waitingForHands, setWaitingForHands] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(
    FALLBACK_RECORDING_DURATION_MS,
  );
  const [gestureScore, setGestureScore] = useState<GestureScore | null>(null);
  const [attemptDiagnostics, setAttemptDiagnostics] = useState({
    capturedFrames: 0,
    twoHandFrames: 0,
  });
  const [referenceReady, setReferenceReady] = useState(false);
  const [requiredHandCount, setRequiredHandCount] = useState(1);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);

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
    delete referenceVideo.dataset.practiceRecording;
    referenceVideo.loop = true;
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
    poseLandmarkerRef.current?.close();
    poseLandmarkerRef.current = null;
    latestPoseLandmarksRef.current = undefined;
    latestPoseAtRef.current = 0;
    stableHandsSinceRef.current = 0;
    poseTimestampOffsetRef.current = 0;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    smoothedHandsRef.current = [];
    rawFrameBufferRef.current = [];
    smoothedFrameBufferRef.current = [];
    alternativeFramesPromiseRef.current = undefined;
  }, []);

  const stopCamera = useCallback(() => {
    releaseResources();
    setStatus('idle');
    setHandCount(0);
    setLighting('unknown');
    setErrorMessage('');
    updatePhase('idle');
    setGestureScore(null);
    setNextAction(null);
    setRecordingProgress(0);
    resumeReferencePreview();
    setCountdown(0);
    setWaitingForHands(false);
  }, [releaseResources, resumeReferencePreview, updatePhase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseResources();
    };
  }, [releaseResources]);

  // Reset scoring and reload reference frames whenever the target sign changes
  const prevSignIdRef = useRef(signId);
  useEffect(() => {
    if (prevSignIdRef.current === signId) return;
    prevSignIdRef.current = signId;

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
    rawFrameBufferRef.current = [];
    smoothedFrameBufferRef.current = [];
    smoothedHandsRef.current = [];
    latestPoseLandmarksRef.current = undefined;
    latestPoseAtRef.current = 0;
    stableHandsSinceRef.current = 0;

    setCountdown(0);
    setRecordingProgress(0);
    setGestureScore(null);
    setNextAction(null);
    updatePhase('idle');
    resumeReferencePreview();

    setReferenceReady(false);
    alternativeFramesPromiseRef.current = streamRef.current
      ? loadVocabularyAlternatives(signId)
      : undefined;
    let isCancelled = false;

    void getReferenceFrames(referenceVideoUrl)
      .then((refFrames) => {
        if (!mountedRef.current || isCancelled) return;
        referenceFramesRef.current = refFrames;
        const timing = getReferenceTiming(refFrames);
        recordingDurationRef.current = timing.durationMs;
        setRecordingDuration(timing.durationMs);
        const handCount = getRequiredHandCount(refFrames);
        requiredHandCountRef.current = handCount;
        setRequiredHandCount(handCount);
        setReferenceReady(true);
      })
      .catch(() => {
        if (!mountedRef.current || isCancelled) return;
        setReferenceReady(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [referenceVideoUrl, resumeReferencePreview, signId, updatePhase]);

  const startCamera = useCallback(async () => {
    releaseResources();
    setErrorMessage('');
    setHandCount(0);
    setLighting('unknown');
    updatePhase('idle');
    setGestureScore(null);
    setNextAction(null);
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
      // Comparison begins only after camera permission, in parallel with
      // camera/model setup and the learner's countdown and recording.
      alternativeFramesPromiseRef.current = loadVocabularyAlternatives(signId);
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      setStatus('loading-model');
      const { FilesetResolver, HandLandmarker, PoseLandmarker } =
        await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const [landmarker, poseLandmarker] = await Promise.all([
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL },
          runningMode: 'VIDEO',
          numPoses: 2,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        }).catch(() => null),
      ]);

      if (!mountedRef.current) {
        landmarker.close();
        poseLandmarker?.close();
        return;
      }

      landmarkerRef.current = landmarker;
      poseLandmarkerRef.current = poseLandmarker;

      // Extract reference frames from the demo video
      setStatus('loading-reference');
      try {
        const baseReferenceFrames = await getReferenceFrames(referenceVideoUrl);
        const refFrames = poseLandmarker
          ? await getBodyAnchoredReferenceFrames(
              referenceVideoUrl,
              baseReferenceFrames,
              poseLandmarker,
            )
          : baseReferenceFrames;
        poseTimestampOffsetRef.current =
          (refFrames.at(-1)?.timeMs ?? 0) + REFERENCE_SAMPLE_INTERVAL_MS;
        referenceFramesRef.current = refFrames;
        const timing = getReferenceTiming(refFrames);
        recordingDurationRef.current = timing.durationMs;
        setRecordingDuration(timing.durationMs);
        const handCount = getRequiredHandCount(refFrames);
        requiredHandCountRef.current = handCount;
        setRequiredHandCount(handCount);
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
        const currentPoseLandmarker = poseLandmarkerRef.current;

        if (!currentVideo || !currentLandmarker || currentVideo.paused) return;

        const now = performance.now();
        const hasNewFrame =
          currentVideo.currentTime !== lastVideoTimeRef.current;
        const mayInfer = now - lastInferenceRef.current >= 66;

        if (currentVideo.readyState >= 2 && hasNewFrame && mayInfer) {
          lastVideoTimeRef.current = currentVideo.currentTime;
          lastInferenceRef.current = now;

          try {
            const results = currentLandmarker.detectForVideo(currentVideo, now);
            const rawHands: HandObservation[] = results.landmarks.map(
              (landmarks, i) => ({
                landmarks: landmarks.map((landmark) => ({
                  x: landmark.x,
                  y: landmark.y,
                  z: landmark.z,
                })),
                worldLandmarks: results.worldLandmarks[i]?.map((landmark) => ({
                  x: landmark.x,
                  y: landmark.y,
                  z: landmark.z,
                })),
                handedness: results.handedness[i]?.[0]?.categoryName ?? 'Right',
                confidence: results.handedness[i]?.[0]?.score ?? 0,
              }),
            );
            const hands = smoothLiveHandObservations(
              rawHands,
              smoothedHandsRef.current,
            );
            smoothedHandsRef.current = hands;

            if (
              currentPoseLandmarker &&
              now - lastPoseInferenceRef.current >= POSE_INFERENCE_INTERVAL_MS
            ) {
              lastPoseInferenceRef.current = now;
              try {
                const poseResult = currentPoseLandmarker.detectForVideo(
                  currentVideo,
                  now + poseTimestampOffsetRef.current,
                );
                const poseLandmarks = selectBodyPoseLandmarks(
                  poseResult.landmarks.map((pose) =>
                    pose.map((landmark) => ({
                      x: landmark.x,
                      y: landmark.y,
                      z: landmark.z,
                      visibility: landmark.visibility,
                    })),
                  ),
                  hands,
                );
                latestPoseLandmarksRef.current = poseLandmarks?.length
                  ? poseLandmarks
                  : undefined;
                latestPoseAtRef.current = poseLandmarks?.length ? now : 0;
              } catch (poseError) {
                console.warn('Pose inference error:', poseError);
                poseLandmarkerRef.current?.close();
                poseLandmarkerRef.current = null;
                latestPoseLandmarksRef.current = undefined;
                latestPoseAtRef.current = 0;
              }
            }
            const overlay = canvasRef.current;
            if (overlay) {
              drawHandLandmarks(overlay, currentVideo, hands);
            }

            const detectedHands = hands.length;
            if (detectedHands >= requiredHandCountRef.current) {
              if (!stableHandsSinceRef.current) stableHandsSinceRef.current = now;
            } else {
              stableHandsSinceRef.current = 0;
            }
            setHandCount((previous) =>
              previous === detectedHands ? previous : detectedHands,
            );

            // Capture frames only while the timed recording window is open.
            if (practicePhaseRef.current === 'recording') {
              const elapsed = now - recordingStartRef.current;
              if (elapsed < recordingDurationRef.current) {
                if (isCurriculumDebugUnlocked()) {
                  rawFrameBufferRef.current.push({
                    timeMs: Math.round(elapsed),
                    hands: rawHands,
                  });
                  smoothedFrameBufferRef.current.push({
                    timeMs: Math.round(elapsed),
                    hands,
                  });
                }
                frameBufferRef.current.push({
                  timeMs: Math.round(elapsed),
                  // The overlay benefits from temporal smoothing, but a
                  // rotating one-hand sign loses real finger geometry when
                  // its landmarks are blended across different poses. Grade
                  // the raw observation; the temporal scorer already handles
                  // individual noisy frames. Keep smoothing for overlapping
                  // two-hand signs, where it stabilizes hand identity.
                  hands: requiredHandCountRef.current === 1 ? rawHands : hands,
                  poseLandmarks:
                    now - latestPoseAtRef.current <= MAX_POSE_AGE_MS
                      ? latestPoseLandmarksRef.current
                      : undefined,
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
          } catch (inferError) {
            console.warn('Inference error in renderFrame:', inferError);
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
    signId,
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
    scoringTimerRef.current = setTimeout(async () => {
      scoringTimerRef.current = null;
      if (!mountedRef.current || practicePhaseRef.current !== 'scoring') return;
      const referenceFrames = referenceFramesRef.current;
      const attemptFrames = frameBufferRef.current;
      setAttemptDiagnostics({
        capturedFrames: attemptFrames.length,
        twoHandFrames: attemptFrames.filter((frame) => frame.hands.length >= 2)
          .length,
      });
      let result = scoreGesture(referenceFrames, attemptFrames);
      if (canAlternativeOutscore(result)) {
        const loading =
          alternativeFramesPromiseRef.current ??
          loadVocabularyAlternatives(signId);
        alternativeFramesPromiseRef.current = loading;
        try {
          const alternatives = await loading;
          if (!alternatives) throw new Error('Contoh pembanding gagal dimuat.');
          result = scoreGestureWithAlternatives(
            referenceFrames,
            attemptFrames,
            alternatives,
            result,
          );
        } catch {
          // A transient template load must not poison every later retry.
          alternativeFramesPromiseRef.current = undefined;
          result = {
            ...result,
            overall: 0,
            assessable: false,
            passed: false,
            feedback:
              'Contoh pembanding belum dapat diproses. Muat ulang kamera lalu coba lagi.',
          };
        }
        if (!mountedRef.current || practicePhaseRef.current !== 'scoring')
          return;
      }
      setGestureScore(result);
      if (productionMode) {
        onProductionResult?.(result);
        setNextAction(null);
      } else if (!result.assessable) {
        setNextAction(null);
      } else {
        const updatedProgress = recordGestureAssessment(
          signId,
          result.overall,
          result.passed,
          {
            recordingDurationMs: recordingDurationRef.current,
            review: reviewMode,
          },
        );

        if (result.passed) {
          const learningState = getMissionLearningState(
            missionId,
            updatedProgress,
          );
          const missionSigns = getSigns(missionSignIds);
          const nextUnmasteredSign = missionSigns.find(
            (sign) => !updatedProgress.signMastery[sign.id].passed,
          );
          setNextAction(
            reviewMode
              ? {
                  href: '/review',
                  label: 'Kembali ke review',
                  description: `Review tanda ${signLabel} sudah tercatat untuk hari ini.`,
                  practiceComplete: false,
                }
              : nextUnmasteredSign
                ? {
                    href: `/missions/practice?mission=${missionId}&sign=${nextUnmasteredSign.id}`,
                    label: `Latih tanda ${nextUnmasteredSign.label}`,
                    description: `${learningState.masteredSignCount} dari ${missionSigns.length} tanda sudah lulus. Lanjutkan ke tanda berikutnya.`,
                    practiceComplete: false,
                  }
                : {
                    href: `/missions/test?mission=${missionId}&mode=recognition`,
                    label: 'Mulai tes pengenalan',
                    description:
                      'Semua tanda misi sudah lulus latihan kamera. Sekarang cek apakah kamu dapat mengenalinya tanpa label.',
                    practiceComplete: true,
                  },
          );
        } else {
          setNextAction(null);
        }
      }
      practicePhaseRef.current = 'result';
      setPracticePhase('result');
      resumeReferencePreview();
    }, 50);
  }, [
    getReferenceVideo,
    missionId,
    missionSignIds,
    onProductionResult,
    productionMode,
    resumeReferencePreview,
    reviewMode,
    signId,
    signLabel,
  ]);

  const beginRecording = useCallback(() => {
    if (practicePhaseRef.current !== 'countdown') return;
    countdownTimerRef.current = null;
    setCountdown(0);
    setWaitingForHands(false);

    const referenceVideo = getReferenceVideo();
    if (referenceVideo) {
      referenceVideo.dataset.practiceRecording = 'true';
      referenceVideo.loop = true;
      referenceVideo.playbackRate = PRACTICE_PLAYBACK_RATE;
      // The seek already happened before the countdown. Seeking again here can
      // delay playback while the camera recording has already begun.
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
    if (
      (practicePhaseRef.current !== 'idle' &&
        practicePhaseRef.current !== 'result') ||
      !referenceReady
    )
      return;

    frameBufferRef.current = [];
    rawFrameBufferRef.current = [];
    smoothedFrameBufferRef.current = [];
    smoothedHandsRef.current = [];
    latestPoseLandmarksRef.current = undefined;
    latestPoseAtRef.current = 0;
    stableHandsSinceRef.current = 0;
    setRecordingProgress(0);
    setGestureScore(null);
    setNextAction(null);

    const timing = getReferenceTiming(referenceFramesRef.current);
    recordingDurationRef.current = timing.durationMs;
    setRecordingDuration(timing.durationMs);

    const referenceVideo = getReferenceVideo();
    if (referenceVideo) {
      referenceVideo.pause();
      referenceVideo.dataset.practiceRecording = 'true';
      referenceVideo.loop = true;
      referenceVideo.playbackRate = PRACTICE_PLAYBACK_RATE;
      referenceVideo.currentTime =
        getPracticePreviewVideoUrl(referenceVideoUrl) === referenceVideoUrl
          ? timing.startMs / 1000
          : 0;
    }

    updatePhase('countdown');
    setCountdown(COUNTDOWN_SECONDS);
    setWaitingForHands(false);

    // Keep the countdown tied to a monotonic clock. A cold tracker or hands
    // outside the frame pauses the start until detection is stable, then gives
    // one more second to prepare before recording begins.
    let deadline = performance.now() + COUNTDOWN_SECONDS * 1000;
    let waitingForReadyHands = false;
    countdownTimerRef.current = setInterval(() => {
      if (practicePhaseRef.current !== 'countdown') return;
      const now = performance.now();
      const remainingMs = deadline - now;
      if (remainingMs <= 0) {
        if (
          !stableHandsSinceRef.current ||
          now - stableHandsSinceRef.current < START_HAND_STABILITY_MS
        ) {
          waitingForReadyHands = true;
          setWaitingForHands(true);
          setCountdown(1);
          return;
        }
        if (waitingForReadyHands) {
          waitingForReadyHands = false;
          setWaitingForHands(false);
          deadline = now + 1000;
          setCountdown(1);
          return;
        }
        if (countdownTimerRef.current !== null) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        beginRecording();
        return;
      }
      setCountdown(Math.ceil(remainingMs / 1000));
    }, 100);
  }, [
    beginRecording,
    getReferenceVideo,
    referenceReady,
    referenceVideoUrl,
    updatePhase,
  ]);

  const resetPractice = useCallback(() => {
    frameBufferRef.current = [];
    rawFrameBufferRef.current = [];
    smoothedFrameBufferRef.current = [];
    setRecordingProgress(0);
    setWaitingForHands(false);
    setGestureScore(null);
    setNextAction(null);
    updatePhase('idle');
    resumeReferencePreview();
  }, [resumeReferencePreview, updatePhase]);

  const retryPractice = useCallback(() => {
    if (referenceReady) {
      startPractice();
    } else {
      resetPractice();
    }
  }, [referenceReady, resetPractice, startPractice]);

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
    setWaitingForHands(false);
    setRecordingProgress(0);
    setGestureScore(null);
    setNextAction(null);
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
  const previouslyMastered = userProgress.signMastery[signId].passed;
  const practiceComplete = missionSignIds.every(
    (id) => userProgress.signMastery[id].passed,
  );

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
      detail: isReady
        ? handCount >= requiredHandCount
          ? `${handCount} terdeteksi`
          : `${handCount}/${requiredHandCount} terdeteksi`
        : 'Belum terdeteksi',
      passed: handCount >= requiredHandCount,
      icon: Hand,
    },
  ];

  const accessState = getMissionLearningState(missionId, userProgress);
  if (!reviewMode && !accessState.unlocked) {
    return (
      <section className="grid min-h-[430px] place-items-center border border-signal-navy/10 bg-card p-8 text-center">
        <div className="max-w-lg">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-signal-yellow/30 text-amber-800">
            <Hand className="size-7" />
          </span>
          <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] text-signal-navy">
            Misi ini belum terbuka
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Selesaikan misi sebelumnya agar latihan mengikuti urutan dan bekal
            kosakata yang dirancang.
          </p>
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-7 rounded-full bg-signal-navy px-6 font-extrabold text-white',
            )}
          >
            Kembali ke beranda <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div
      className={cn(
        'grid items-stretch gap-5',
        exampleCard
          ? 'grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[300px_1fr_300px]'
          : 'grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]',
      )}
    >
      {exampleCard}

      <section className="flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0B0F19] border border-amber-200/50 shadow-sm">
        <div className="relative aspect-video bg-[#0B0F19] sm:min-h-[360px]">
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
                <span className="mx-auto grid size-16 sm:size-20 place-items-center rounded-full border border-white/10 bg-white/5 text-white">
                  {status === 'denied' || status === 'unavailable' ? (
                     <CameraOff className="size-8" />
                  ) : (
                    <Camera className="size-8" />
                  )}
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
                  onClick={startCamera}
                  disabled={isBusy}
                  className="mt-6 h-12 rounded-full bg-[#00D5D1] px-7 font-black text-slate-950 hover:bg-[#00BDCD] transition-all hover:scale-105 active:scale-95 shadow-sm"
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
                  Menyiapkan landmark tangan dan posisi tubuh…
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
              <div className="absolute inset-x-3 top-3 flex items-start sm:inset-x-4 sm:top-4">
                <span
                  className={cn(
                    'max-w-full whitespace-normal break-words rounded-full px-3 py-2 text-center text-xs font-extrabold leading-4 backdrop-blur-sm',
                    handCount > 0
                      ? 'bg-signal-teal text-signal-navy'
                      : 'bg-black/45 text-white',
                  )}
                >
                  {handCount > 0
                    ? handCount >= requiredHandCount && requiredHandCount === 2
                      ? 'Kedua tangan terdeteksi'
                      : 'Tangan terdeteksi'
                    : 'Posisikan tangan di dalam bingkai'}
                </span>
              </div>
            )}

          {/* Countdown overlay */}
          {practicePhase === 'countdown' && (
            <div className="absolute inset-0 grid place-items-center bg-signal-navy/40 backdrop-blur-sm">
              <output className="text-center" aria-live="polite">
                <span className="mx-auto grid size-24 place-items-center rounded-full bg-signal-yellow text-5xl font-black text-signal-navy">
                  {waitingForHands ? <Hand className="size-10" /> : countdown}
                </span>
                <p className="mt-4 text-sm font-bold text-white">
                  {waitingForHands
                    ? requiredHandCount === 2
                      ? 'Tampilkan kedua tangan terpisah di dalam bingkai untuk mulai.'
                      : 'Tampilkan tangan di dalam bingkai untuk mulai.'
                    : signId === 'teman'
                    ? 'Pisahkan kedua telunjuk di depan dada. Setelah hitungan, dekatkan hingga bertemu lalu tahan.'
                    : productionMode
                      ? 'Bersiap — peragakan kata dari ingatan setelah hitungan'
                      : 'Bersiap — contoh diputar perlahan setelah hitungan'}
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
                  {productionMode
                    ? 'Peragakan lalu tahan'
                    : 'Ikuti contoh, lalu tahan'}{' '}
                  ·{' '}
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

        {/* Unified Bottom Dark Status & Control Bar matching reference design */}
        <div className="flex flex-col gap-4 border-t border-white/10 bg-[#0B0F19] px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#00D5D1] block">
              STATUS KAMERA
            </span>
            <p className="mt-0.5 text-sm sm:text-base font-bold text-white">
              {practicePhase === 'countdown'
                ? 'Bersiap…'
                : practicePhase === 'recording'
                  ? `Merekam gerakan tanda “${signLabel}”…`
                  : practicePhase === 'scoring'
                    ? 'Menganalisis kecocokan gerakan…'
                    : practicePhase === 'result'
                      ? 'Latihan selesai'
                      : isReady
                        ? 'Kamera aktif & siap berlatih'
                        : cameraStatusLabel(status, handCount)}
            </p>
            {errorMessage && (
              <p className="mt-1 max-w-xl text-xs leading-5 text-signal-coral">
                {errorMessage}
              </p>
            )}
          </div>

          {isReady && (
            <div className="flex flex-wrap items-center gap-2">
              {practicePhase === 'idle' && (
                <Button
                  type="button"
                  onClick={startPractice}
                  disabled={!canStartPractice}
                  className="rounded-full bg-[#00D5D1] px-5 py-2 font-black text-slate-950 hover:bg-[#00BDCD] shadow-sm"
                >
                  <Play className="size-4" />{' '}
                  {productionMode ? 'Mulai uji' : 'Mulai latihan'}
                </Button>
              )}
              {(practicePhase === 'countdown' || practicePhase === 'recording') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelPractice}
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <X className="size-4" /> Batalkan
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={retryPractice}
                disabled={practicePhase !== 'idle' && practicePhase !== 'result'}
                className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <RefreshCw className="size-4" /> Muat ulang
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={stopCamera}
                className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <CameraOff className="size-4" /> Matikan
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Sidebar: score results or calibration */}
      {practicePhase === 'result' && gestureScore ? (
        <aside className="flex flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7 shadow-sm border border-amber-200/50">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.13em] text-[#E54D2E]">
              {productionMode ? 'Hasil uji peragaan' : 'Hasil latihan'}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {gestureScore.assessable
                ? practiceResultLabel(gestureScore, previouslyMastered)
                : 'Belum bisa dinilai'}
            </h2>
          </div>

          {isCurriculumDebugUnlocked() && !gestureScore.passed ? (
            <div className="mb-5 border border-signal-coral/40 bg-signal-coral/5 p-3">
              <p className="text-xs font-bold leading-5 text-signal-navy">
                Diagnostik percobaan ini: bentuk tangan {gestureScore.handshape}
                /100; syarat yang menahan kelulusan:{' '}
                {gestureScore.criticalMismatch ?? 'skor total'}.
              </p>
              {gestureScore.handshapeEvidence ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Skor bentuk mentah {gestureScore.handshapeEvidence.rawScore};
                  frame yang cocok{' '}
                  {Math.round(
                    gestureScore.handshapeEvidence.matchingFrameRatio * 100,
                  )}
                  % (minimum{' '}
                  {Math.round(
                    gestureScore.handshapeEvidence.requiredMatchingFrameRatio *
                      100,
                  )}
                  %).
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadGestureDiagnostics(
                    signId,
                    gestureScore,
                    referenceFramesRef.current,
                    rawFrameBufferRef.current,
                    smoothedFrameBufferRef.current,
                    frameBufferRef.current,
                  )
                }
                className="mt-3 w-full border-signal-navy/20 bg-white font-bold text-signal-navy hover:bg-white/80"
              >
                Unduh data percobaan yang gagal
              </Button>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Unduh sebelum mencoba lagi. File berisi koordinat tangan dan
                skor, tanpa rekaman video atau wajah; tetap di perangkatmu
                sampai kamu membagikannya.
              </p>
            </div>
          ) : null}

          {gestureScore.assessable ? (
            <div className="space-y-3">
              <QualitativeMetric
                label="Bentuk tangan"
                value={gestureScore.handshape}
              />
              <QualitativeMetric
                label={
                  gestureScore.gestureKind === 'pose'
                    ? 'Stabilitas pose'
                    : 'Gerakan'
                }
                value={gestureScore.movement}
              />
              <QualitativeMetric
                label="Arah telapak"
                value={gestureScore.orientation}
                unassessed={!gestureScore.orientationAssessable}
              />
              <QualitativeMetric
                label={
                  gestureScore.positionRelativeToBody
                    ? 'Posisi terhadap tubuh'
                    : 'Posisi di kamera'
                }
                value={gestureScore.position}
              />
              {gestureScore.requiredHandCount === 2 ? (
                <QualitativeMetric
                  label="Koordinasi dua tangan"
                  value={gestureScore.coordination}
                />
              ) : null}
              {gestureScore.confusableWith ? (
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="text-signal-navy">Pembeda kosakata</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-signal-coral/10 px-2.5 py-1 text-signal-coral">
                    <span className="size-1.5 rounded-full bg-signal-coral" />
                    Mirip “{gestureScore.confusableWith}”
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 border-t border-signal-navy/10 pt-4">
            <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Kualitas rekaman
            </p>
            <QualitativeMetric
              label="Tangan terlihat"
              value={gestureScore.detectionQuality}
              detection
            />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Tangan yang terlihat stabil belum tentu memiliki ruas jari yang
              terbaca akurat.
            </p>
          </div>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {gestureScore.feedback}
          </p>
          {!gestureScore.passed &&
          gestureScore.assessable &&
          gestureScore.handshape < 50 &&
          (signId === 'apa' || signId === 'kapan' || signId === 'di-mana') ? (
            <p className="mt-3 text-xs leading-5 text-amber-900">
              Untuk tanda di dekat perut, jaga tinggi tangan seperti contoh,
              tetapi beri sedikit ruang antara tangan dan baju. Mundurkan
              kamera hingga perut dan ujung jari terlihat; periksa bentuk jari
              pada video sebelum mencoba lagi.
            </p>
          ) : null}
          {!productionMode && !gestureScore.passed && previouslyMastered ? (
            <p className="mt-3 text-xs leading-5 text-emerald-800">
              Tanda {signLabel} sudah pernah lulus. Percobaan ulang ini tidak
              menghapus progresmu.
            </p>
          ) : null}
          {productionMode && !gestureScore.assessable ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Percobaan ini tidak dihitung sebagai gerakan salah. Perbaiki
              posisi kamera lalu ambil ulang.
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {!gestureScore.orientationAssessable && gestureScore.assessable
              ? 'Arah telapak tidak ikut menentukan hasil karena sudut telapak tidak terbaca cukup andal pada percobaan ini. '
              : null}
            {gestureScore.positionRelativeToBody
              ? '“Posisi terhadap tubuh” membandingkan letak tangan dari bahu dan torso, sehingga tanda di kepala dan dada dapat dibedakan.'
              : 'Bahu atau pinggang belum terlihat cukup jelas; posisi hanya dibandingkan terhadap gambar kamera dan tidak menjadi syarat kelulusan.'}{' '}
            Checker belum menilai ekspresi wajah atau tata bahasa BISINDO.
          </p>

          {isCurriculumDebugUnlocked() ? (
            <details className="mt-4 border border-signal-navy/10 p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-bold text-signal-navy">
                Diagnostik checker lokal
              </summary>
              <p className="mt-2 leading-5">
                Total {gestureScore.overall}; bentuk {gestureScore.handshape};
                gerak {gestureScore.movement}; arah {gestureScore.orientation}
                {gestureScore.orientationAssessable ? '' : ' (tidak dinilai)'};
                posisi {gestureScore.position}; koordinasi{' '}
                {gestureScore.coordination}. Syarat gagal:{' '}
                {gestureScore.criticalMismatch ?? 'tidak ada'}. Frame terekam:{' '}
                {attemptDiagnostics.capturedFrames}, kedua tangan:{' '}
                {attemptDiagnostics.twoHandFrames}.
              </p>
              {gestureScore.passed ? (
                <button
                  type="button"
                  className="mt-3 font-bold text-signal-navy underline underline-offset-2"
                  onClick={() =>
                    downloadGestureDiagnostics(
                      signId,
                      gestureScore,
                      referenceFramesRef.current,
                      rawFrameBufferRef.current,
                      smoothedFrameBufferRef.current,
                      frameBufferRef.current,
                    )
                  }
                >
                  Unduh landmark percobaan
                </button>
              ) : null}
            </details>
          ) : null}

          {gestureScore.passed && nextAction ? (
            <div className="mt-5 border border-signal-teal bg-signal-teal-soft p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
                <Check className="size-4" strokeWidth={3} />{' '}
                {nextAction.practiceComplete
                  ? 'Tahap Tirukan selesai'
                  : `Tanda ${signLabel} lulus`}
              </p>
              <p className="mt-2 text-sm leading-6 text-signal-navy/75">
                {nextAction.description}
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-2">
            {gestureScore.passed && nextAction ? (
              <Link
                href={nextAction.href}
                className={cn(
                  buttonVariants(),
                  'h-11 w-full rounded-full bg-[#00D5D1] font-black text-slate-900 hover:bg-[#00D5D1]/90',
                )}
              >
                {nextAction.label} <ArrowRight className="size-4" />
              </Link>
            ) : null}
            {!productionMode &&
            !reviewMode &&
            !gestureScore.passed &&
            practiceComplete ? (
              <Link
                href={`/missions/test?mission=${missionId}&mode=recognition`}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-11 w-full rounded-full border-2 border-[#00D5D1] font-black text-slate-900 hover:bg-[#00D5D1]/10',
                )}
              >
                Lanjut ke Uji pengenalan <ArrowRight className="size-4" />
              </Link>
            ) : null}

            <Button
              type="button"
              variant={gestureScore.passed ? 'outline' : 'default'}
              onClick={retryPractice}
              className={cn(
                'h-11 w-full rounded-full font-black',
                gestureScore.passed
                  ? 'border-2 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#00D5D1] text-slate-900 hover:bg-[#00D5D1]/90',
              )}
            >
              <RotateCcw className="size-4" /> Coba lagi
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
              {calibrationChecks.map((check) => {
                const Icon = check.icon;
                return (
                  <li key={check.label} className="flex items-center gap-3.5">
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full',
                        check.passed
                          ? 'bg-[#00D5D1]/20 text-emerald-800'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {check.passed ? (
                        <Check className="size-5 stroke-[2.5] text-emerald-700" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </span>
                    <div>
                      <span className="block text-sm font-black text-slate-900">
                        {check.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {check.detail}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-5">
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              {referenceReady
                ? 'Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat, dan beri ruang di sekitar kedua tangan.'
                : 'Gunakan cahaya dari depan, jaga tubuh bagian atas tetap terlihat, dan beri ruang di sekitar kedua tangan.'}
            </p>
            {isReady && !referenceReady && (
              <p className="mt-3 text-xs font-semibold text-[#E54D2E]">
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
  if (status === 'loading-model')
    return 'Memuat model landmark tangan dan tubuh…';
  if (status === 'loading-reference')
    return 'Menyiapkan referensi gerakan dan posisi tubuh…';
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
  hands: HandObservation[],
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

  for (const { landmarks } of hands) {
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
  const gestureWindow = getReferenceGestureWindow(frames);
  if (!gestureWindow) {
    return { startMs: 0, durationMs: FALLBACK_RECORDING_DURATION_MS };
  }

  const startMs = gestureWindow.startMs;
  const visibleDuration =
    gestureWindow.endMs - startMs + REFERENCE_SAMPLE_INTERVAL_MS;
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

function downloadGestureDiagnostics(
  signId: SignId,
  displayedScore: GestureScore,
  referenceFrames: GestureFrame[],
  rawFrames: GestureFrame[],
  smoothedFrames: GestureFrame[],
  scoredFrames: GestureFrame[],
) {
  // Development-only, explicit local export. Pose landmarks can contain face
  // points, so share only the hand coordinates needed to reproduce scoring.
  const handFrames = (frames: GestureFrame[]) =>
    frames.map((frame) => ({
      timeMs: frame.timeMs,
      hands: frame.hands.map(({ landmarks, handedness, confidence }) => ({
        landmarks,
        handedness,
        confidence,
      })),
    }));
  const payload = {
    signId,
    referenceWindow: getReferenceGestureWindow(referenceFrames),
    referenceFrames: handFrames(referenceFrames),
    displayedScore,
    rawScore: rawFrames.length
      ? scoreGesture(referenceFrames, rawFrames)
      : null,
    smoothedScore: smoothedFrames.length
      ? scoreGesture(referenceFrames, smoothedFrames)
      : null,
    rawFrames: handFrames(rawFrames),
    smoothedFrames: handFrames(smoothedFrames),
    scoredFrames: handFrames(scoredFrames),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `bisara-${signId}-landmark-debug.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function practiceResultLabel(score: GestureScore, previouslyMastered: boolean) {
  if (score.passed) return 'Sudah sesuai';
  if (previouslyMastered) return 'Percobaan ulang belum sesuai';
  return 'Belum sesuai';
}

function QualitativeMetric({
  label,
  value,
  detection = false,
  unassessed = false,
}: {
  label: string;
  value: number;
  detection?: boolean;
  unassessed?: boolean;
}) {
  const state = unassessed
    ? 'Tidak dinilai'
    : value >= 75
      ? detection
        ? 'Stabil'
        : 'Baik'
      : value >= 50
        ? detection
          ? 'Cukup'
          : 'Mendekati'
        : 'Perlu diperbaiki';
  return (
    <div className="flex items-center justify-between gap-3 text-xs font-bold">
      <span className="text-signal-navy">{label}</span>
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
          unassessed
            ? 'bg-muted text-muted-foreground'
            : value >= 75
              ? 'bg-signal-teal-soft text-emerald-800'
              : value >= 50
                ? 'bg-signal-yellow/25 text-amber-800'
                : 'bg-signal-coral/10 text-signal-coral',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            unassessed
              ? 'bg-muted-foreground'
              : value >= 75
                ? 'bg-signal-teal'
                : value >= 50
                  ? 'bg-signal-yellow'
                  : 'bg-signal-coral',
          )}
          aria-hidden="true"
        />
        {state}
      </span>
    </div>
  );
}
