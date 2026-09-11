import type { HandLandmarker } from '@mediapipe/tasks-vision';

import {
  hasUsableReference,
  type GestureFrame,
  type HandObservation,
} from '@/lib/gesture-scoring';

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const referenceCache = new Map<string, GestureFrame[]>();
let extractorPromise: Promise<HandLandmarker> | null = null;

async function getExtractorLandmarker(): Promise<HandLandmarker> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import(
        '@mediapipe/tasks-vision'
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL },
        runningMode: 'IMAGE',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });
    })();
  }
  return extractorPromise;
}

/**
 * Extract hand landmark frames from a video.
 * Uses a dedicated IMAGE-mode HandLandmarker so that timestamp conflicts
 * and concurrent inference with the live camera VIDEO-mode stream never occur.
 * Results are cached in memory by URL so repeated calls skip extraction.
 */
export async function getReferenceFrames(
  videoUrl: string,
  _ignoredLandmarker?: HandLandmarker,
): Promise<GestureFrame[]> {
  const cached = referenceCache.get(videoUrl);
  if (cached) return cached;

  const extractor = await getExtractorLandmarker();
  const frames = await extractFramesFromVideo(videoUrl, extractor);
  if (!hasUsableReference(frames)) {
    throw new Error(
      'Referensi gerakan tidak memiliki cukup landmark tangan yang valid.',
    );
  }
  referenceCache.set(videoUrl, frames);
  return frames;
}

async function extractFramesFromVideo(
  videoUrl: string,
  landmarker: HandLandmarker,
): Promise<GestureFrame[]> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadeddata', () => resolve(), { once: true });
    video.addEventListener(
      'error',
      () => reject(new Error(`Failed to load reference video: ${videoUrl}`)),
      { once: true },
    );
    video.load();
  });

  const duration = video.duration;
  const interval = 0.066; // ~15 fps sampling
  const frames: GestureFrame[] = [];

  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;
    await new Promise<void>((resolve) => {
      video.addEventListener('seeked', () => resolve(), { once: true });
    });

    if (video.readyState < 2) continue;

    const timeMs = Math.round(t * 1000);
    const result = landmarker.detect(video);

    const hands: HandObservation[] = result.landmarks.map((landmarks, i) => ({
      landmarks: landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z })),
      worldLandmarks: result.worldLandmarks[i]?.map((l) => ({
        x: l.x,
        y: l.y,
        z: l.z,
      })),
      handedness: result.handedness[i]?.[0]?.categoryName ?? 'Right',
      confidence: result.handedness[i]?.[0]?.score ?? 0,
    }));

    frames.push({ timeMs, hands });
  }

  return frames;
}
