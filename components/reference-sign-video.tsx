'use client';

import { useRef, useState } from 'react';

type ReferenceWindow = { startMs: number; endMs: number } | null;

export function ReferenceSignVideo({
  id,
  src,
  label,
  window,
}: {
  id: string;
  src: string;
  label: string;
  window: ReferenceWindow;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [slowPreview, setSlowPreview] = useState(Boolean(window));

  const keepPreviewOnGesture = (video: HTMLVideoElement) => {
    // CameraPractice owns playback speed during a recording. Both preview and
    // recording still loop, including for clips with a curated sign window.
    if (video.dataset.practiceRecording !== 'true') {
      video.playbackRate = slowPreview ? 0.5 : 1;
    }
    if (!window) return;
    const start = window.startMs / 1000;
    const end = window.endMs / 1000;
    if (video.currentTime < start - 0.04 || video.currentTime >= end - 0.02) {
      video.currentTime = start;
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        id={id}
        className="mt-5 aspect-[4/3] w-full bg-black object-cover"
        src={src}
        aria-label={`Video contoh tanda ${label}`}
        autoPlay
        loop
        muted
        playsInline
        controls
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (window) video.currentTime = window.startMs / 1000;
          if (video.dataset.practiceRecording !== 'true') {
            video.playbackRate = slowPreview ? 0.5 : 1;
          }
        }}
        onPlay={(event) => keepPreviewOnGesture(event.currentTarget)}
        onTimeUpdate={(event) => keepPreviewOnGesture(event.currentTarget)}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {window
            ? 'Bagian gerakan yang dinilai diputar berulang.'
            : 'Amati gerakan dari awal sampai akhir.'}
        </span>
        <button
          type="button"
          className="rounded-full border border-signal-navy/15 px-3 py-1.5 font-bold text-signal-navy hover:bg-muted"
          aria-label={`Kecepatan video contoh ${slowPreview ? 'setengah' : 'normal'}`}
          onClick={() => {
            const next = !slowPreview;
            setSlowPreview(next);
            const video = videoRef.current;
            if (video && video.dataset.practiceRecording !== 'true') {
              video.playbackRate = next ? 0.5 : 1;
            }
          }}
        >
          Kecepatan {slowPreview ? '0,5×' : 'normal'}
        </button>
      </div>
    </>
  );
}
