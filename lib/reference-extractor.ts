import type { HandLandmarker } from '@mediapipe/tasks-vision';

import {
  hasUsableReference,
  type GestureFrame,
  type HandObservation,
} from '@/lib/gesture-scoring';

const referenceCache = new Map<string, GestureFrame[]>();

/**
 * Extract hand landmark frames from a video using a loaded HandLandmarker.
 * Results are cached in memory by URL so repeated calls skip extraction.
 */
export async function getReferenceFrames(
  videoUrl: string,
  landmarker: HandLandmarker,
): Promise<GestureFrame[]> {
  const cached = referenceCache.get(videoUrl);
  if (cached) return cached;

  const frames = await extractFramesFromVideo(videoUrl, landmarker);
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
    const result = landmarker.detectForVideo(video, timeMs);

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
