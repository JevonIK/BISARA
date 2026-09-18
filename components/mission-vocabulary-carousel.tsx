'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type { SignDefinition } from '@/lib/curriculum-data';
import { versionedSignVideo } from '@/lib/curriculum-data';
import type { Mission } from '@/lib/learning-data';
import { cn } from '@/lib/utils';

export function MissionVocabularyCarousel({
  mission,
  signs,
}: {
  mission: Mission;
  signs: SignDefinition[];
}) {
  const [startIndex, setStartIndex] = useState(0);

  const itemsPerPage = 2;
  const canGoNext = signs.length > itemsPerPage;

  const handleNext = () => {
    if (!canGoNext) return;
    setStartIndex((prev) => (prev + 1) % signs.length);
  };

  // Get current active visible signs (showing up to 2 items)
  const visibleSigns =
    signs.length <= itemsPerPage
      ? signs
      : [signs[startIndex], signs[(startIndex + 1) % signs.length]];

  const visibleSignIds = visibleSigns.map((s) => s.id);

  return (
    <section className="mt-8 grid grid-cols-1 lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr] gap-8 items-start">
      {/* Left: Target Pembelajaran Card matching Image 0 */}
      <div className="rounded-[2.25rem] bg-white p-6 sm:p-7 border border-amber-200/50 shadow-xs">
        <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
          TARGET PEMBELAJARAN
        </span>
        <div className="mt-3.5 flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-full border-2 border-[#E54D2E] text-[#E54D2E]">
            <span className="size-2 rounded-full bg-[#E54D2E]" />
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {signs.length} KOSA KATA
          </h2>
        </div>
        <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
          {mission.type === 'checkpoint'
            ? 'Mengenali dan menguasai seluruh vocabulary pada bab ini'
            : 'Mengenali vocabulary dasar terkait identitas dan komunikasi Tuli'}
        </p>

        {/* Vocabulary Pills Grid */}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {signs.map((sign, index) => {
            const isVisible = visibleSignIds.includes(sign.id);
            return (
              <button
                key={sign.id}
                type="button"
                onClick={() => setStartIndex(index)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2.5 text-center text-sm font-black transition-all cursor-pointer select-none',
                  isVisible
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-900 hover:border-slate-500',
                )}
              >
                {sign.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Video Demonstration Carousel matching Image 0 */}
      <div className="flex flex-col justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Amati setiap tanda sebelum menirukan :
          </h2>
          <p className="mt-2 text-sm sm:text-base font-semibold text-slate-600 leading-relaxed">
            Perhatikan bentuk jari, arah telapak, posisi terhadap tubuh, titik akhir gerakan beserta ekspresi wajah.
          </p>
        </div>

        {/* Video Display Row with Next button strictly on the right side */}
        <div className="mt-6 flex items-center gap-3 sm:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {visibleSigns.map((sign) => (
              <div
                key={sign.id}
                className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black shadow-inner border border-black/10"
              >
                <span className="absolute top-3.5 left-3.5 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs">
                  {sign.label}
                </span>
                <video
                  key={sign.id}
                  src={versionedSignVideo(sign.videoSrc)}
                  aria-label={`Demonstrasi tanda ${sign.label}`}
                  className="size-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  controlsList="nodownload noplaybackrate"
                >
                  <track kind="captions" />
                </video>
              </div>
            ))}
          </div>

          {canGoNext && (
            <button
              type="button"
              onClick={handleNext}
              className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-full bg-[#FFAE00] text-slate-950 shadow-md hover:bg-[#ff9f00] active:scale-95 transition-all cursor-pointer"
              aria-label="Tanda berikutnya"
            >
              <ChevronRight className="size-6 stroke-[3]" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
