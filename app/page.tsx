'use client';

import { useState } from 'react';
import {
  Award,
  Bookmark,
  BookOpen,
  Flag,
  Hand,
  Headphones,
  MessageSquare,
  Play,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { ChapterAccordionCard } from '@/components/chapter-accordion-card';
import { useProgress } from '@/hooks/use-progress';
import { chapters, getChapterForMission } from '@/lib/learning-data';
import {
  getCurrentMission,
  getMissionLearningState,
  getPrototypeMissionCount,
} from '@/lib/learning-progress';

export default function Home() {
  const progress = useProgress();
  const currentMission = getCurrentMission(progress);
  const currentChapter = getChapterForMission(currentMission.id);
  const currentChapterIndex = chapters.findIndex(
    (chapter) => chapter.id === currentChapter.id,
  );
  const missionState = getMissionLearningState(currentMission, progress);
  const completedMissions = getPrototypeMissionCount(progress);
  const badgeCount = [
    completedMissions > 0,
    progress.streak >= 7,
    progress.bestChapterScore >= 70,
    Object.values(progress.signMastery).some((item) => item.recall),
  ].filter(Boolean).length;

  const [expandedChapterIds, setExpandedChapterIds] = useState<
    Record<string, boolean>
  >({
    'chapter-1': true,
  });

  const toggleChapter = (chapterId: string) => {
    setExpandedChapterIds((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  return (
    <main className="min-h-screen bg-[#FFE8A3]">
      <AppHeader active="home" />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Hero Section with White Background and Yellow Accent Border */}
        <section className="relative overflow-hidden rounded-[2.5rem] border-b-[10px] border-[#FED96A] bg-white p-6 shadow-sm sm:rounded-[3.5rem] sm:p-10 lg:p-12">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#E54D2E]" />
            <span className="text-xs font-black tracking-wide text-slate-900 sm:text-sm">
              Selamat datang kembali
            </span>
          </div>

          <h1 className="max-w-2xl text-3xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Lanjutkan langkahmu untuk berkomunikasi.
          </h1>

          <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            {/* Active Mission Warm Cream Card with Clinking Cups Illustration Inside */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#FCE5B5] bg-[#FFF8EA] p-6 shadow-2xs sm:p-8">
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1.2fr_1fr]">
                <div>
                  <span className="inline-block rounded-full bg-[#F8A51D] px-3.5 py-1 text-[11px] font-black tracking-wide text-white shadow-2xs">
                    Misi aktif • Bab {currentChapter.number}
                  </span>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-900">
                    MISI {currentMission.number}
                  </p>
                  <h2 className="mt-1 text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                    {currentMission.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {currentMission.description}
                  </p>

                  <div className="mt-6">
                    <Link
                      href={missionState.next.href}
                      className="inline-flex items-center gap-2 rounded-full bg-[#F8A51D] px-6 py-3 text-sm font-black text-slate-900 shadow-sm transition-transform hover:bg-[#E59312] hover:scale-105 active:scale-95"
                    >
                      <Play className="size-4 fill-slate-900" />
                      Lanjutkan latihan
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <HeroCheersIllustration />
                </div>
              </div>
            </div>

            {/* 3 Stacked White Stat Cards */}
            <div className="flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="grid size-12 place-items-center rounded-xl bg-orange-50 text-[#E54D2E]">
                  <Flag className="size-7 fill-[#E54D2E]" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">
                    Misi selesai
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {completedMissions}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="grid size-12 place-items-center rounded-xl bg-cyan-50 text-[#00BDCD]">
                  <Bookmark className="size-7 fill-[#00BDCD]" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">
                    Tanda dikuasai
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {progress.masteredSigns}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="grid size-12 place-items-center rounded-xl bg-amber-50 text-[#F8A51D]">
                  <Award className="size-7 fill-[#F8A51D]" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">
                    Lencana
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {badgeCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara Belajar BISARA Wrapped in White Container */}
        <section className="mt-8 rounded-[2.5rem] border border-amber-200/50 bg-white p-6 shadow-xs sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_1.35fr]">
            <div className="flex min-h-[220px] flex-col justify-between rounded-2xl bg-[#F25C3B] p-7 text-white sm:p-8">
              <Headphones className="size-8 text-white/90" />
              <div className="mt-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  CARA BELAJAR BISARA
                </p>
                <h2 className="mt-2 text-2xl font-black leading-snug tracking-tight text-white sm:text-3xl">
                  Bukan hanya tahu. Kamu berlatih sampai siap merespons.
                </h2>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl px-2 py-1 sm:px-4">
              <div className="flex items-center gap-3.5 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F25C3B] text-xs font-black text-white">
                  ✓
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Kenali</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Pahami bentuk, konteks, dan arti tanda.
                  </p>
                </div>
              </div>

              <div className="border-b border-[#F7D8CB]" />

              <div className="flex items-center gap-3.5 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F25C3B] text-white">
                  <Hand className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Tirukan</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Tirukan dengan bantuan contoh dan umpan balik.
                  </p>
                </div>
              </div>

              <div className="border-b border-[#F7D8CB]" />

              <div className="flex items-center gap-3.5 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F25C3B] text-white">
                  <MessageSquare className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Latihan</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Gunakan tanpa petunjuk di dalam skenario.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Perjalanan Belajarmu Section */}
        <section className="mt-12 sm:mt-14">
          <div className="mb-6">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-800">
              <BookOpen className="size-4" /> Perjalanan Belajarmu
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Empat bab, satu tujuan nyata.
            </h2>
          </div>

          <div className="space-y-6">
            {chapters.map((chapter, index) => (
              <ChapterAccordionCard
                key={chapter.id}
                chapter={chapter}
                chapterIndex={index}
                isExpanded={Boolean(expandedChapterIds[chapter.id])}
                onToggle={() => toggleChapter(chapter.id)}
                progress={progress}
                currentMission={currentMission}
                currentChapterIndex={currentChapterIndex}
              />
            ))}
          </div>
        </section>

        <footer className="mt-16 flex flex-col gap-3 border-t border-amber-300/40 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-slate-800">
            BISARA · Belajar untuk berkomunikasi, bukan sekadar menghafal tanda.
          </p>
          <p>Materi dikembangkan bersama dan divalidasi oleh komunitas Tuli.</p>
        </footer>
      </div>
    </main>
  );
}

function HeroCheersIllustration() {
  return (
    <svg
      className="h-44 w-56 sm:h-52 sm:w-64"
      viewBox="0 0 260 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Liquid splash bursting between the cups */}
      <path
        d="M130 18L137 50L162 34L148 64L184 70L152 90L174 122L138 100L126 132L116 100L80 122L102 90L70 70L106 64L92 34L117 50L124 18Z"
        fill="#C4561D"
      />

      {/* Left arm with yellow sleeve and cuff */}
      <path
        d="M72 210L94 140L112 146L90 210H72Z"
        fill="#F8A51D"
      />
      <rect
        x="91"
        y="136"
        width="22"
        height="6"
        rx="2"
        transform="rotate(15 91 136)"
        fill="#D67E08"
      />
      {/* Left wrist & hand */}
      <path
        d="M97 138L110 106L122 110L113 142L97 138Z"
        fill="#E8927C"
      />
      {/* Left cup */}
      <rect
        x="105"
        y="84"
        width="28"
        height="35"
        rx="4"
        transform="rotate(15 105 84)"
        fill="#FFF2B8"
        stroke="#E69680"
        strokeWidth="2"
      />
      <rect
        x="103"
        y="80"
        width="32"
        height="8"
        rx="2.5"
        transform="rotate(15 103 80)"
        fill="#362B28"
      />
      {/* Hand fingers clasping left cup */}
      <rect
        x="115"
        y="96"
        width="16"
        height="6"
        rx="3"
        transform="rotate(15 115 96)"
        fill="#E8927C"
      />
      <rect
        x="113"
        y="105"
        width="16"
        height="6"
        rx="3"
        transform="rotate(15 113 105)"
        fill="#E8927C"
      />

      {/* Right arm with reddish orange sleeve and cuff */}
      <path
        d="M188 210L166 140L148 146L170 210H188Z"
        fill="#CF5336"
      />
      <rect
        x="146"
        y="142"
        width="22"
        height="6"
        rx="2"
        transform="rotate(-15 146 142)"
        fill="#A6381F"
      />
      {/* Right wrist & hand */}
      <path
        d="M163 138L150 106L138 110L147 142L163 138Z"
        fill="#F1AB99"
      />
      {/* Right cup */}
      <rect
        x="127"
        y="91"
        width="28"
        height="35"
        rx="4"
        transform="rotate(-15 127 91)"
        fill="#FFF2B8"
        stroke="#E69680"
        strokeWidth="2"
      />
      <rect
        x="125"
        y="87"
        width="32"
        height="8"
        rx="2.5"
        transform="rotate(-15 125 87)"
        fill="#362B28"
      />
      {/* Hand fingers clasping right cup */}
      <rect
        x="129"
        y="100"
        width="16"
        height="6"
        rx="3"
        transform="rotate(-15 129 100)"
        fill="#F1AB99"
      />
      <rect
        x="131"
        y="109"
        width="16"
        height="6"
        rx="3"
        transform="rotate(-15 131 109)"
        fill="#F1AB99"
      />
    </svg>
  );
}
