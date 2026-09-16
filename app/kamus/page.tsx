'use client';

import { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, Play, Search, X } from 'lucide-react';

import { AppHeader } from '@/components/app-header';
import { useProgress } from '@/hooks/use-progress';
import {
  signs,
  versionedSignVideo,
  type SignDefinition,
  type SignId,
} from '@/lib/curriculum-data';
import { chapters } from '@/lib/learning-data';
import type { UserProgress } from '@/lib/progress-storage';

function isSignUnlocked(signId: SignId, progress: UserProgress): boolean {
  const mastery = progress.signMastery[signId];
  if (mastery?.passed) return true;
  if ((mastery?.productionPassedMissionIds?.length ?? 0) > 0) return true;
  if ((mastery?.bestScore ?? 0) >= 70) return true;

  // Also check if any completed mission includes this sign
  for (const chapter of chapters) {
    for (const mission of chapter.missions) {
      if (
        progress.completedMissionIds.includes(mission.id) &&
        mission.signIds.includes(signId)
      ) {
        return true;
      }
    }
  }

  return false;
}

export default function KamusPage() {
  const progress = useProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSign, setSelectedSign] = useState<SignDefinition | null>(null);

  // Close modal on Escape and prevent body scrolling when modal is open
  useEffect(() => {
    if (!selectedSign) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSign(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedSign]);

  // Group signs alphabetically by first letter
  const letterGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = signs.filter((sign) =>
      query ? sign.label.toLowerCase().includes(query) : true,
    );

    const sorted = [...filtered].sort((a, b) =>
      a.label.localeCompare(b.label, 'id'),
    );

    const groups: Record<string, typeof sorted> = {};
    for (const sign of sorted) {
      const letter = sign.label[0].toUpperCase();
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(sign);
    }

    return groups;
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-[#FFE8A3] pb-16">
      <AppHeader active="kamus" />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 lg:px-8 flex flex-col gap-6 sm:gap-8">
        {/* Search Bar matching mockup */}
        <div className="relative w-full">
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3.5 sm:py-4 shadow-xs border border-amber-200/40">
            <Search className="size-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata atau isyarat..."
              className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Hapus pencarian"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Letter Sections */}
        {Object.entries(letterGroups).map(([letter, items]) => (
          <section
            key={letter}
            className="overflow-hidden rounded-[2rem] sm:rounded-[2.25rem] bg-white shadow-xs border border-amber-300/40"
          >
            {/* Yellow Header with Circular Letter Badge */}
            <div className="bg-[#FFCF52] px-5 py-3.5 sm:px-7 sm:py-4 flex items-center">
              <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-[#FFAE00] text-slate-950 font-black text-xs sm:text-sm shadow-xs">
                {letter}
              </div>
            </div>

            {/* Word Cards Grid */}
            <div className="p-4 sm:p-6 lg:p-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {items.map((sign) => {
                  const unlocked = isSignUnlocked(sign.id as SignId, progress);

                  if (unlocked) {
                    return (
                      <button
                        key={sign.id}
                        type="button"
                        onClick={() => setSelectedSign(sign)}
                        className="group flex items-center justify-between rounded-2xl border border-[#FCD561] bg-white px-5 py-3.5 sm:px-6 sm:py-4 text-left shadow-2xs transition-all hover:border-[#F8A51D] hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors">
                          {sign.label}
                        </span>
                        <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-[#FFAE00] shadow-xs transition-transform group-hover:scale-105 group-active:scale-95">
                          <Play className="size-4 sm:size-4.5 fill-white text-white translate-x-0.5" />
                        </span>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={sign.id}
                      className="flex items-center justify-between rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] px-5 py-3.5 sm:px-6 sm:py-4 cursor-not-allowed opacity-90 select-none"
                      title="Kosakata ini belum dipelajari"
                    >
                      <span className="text-base sm:text-lg font-bold tracking-tight text-slate-500">
                        {sign.label}
                      </span>
                      <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-[#94A3B8] shadow-xs">
                        <LockKeyhole className="size-4 sm:size-4.5 text-white" />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        {/* Empty State when search returns no results */}
        {Object.keys(letterGroups).length === 0 && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-xs border border-amber-200/40">
            <p className="text-base font-bold text-slate-600">
              Tidak ada kosakata yang cocok dengan &quot;{searchQuery}&quot;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 rounded-full bg-[#FFAE00] px-6 py-2 text-xs font-black text-slate-950 shadow-xs hover:bg-[#F2A300]"
            >
              Reset Pencarian
            </button>
          </div>
        )}
      </div>

      {/* Video Demonstration Modal matching mockup */}
      {selectedSign ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop button */}
          <button
            type="button"
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-default transition-opacity"
            onClick={() => setSelectedSign(null)}
            aria-label="Tutup modal peragaan"
          />

          {/* Modal content dialog */}
          <div className="relative z-10 w-full max-w-2xl sm:max-w-3xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#FFFBF0] shadow-2xl border-t-[10px] border-[#FFAE00] p-6 sm:p-10 lg:p-12 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedSign(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full p-2 text-slate-700 hover:bg-slate-200/50 hover:text-slate-950 transition-colors focus:outline-none"
              aria-label="Tutup video peragaan"
            >
              <X className="size-6 sm:size-7" />
            </button>

            {/* Video Player */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative aspect-4/3 w-full max-w-lg sm:max-w-xl overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900/5 shadow-md">
                <video
                  key={selectedSign.id}
                  src={versionedSignVideo(selectedSign.videoSrc)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {selectedSign.label}
                </h3>
                {selectedSign.focus ? (
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
                    Fokus: {selectedSign.focus}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
