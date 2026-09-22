'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Bookmark,
  BookOpen,
  Flag,
  Hand,
  Headphones,
  MessageSquare,
  Play,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { ChapterAccordionCard } from '@/components/chapter-accordion-card';
import { useAccount } from '@/hooks/use-account';
import { useProgress } from '@/hooks/use-progress';
import { isCurriculumDebugUnlocked } from '@/lib/debug-unlock';
import { chapters, getChapterForMission } from '@/lib/learning-data';
import { cn } from '@/lib/utils';
import {
  getBadgeCount,
  getCurrentMission,
  getMissionActiveStageHref,
  getPrototypeMissionCount,
} from '@/lib/learning-progress';

export default function Home() {
  const account = useAccount();
  const progress = useProgress();
  const currentMission = getCurrentMission(progress);
  const currentChapter = getChapterForMission(currentMission.id);
  const currentChapterIllustration = `/assets/bisara/Bab${Number(currentChapter.number)}.png`;
  const completedMissions = getPrototypeMissionCount(progress);
  const badgeCount = getBadgeCount(progress);
  const [welcomeAlert, setWelcomeAlert] = useState<string | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const dismissAlert = useCallback(() => {
    setIsAlertVisible(false);
    setTimeout(() => {
      setWelcomeAlert(null);
    }, 500);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('bisara_welcome_user');
    const params = new URLSearchParams(window.location.search);
    const isLogin = params.get('login') === 'success';

    if (stored || isLogin) {
      sessionStorage.removeItem('bisara_welcome_user');
      if (isLogin) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      const username = stored || account.user?.displayName || 'Sahabat BISARA';
      const showTimer = setTimeout(() => {
        setWelcomeAlert(username);
        requestAnimationFrame(() => {
          setIsAlertVisible(true);
        });
      }, 10);
      return () => clearTimeout(showTimer);
    }
  }, [account.user?.displayName]);

  useEffect(() => {
    if (!welcomeAlert || !isAlertVisible) return;
    const timer = setTimeout(() => {
      dismissAlert();
    }, 6000);
    return () => clearTimeout(timer);
  }, [welcomeAlert, isAlertVisible, dismissAlert]);

  const [expandedChapterIds, setExpandedChapterIds] = useState<
    Record<string, boolean>
  >(() => ({
    [currentChapter.id]: true,
  }));

  const hasAutoExpanded = useRef(false);
  useEffect(() => {
    if (!hasAutoExpanded.current && currentChapter?.id) {
      hasAutoExpanded.current = true;
      setExpandedChapterIds((prev) => ({
        ...prev,
        [currentChapter.id]: true,
      }));
    }
  }, [currentChapter?.id]);

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
        {/* Welcome Alert after Login with smooth exit transition */}
        {welcomeAlert && (
          <div
            className={cn(
              'overflow-hidden transition-all duration-500 ease-in-out',
              isAlertVisible
                ? 'max-h-48 opacity-100 mb-6 translate-y-0 scale-100'
                : 'max-h-0 opacity-0 mb-0 -translate-y-3 scale-95 pointer-events-none',
            )}
          >
            <output className="block overflow-hidden rounded-3xl sm:rounded-[2.5rem] border-2 border-[#FED96A] bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#FFF8EA] border border-[#FED96A] text-[#F8A51D] shadow-2xs">
                    <Hand className="size-6 text-[#F8A51D]" strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      Selamat datang kembali,{' '}
                      <span className="text-[#E54D2E]">{welcomeAlert}</span>.
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-600">
                      Akunmu berhasil terhubung. Seluruh progres belajar siap dilanjutkan!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-amber-100/70 hover:text-slate-900 cursor-pointer"
                  aria-label="Tutup pemberitahuan"
                >
                  <X className="size-5" />
                </button>
              </div>
            </output>
          </div>
        )}

        {/* Hero Section with White Background and Yellow Accent Border */}
        <section className="relative overflow-hidden rounded-[2.5rem] border-b-[10px] border-[#FED96A] bg-white p-6 shadow-sm sm:rounded-[3.5rem] sm:p-10 lg:p-12">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#E54D2E]" />
            <span className="text-xs font-bold tracking-wide text-slate-900 sm:text-sm">
              Selamat datang kembali{account.user?.displayName ? `, ${account.user.displayName}` : ''}
            </span>
          </div>

          <h1 className="max-w-2xl text-3xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Lanjutkan langkahmu untuk berkomunikasi.
          </h1>

          <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            {/* Active Mission Warm Cream Card */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#FCE5B5] bg-[#FFF8EA] p-6 shadow-2xs sm:p-8">
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div>
                  <span className="inline-block rounded-full bg-[#F8A51D] px-3.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-2xs">
                    Misi aktif • Bab {currentChapter.number}
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-900">
                    MISI {currentMission.number}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                    {currentMission.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {currentMission.description}
                  </p>

                  <div className="mt-6">
                    <Link
                      href={getMissionActiveStageHref(currentMission, progress)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#F8A51D] px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition-transform hover:bg-[#E59312] hover:scale-105 active:scale-95"
                    >
                      <Play className="size-4 fill-slate-900" />
                      Lanjutkan latihan
                    </Link>
                  </div>
                </div>

                <div className="flex min-w-0 items-center justify-center">
                  <Image
                    src={currentChapterIllustration}
                    alt=""
                    width={380}
                    height={320}
                    className="h-60 w-full max-w-[280px] object-contain sm:h-72 sm:max-w-[340px] xl:h-80 xl:max-w-[380px]"
                    draggable={false}
                    priority
                  />
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
                  <p className="text-3xl font-bold text-slate-900">
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
                  <p className="text-3xl font-bold text-slate-900">
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
                  <p className="text-3xl font-bold text-slate-900">
                    {badgeCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara Belajar BISARA */}
        <section className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-xs">
          <div className="grid md:grid-cols-[0.74fr_1fr]">
            <div className="relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden bg-[#FF7840] p-7 sm:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[url('/assets/bisara/PatternSolidRed.png')] bg-center bg-no-repeat"
                style={{ backgroundSize: '230% auto' }}
              />
              <Headphones className="size-8 text-[#1B2023]" />
              <div className="mt-12">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B2023]/70">
                  CARA BELAJAR BISARA
                </p>
                <h2 className="mt-3 max-w-lg text-2xl font-bold leading-tight tracking-tight text-[#1B2023] sm:text-3xl">
                  Bukan hanya tahu. Kamu berlatih sampai siap merespons.
                </h2>
              </div>
            </div>

            <div className="flex flex-col justify-between px-7 py-5 sm:px-9 md:py-7">
              <div className="flex items-center gap-4 py-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FF7D47] text-xl font-bold text-[#1B2023]">
                  ✓
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#1B2023]">Kenali</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Pahami bentuk, konteks, dan arti tanda.
                  </p>
                </div>
              </div>

              <div className="border-b border-[#FF7D47]" />

              <div className="flex items-center gap-4 py-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FF7D47] text-[#1B2023]">
                  <Hand className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#1B2023]">Tirukan</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Tirukan dengan bantuan contoh dan umpan balik.
                  </p>
                </div>
              </div>

              <div className="border-b border-[#FF7D47]" />

              <div className="flex items-center gap-4 py-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FF7D47] text-[#1B2023]">
                  <MessageSquare className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#1B2023]">Latihan</h3>
                  <p className="mt-1 text-sm text-slate-600">
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
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-800">
              <BookOpen className="size-4" /> Perjalanan Belajarmu
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Lima bab, satu tujuan nyata.
            </h2>
          </div>

          {isCurriculumDebugUnlocked() ? (
            <p className="mb-6 rounded-2xl border border-cyan-400 bg-cyan-50 px-5 py-3 text-sm font-bold text-slate-800">
              Mode debug lokal: semua bab dan misi terbuka. Progres dan hasil checker tetap asli.
            </p>
          ) : null}

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
