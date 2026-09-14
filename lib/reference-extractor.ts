import type { HandLandmarker } from '@mediapipe/tasks-vision';

import { SIGN_VIDEO_VERSION } from '@/lib/curriculum-data';
import {
  hasUsableReference,
  type GestureFrame,
  type HandObservation,
} from '@/lib/gesture-scoring';

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const TEMPLATES_URL = `/data/gesture-templates-v1.json?v=${SIGN_VIDEO_VERSION}`;

type StoredTemplates = {
  version: string;
  frames: Record<string, GestureFrame[]>;
};

const referenceCache = new Map<string, GestureFrame[]>();
const inFlightReferences = new Map<string, Promise<GestureFrame[]>>();
let storedTemplatesPromise: Promise<StoredTemplates> | null = null;
let extractorPromise: Promise<HandLandmarker> | null = null;
let extractionTail: Promise<void> = Promise.resolve();

function getStoredTemplates(): Promise<StoredTemplates> {
  if (!storedTemplatesPromise) {
    storedTemplatesPromise = fetch(TEMPLATES_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error('Template gerakan tidak tersedia.');
        const templates = (await response.json()) as StoredTemplates;
        if (templates.version !== SIGN_VIDEO_VERSION || !templates.frames) {
          throw new Error('Template gerakan tidak sesuai dengan video contoh.');
        }
        return templates;
      })
      .catch((error) => {
        storedTemplatesPromise = null;
        throw error;
      });
  }
  return storedTemplatesPromise;
}

export async function getStoredReferenceFrames(
  videoUrl: string,
): Promise<GestureFrame[]> {
  const filename = new URL(videoUrl, window.location.href).pathname
    .split('/')
    .at(-1);
  const frames = filename && (await getStoredTemplates()).frames[filename];
  if (!frames || !hasUsableReference(frames)) {
    throw new Error(`Template gerakan tidak valid: ${filename ?? videoUrl}`);
  }
  return frames;
}

async function getExtractorLandmarker(): Promise<HandLandmarker> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { FilesetResolver, HandLandmarker } =
        await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL },
        runningMode: 'IMAGE',
        numHands: 2,
        minHandDetectionConfidence: 0.35,
        minHandPresenceConfidence: 0.35,
      });
    })();
  }
  return extractorPromise;
}

/**
 * Use precomputed landmarks for the current curriculum. Unknown/future videos
 * fall back to an IMAGE-mode extractor without contending with the live camera.
 */
export async function getReferenceFrames(
  videoUrl: string,
  _ignoredLandmarker?: HandLandmarker,
): Promise<GestureFrame[]> {
  const cached = referenceCache.get(videoUrl);
  if (cached) return cached;
  const inFlight = inFlightReferences.get(videoUrl);
  if (inFlight) return inFlight;

  const retrieval = async () => {
    try {
      const frames = await getStoredReferenceFrames(videoUrl);
      referenceCache.set(videoUrl, frames);
      return frames;
    } catch {
      // A new sign without a stored template can still use its video directly.
    }

    // IMAGE-mode inference uses one shared MediaPipe instance. Concurrent video
    // seeking/inference can drop valid hands, so serialize fallback extraction.
    const extraction = extractionTail.then(async () => {
      const extractor = await getExtractorLandmarker();
      try {
        const frames = await extractFramesFromVideo(videoUrl, extractor);
        if (!hasUsableReference(frames)) {
          throw new Error(
            'Referensi gerakan tidak memiliki cukup landmark tangan yang valid.',
          );
        }
        referenceCache.set(videoUrl, frames);
        return frames;
      } catch (error) {
        extractorPromise = null;
        extractor.close();
        throw error;
      }
    });
    extractionTail = extraction.then(
      () => undefined,
      () => undefined,
    );
    return extraction;
  };
  const inFlightRetrieval = retrieval();
  inFlightReferences.set(videoUrl, inFlightRetrieval);
  try {
    return await inFlightRetrieval;
  } finally {
    inFlightReferences.delete(videoUrl);
  }
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

  try {
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
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked, { once: true });
        setTimeout(onSeeked, 150);
      });

      if (video.readyState < 2) continue;

      const timeMs = Math.round(t * 1000);
      try {
        const result = landmarker.detect(video);

        const hands: HandObservation[] = result.landmarks.map(
          (landmarks, i) => ({
            landmarks: landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z })),
            worldLandmarks: result.worldLandmarks[i]?.map((l) => ({
              x: l.x,
              y: l.y,
              z: l.z,
            })),
            handedness: result.handedness[i]?.[0]?.categoryName ?? 'Right',
            confidence: result.handedness[i]?.[0]?.score ?? 0,
          }),
        );

        frames.push({ timeMs, hands });
      } catch {
        // Continue next frame
      }
    }

    return frames;
  } finally {
    // Releasing each decoder matters when many mission examples are compared
    // in one session; otherwise later references can lose all detections.
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}
