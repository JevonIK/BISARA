import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

import { SIGN_VIDEO_VERSION } from '@/lib/curriculum-data';
import { ALPHABET_TEMPLATE_VERSION } from '@/lib/alphabet-data';
import type { AlphabetReferenceSet } from '@/lib/alphabet-scoring';
import { selectReferenceWindow } from '@/lib/reference-window';
import {
  hasUsableReference,
  selectBodyPoseLandmarks,
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
  variants?: Record<string, GestureFrame[][]>;
};

const referenceCache = new Map<string, GestureFrame[]>();
const bodyReferenceCache = new Map<string, GestureFrame[]>();
const inFlightReferences = new Map<string, Promise<GestureFrame[]>>();
let storedTemplatesPromise: Promise<StoredTemplates> | null = null;
let storedAlphabetPromise: Promise<StoredTemplates> | null = null;
let extractorPromise: Promise<HandLandmarker> | null = null;
let extractionTail: Promise<void> = Promise.resolve();

export function getAlphabetReferenceSet(): Promise<AlphabetReferenceSet> {
  if (!storedAlphabetPromise) {
    storedAlphabetPromise = fetch(`/data/alphabet-templates-v1.json?v=${ALPHABET_TEMPLATE_VERSION}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Template alfabet tidak tersedia.');
        const manifest = (await response.json()) as StoredTemplates;
        if (manifest.version !== ALPHABET_TEMPLATE_VERSION || !manifest.frames || !manifest.variants) {
          throw new Error('Versi template alfabet tidak sesuai.');
        }
        return manifest;
      }).catch((error) => {
        storedAlphabetPromise = null;
        throw error;
      });
  }
  return storedAlphabetPromise.then((manifest) => ({
    frames: manifest.frames,
    variants: manifest.variants ?? {},
  }));
}

export async function getAlphabetReferenceFrames(videoUrl: string): Promise<GestureFrame[]> {
  const filename = new URL(videoUrl, window.location.href).pathname.split('/').at(-1) ?? '';
  const frames = (await getAlphabetReferenceSet()).frames[filename];
  if (!frames || !hasUsableReference(frames)) {
    throw new Error(`Template alfabet tidak valid: ${filename}`);
  }
  return frames;
}

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
  return selectReferenceWindow(videoUrl, frames);
}

/**
 * Adds shoulder and torso landmarks to one reference clip after the learner
 * activates the camera. Hand templates stay precomputed; this extra pass is
 * only needed for body-relative placement and is cached for the page session.
 */
export async function getBodyAnchoredReferenceFrames(
  videoUrl: string,
  frames: GestureFrame[],
  landmarker: PoseLandmarker,
): Promise<GestureFrame[]> {
  const cached = bodyReferenceCache.get(videoUrl);
  if (cached) return cached;

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;

  try {
    await loadVideo(video, videoUrl);
    const enriched: GestureFrame[] = [];

    for (const frame of frames) {
      const targetSeconds = Math.min(
        Math.max(0, frame.timeMs / 1000),
        Math.max(0, video.duration - 0.001),
      );
      await seekVideo(video, targetSeconds);
      if (video.readyState < 2) {
        enriched.push(frame);
        continue;
      }

      try {
        const result = landmarker.detectForVideo(video, frame.timeMs);
        const poseLandmarks = selectBodyPoseLandmarks(
          result.landmarks.map((pose) =>
            pose.map((landmark) => ({
              x: landmark.x,
              y: landmark.y,
              z: landmark.z,
              visibility: landmark.visibility,
            })),
          ),
          frame.hands,
        );
        enriched.push(
          poseLandmarks?.length ? { ...frame, poseLandmarks } : frame,
        );
      } catch {
        enriched.push(frame);
      }
    }

    const poseCoverage =
      enriched.filter((frame) => frame.poseLandmarks?.length).length /
      Math.max(1, enriched.length);
    if (poseCoverage >= 0.6) bodyReferenceCache.set(videoUrl, enriched);
    return enriched;
  } finally {
    releaseVideo(video);
  }
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
    })().catch((error) => {
      extractorPromise = null;
      throw error;
    });
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
        const selectedFrames = selectReferenceWindow(videoUrl, frames);
        if (!hasUsableReference(selectedFrames)) {
          throw new Error(
            'Referensi gerakan tidak memiliki cukup landmark tangan yang valid.',
          );
        }
        referenceCache.set(videoUrl, selectedFrames);
        return selectedFrames;
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
  interval = 0.066,
): Promise<GestureFrame[]> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;

  try {
    await loadVideo(video, videoUrl);

    const duration = video.duration;
    const frames: GestureFrame[] = [];

    for (let t = 0; t < duration; t += interval) {
      await seekVideo(video, t);

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
    releaseVideo(video);
  }
}

function loadVideo(video: HTMLVideoElement, videoUrl: string) {
  return new Promise<void>((resolve, reject) => {
    video.addEventListener('loadeddata', () => resolve(), { once: true });
    video.addEventListener(
      'error',
      () => reject(new Error(`Failed to load reference video: ${videoUrl}`)),
      { once: true },
    );
    video.load();
  });
}

function seekVideo(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      resolve();
    };
    video.addEventListener('seeked', finish, { once: true });
    video.currentTime = time;
    setTimeout(finish, 150);
  });
}

function releaseVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute('src');
  video.load();
}
