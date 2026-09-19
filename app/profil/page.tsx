'use client';

import {
  Award,
  Bookmark,
  Ear,
  Flag,
  Flame,
  LockKeyhole,
  MessageSquare,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';

import { AppHeader } from '@/components/app-header';
import { useAccount } from '@/hooks/use-account';
import { useProgress } from '@/hooks/use-progress';
import { signs } from '@/lib/curriculum-data';
import { getPrototypeMissionCount } from '@/lib/learning-progress';

export default function ProfilPage() {
  const account = useAccount();
  const progress = useProgress();

  const completedMissionsCount = getPrototypeMissionCount(progress);
  const masteredSignsCount = signs.filter(
    (sign) => progress.signMastery[sign.id]?.passed,
  ).length;
  const reviewedSignsCount = progress.reviewedSigns.length;

  const displayName = account.user?.displayName || 'Ahmad Fauzi';
  const joinedDate = account.user?.createdAt
    ? new Date(account.user.createdAt).toLocaleDateString('id-ID', {
        month: 'short',
        year: 'numeric',
      })
    : 'Jan 2025';

  const streakDisplay = progress.streak > 0 ? `${progress.streak} hari` : '80 hari';
  const missionsDisplay =
    completedMissionsCount > 0 ? `${completedMissionsCount} / 25` : '2 / 25';
  const vocabDisplay =
    masteredSignsCount > 0 ? `${masteredSignsCount} / 32` : '12 / 32';
  const starsDisplay = '80 hari';

  const badges = [
    {
      id: 'penyapa-handal-1',
      title: 'Penyapa Handal',
      subtitle: 'Kuasai kosa kata Bab 2',
      icon: Trophy,
      unlocked: true,
      progress: 'Progres: 5/5',
    },
    {
      id: 'penyapa-handal-2',
      title: 'Penyapa Handal',
      subtitle: 'Kuasai kosa kata Bab 2',
      icon: Trophy,
      unlocked: true,
      progress: 'Progres: 5/5',
    },
    {
      id: 'komunikator',
      title: 'Komunikator',
      subtitle:
        progress.conversationCompletions > 0
          ? 'Percakapan selesai'
          : 'Progres: 0/1',
      icon: MessageSquare,
      unlocked: progress.conversationCompletions > 0,
      progress: `Progres: ${progress.conversationCompletions}/1`,
    },
    {
      id: 'pahlawan-streak-1',
      title: 'Pahlawan Streak',
      subtitle:
        progress.streak >= 7
          ? '7 hari beruntun'
          : `Progres: ${Math.min(progress.streak, 7)}/7`,
      icon: Zap,
      unlocked: progress.streak >= 7,
      progress: `Progres: ${Math.min(progress.streak, 7)}/7`,
    },
    {
      id: 'penyapa-handal-3',
      title: 'Penyapa Handal',
      subtitle: 'Kuasai kosa kata Bab 2',
      icon: Trophy,
      unlocked: true,
      progress: 'Progres: 5/5',
    },
    {
      id: 'penyimak-teliti-1',
      title: 'Penyimak Teliti',
      subtitle: `Progres: ${Math.min(reviewedSignsCount, 5) || 2}/5`,
      icon: Ear,
      unlocked: reviewedSignsCount >= 5,
      progress: `Progres: ${Math.min(reviewedSignsCount, 5) || 2}/5`,
    },
    {
      id: 'pahlawan-streak-2',
      title: 'Pahlawan Streak',
      subtitle:
        progress.streak >= 7
          ? '7 hari beruntun'
          : `Progres: ${Math.min(progress.streak, 7)}/7`,
      icon: Zap,
      unlocked: progress.streak >= 7,
      progress: `Progres: ${Math.min(progress.streak, 7)}/7`,
    },
    {
      id: 'penyimak-teliti-2',
      title: 'Penyimak Teliti',
      subtitle: `Progres: ${Math.min(reviewedSignsCount, 5) || 2}/5`,
      icon: Ear,
      unlocked: reviewedSignsCount >= 5,
      progress: `Progres: ${Math.min(reviewedSignsCount, 5) || 2}/5`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#FFE8A3]">
      <AppHeader active="profil" />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:py-8 lg:px-8 lg:py-10 flex flex-col gap-6 sm:gap-8">
        {/* Card 1: User Profile Header Card */}
        <section className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-white shadow-sm border border-amber-200/40">
          {/* Tosca Banner (#00D5D1) with decorative translucent bubbles */}
          <div className="relative h-44 sm:h-56 lg:h-64 w-full overflow-hidden bg-[#00D5D1]">
            <div className="pointer-events-none absolute -top-12 left-[8%] size-44 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -top-20 left-[28%] size-64 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -bottom-16 right-[38%] size-56 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -top-8 right-[10%] size-44 rounded-full bg-white/15" />
          </div>

          {/* User Avatar - centered across the banner border */}
          <div className="relative flex justify-center -mt-16 sm:-mt-20">
            <div className="relative size-32 sm:size-40 rounded-full border-[6px] sm:border-[8px] border-white bg-[#CBD5E1] shadow-md flex items-center justify-center overflow-hidden">
              <svg
                className="size-full text-white translate-y-3"
                viewBox="0 0 100 100"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="50" cy="38" r="18" />
                <path d="M18 86 C18 64, 32 54, 50 54 C68 54, 82 64, 82 86 Z" />
              </svg>
            </div>
          </div>

          {/* User Info */}
          <div className="pt-3 pb-8 sm:pb-10 px-4 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {displayName}
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
              Bergabung sejak {joinedDate}
            </p>
          </div>
        </section>

        {/* Card 2: 4 Stats Cards in a Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Stat 1: Streak */}
          <div className="flex items-center gap-4 sm:gap-5 rounded-3xl bg-white p-5 sm:p-6 lg:p-7 shadow-sm border border-amber-200/30">
            <div className="flex size-12 sm:size-14 items-center justify-center shrink-0">
              <Flame className="size-9 sm:size-11 text-[#F06543] fill-[#F06543]" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-slate-500">
                Streak
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {streakDisplay}
              </span>
            </div>
          </div>

          {/* Stat 2: Misi selesai */}
          <div className="flex items-center gap-4 sm:gap-5 rounded-3xl bg-white p-5 sm:p-6 lg:p-7 shadow-sm border border-amber-200/30">
            <div className="flex size-12 sm:size-14 items-center justify-center shrink-0">
              <Flag className="size-8 sm:size-10 text-[#E54D2E] fill-[#E54D2E]" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-slate-500">
                Misi selesai
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {missionsDisplay}
              </span>
            </div>
          </div>

          {/* Stat 3: Kosa kata */}
          <div className="flex items-center gap-4 sm:gap-5 rounded-3xl bg-white p-5 sm:p-6 lg:p-7 shadow-sm border border-amber-200/30">
            <div className="flex size-12 sm:size-14 items-center justify-center shrink-0">
              <Bookmark className="size-8 sm:size-10 text-[#00D5D1] fill-[#00D5D1]" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-slate-500">
                Kosa kata
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {vocabDisplay}
              </span>
            </div>
          </div>

          {/* Stat 4: Total bintang */}
          <div className="flex items-center gap-4 sm:gap-5 rounded-3xl bg-white p-5 sm:p-6 lg:p-7 shadow-sm border border-amber-200/30">
            <div className="flex size-12 sm:size-14 items-center justify-center shrink-0">
              <Star className="size-9 sm:size-11 text-[#FFAE00] fill-[#FFAE00]" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-slate-500">
                Total bintang
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {starsDisplay}
              </span>
            </div>
          </div>
        </section>

        {/* Card 3: Koleksi Lencana (Achievements / Badges) */}
        <section className="rounded-[2.5rem] sm:rounded-[3rem] bg-white p-6 sm:p-8 lg:p-12 shadow-sm border border-amber-200/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#F06543]">
                Koleksi Lencana
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Pencapaian yang sudah kamu buka
              </h2>
            </div>
            <Award className="size-6 sm:size-7 text-[#FFAE00]" strokeWidth={2.2} />
          </div>

          {/* 8 Badges Grid (4 columns x 2 rows) */}
          <div className="mt-8 sm:mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-10">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center"
                >
                  {badge.unlocked ? (
                    <div className="flex size-20 sm:size-24 items-center justify-center rounded-full border-2 border-[#FCD561] bg-[#FFF9E6] shadow-xs">
                      <Icon
                        className="size-9 sm:size-11 text-[#F8A51D]"
                        strokeWidth={2}
                      />
                    </div>
                  ) : (
                    <div className="relative flex size-20 sm:size-24 items-center justify-center rounded-full border-2 border-slate-200 bg-[#F8FAFC] shadow-xs">
                      <Icon
                        className="size-8 sm:size-10 text-slate-400"
                        strokeWidth={1.8}
                      />
                      <div className="absolute -bottom-1 -right-1 flex size-6 sm:size-6.5 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs">
                        <LockKeyhole className="size-3 sm:size-3.5 text-slate-500" />
                      </div>
                    </div>
                  )}

                  <h3
                    className={`mt-3 sm:mt-3.5 text-xs sm:text-sm font-black ${
                      badge.unlocked ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {badge.title}
                  </h3>
                  <p
                    className={`mt-0.5 text-[11px] sm:text-xs font-semibold ${
                      badge.unlocked ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {badge.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
