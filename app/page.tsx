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
    <main className="min-h-screen bg-background">
      <AppHeader active="home" />

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-amber-300/80 bg-[#FEE580] p-6 sm:p-8 lg:p-10 shadow-xs">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#E54D2E]" />
            <span className="text-xs font-black tracking-wide text-slate-900">
              Selamat datang kembali
            </span>
          </div>

          <h1 className="max-w-2xl text-3xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Lanjutkan langkahmu untuk berkomunikasi.
          </h1>

          <div className="mt-8 grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.1fr)_220px]">
            {/* Active Mission White Card */}
            <div className="flex min-h-[290px] flex-col justify-between rounded-3xl bg-white p-6 shadow-xs sm:p-7">
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
              </div>

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

            {/* Illustration */}
            <div className="hidden items-center justify-center lg:flex">
              <HeroCheersIllustration />
            </div>

            {/* 3 Stacked Stat Cards */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-xs sm:p-5">
                <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-[#E54D2E]">
                  <Flag className="size-6 fill-[#E54D2E]/20" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500">
                    Misi selesai
                  </p>
                  <p className="text-2xl font-black text-slate-900 sm:text-3xl">
                    {completedMissions}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-xs sm:p-5">
                <div className="grid size-11 place-items-center rounded-xl bg-cyan-50 text-[#00BDCD]">
                  <Bookmark className="size-6 fill-[#00BDCD]/20" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500">
                    Tanda dikuasai
                  </p>
                  <p className="text-2xl font-black text-slate-900 sm:text-3xl">
                    {progress.masteredSigns}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-xs sm:p-5">
                <div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-[#F8A51D]">
                  <Award className="size-6 fill-[#F8A51D]/20" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500">
                    Lencana
                  </p>
                  <p className="text-2xl font-black text-slate-900 sm:text-3xl">
                    {badgeCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara Belajar BISARA */}
        <section className="mt-8 grid gap-5 md:grid-cols-[1fr_1.35fr]">
          <div className="flex min-h-[200px] flex-col justify-between rounded-[2rem] bg-[#F25C3B] p-7 text-white sm:p-8">
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

          <div className="flex flex-col justify-between rounded-[2rem] border border-[#FCD8CA] bg-[#FFF5EE] p-6 sm:p-7">
            <div className="flex items-center gap-3.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F25C3B] text-xs font-black text-white">
                ✓
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Recognize</h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Pahami bentuk, konteks, dan arti tanda.
                </p>
              </div>
            </div>

            <div className="my-1 border-b border-[#F7D8CB]" />

            <div className="flex items-center gap-3.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F25C3B] text-white">
                <Hand className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Imitate</h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Tirukan dengan bantuan contoh dan umpan balik.
                </p>
              </div>
            </div>

            <div className="my-1 border-b border-[#F7D8CB]" />

            <div className="flex items-center gap-3.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F25C3B] text-white">
                <MessageSquare className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Communicate</h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Gunakan tanpa petunjuk di dalam skenario.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Perjalanan Belajarmu Section */}
        <section className="mt-14">
          <div className="mb-6">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700">
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

        <footer className="mt-16 flex flex-col gap-3 border-t border-slate-200 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
      className="h-48 w-64"
      viewBox="0 0 260 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Splash effect */}
      <path
        d="M130 10L136 45L160 30L145 60L180 65L150 85L170 115L135 95L125 125L115 95L80 115L100 85L70 65L105 60L90 30L114 45L120 10Z"
        fill="#C4561D"
      />

      {/* Left arm & cup */}
      <path
        d="M80 190L100 130L115 135L95 190H80Z"
        fill="#F8A51D"
      />
      <path
        d="M100 130L112 100L122 105L115 135L100 130Z"
        fill="#E8927C"
      />
      <rect
        x="105"
        y="80"
        width="26"
        height="32"
        rx="4"
        transform="rotate(15 105 80)"
        fill="#FFFFFF"
        stroke="#E69680"
        strokeWidth="2.5"
      />
      <rect
        x="103"
        y="77"
        width="28"
        height="7"
        rx="2"
        transform="rotate(15 103 77)"
        fill="#3A2D28"
      />

      {/* Right arm & cup */}
      <path
        d="M180 190L160 130L145 135L165 190H180Z"
        fill="#DE6449"
      />
      <path
        d="M160 130L148 100L138 105L145 135L160 130Z"
        fill="#F1AB99"
      />
      <rect
        x="132"
        y="86"
        width="26"
        height="32"
        rx="4"
        transform="rotate(-15 132 86)"
        fill="#FFFFFF"
        stroke="#E69680"
        strokeWidth="2.5"
      />
      <rect
        x="130"
        y="83"
        width="28"
        height="7"
        rx="2"
        transform="rotate(-15 130 83)"
        fill="#3A2D28"
      />
    </svg>
  );
}
