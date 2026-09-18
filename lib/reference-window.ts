type TimedFrame = { timeMs: number };

// These boundaries mark the performed sign, excluding the demonstrator's
// preparation and return to rest. Keep them tied to the exact source clip.
const curatedWindows: Record<string, { startMs: number; endMs: number }> = {
  // One complete wrist/finger sweep. The rest of this clip starts another
  // cycle but stops mid-motion, which made a correct single cycle fail.
  'signer2_label26_sample3.mp4': { startMs: 528, endMs: 1122 }, // Keluarga
};

const practicePreviews: Record<string, string> = {
  'signer2_label26_sample3.mp4': 'signer2_label26_sample3-practice.mp4',
};

export function getPracticePreviewVideoUrl(videoUrl: string) {
  const [path, query] = videoUrl.split('?');
  const filename = path.split('/').at(-1) ?? '';
  const preview = practicePreviews[filename];
  if (!preview) return videoUrl;
  return `${path.slice(0, -filename.length)}${preview}${query ? `?${query}` : ''}`;
}

export function getCuratedReferenceWindow(videoUrl: string) {
  const filename = videoUrl.split('?')[0].split('/').at(-1) ?? '';
  return curatedWindows[filename] ?? null;
}

export function selectReferenceWindow<T extends TimedFrame>(
  videoUrl: string,
  frames: T[],
): T[] {
  const window = getCuratedReferenceWindow(videoUrl);
  if (!window) return frames;
  const selected = frames.filter(
    (frame) => frame.timeMs >= window.startMs && frame.timeMs <= window.endMs,
  );
  return selected.length >= 6 ? selected : frames;
}
