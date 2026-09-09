'use client';

import { Flame, Hand, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { useProgress } from '@/hooks/use-progress';
import { useAccount } from '@/hooks/use-account';
import { cn } from '@/lib/utils';
import {
  getCurrentMission,
  getMissionLearningState,
} from '@/lib/learning-progress';

type AppHeaderProps = {
  active?: 'home' | 'journey' | 'practice' | 'progress';
};

const navigation = [
  { label: 'Beranda', href: '/', key: 'home' },
  { label: 'Perjalanan', href: '/missions', key: 'journey' },
  { label: 'Progres', href: '/progress', key: 'progress' },
] as const;

export function AppHeader({ active = 'home' }: AppHeaderProps) {
  const progress = useProgress();
  const currentMission = getCurrentMission(progress);
  const practiceHref = getMissionLearningState(currentMission, progress).next
    .href;
  const account = useAccount();
  const initials = account.user?.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <header className="border-b border-signal-navy/10 bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          aria-label="BISARA, kembali ke beranda"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-signal-navy text-signal-teal transition-transform group-hover:-rotate-3">
            <Hand className="size-6" strokeWidth={2.2} />
          </span>
          <span>
            <span className="block text-lg font-black leading-none tracking-[-0.04em] text-signal-navy">
              BISARA
            </span>
            <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:block">
              Belajar untuk berkomunikasi
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-signal-navy/10 bg-white/70 p-1 lg:flex"
          aria-label="Navigasi utama"
        >
          {[
            ...navigation.slice(0, 2),
            { label: 'Latihan', href: practiceHref, key: 'practice' as const },
            ...navigation.slice(2),
          ].map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                active === item.key
                  ? 'bg-signal-navy font-bold text-white'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={active === item.key ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-signal-yellow/30 px-3 py-2 text-sm font-extrabold text-signal-navy sm:flex">
            <Sparkles className="size-4 text-amber-600" />
            {progress.xp.toLocaleString('id-ID')} XP
          </div>
          <div className="flex items-center gap-2 rounded-full border border-signal-coral/20 bg-signal-coral/10 px-3 py-2 text-sm font-extrabold text-signal-coral">
            <Flame className="size-4" fill="currentColor" />
            {progress.streak}
            <span className="hidden sm:inline">hari</span>
          </div>
          <Link
            href="/account"
            className="grid h-10 min-w-10 place-items-center rounded-full bg-signal-navy px-3 text-sm font-black text-white outline-none ring-offset-2 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              account.user
                ? `Buka akun ${account.user.displayName}`
                : 'Masuk ke akun'
            }
          >
            {account.status === 'loading' ? '…' : initials || 'Masuk'}
          </Link>
        </div>
      </div>
      <nav
        className="flex justify-center gap-4 overflow-x-auto border-t px-4 py-3 text-sm font-semibold lg:hidden"
        aria-label="Navigasi seluler"
      >
        {navigation.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? 'page' : undefined}
            className={
              active === item.key
                ? 'text-emerald-800 underline underline-offset-4'
                : 'text-muted-foreground'
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
