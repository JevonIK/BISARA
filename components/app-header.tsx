'use client';

import { Flame, Hand, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { useProgress } from '@/hooks/use-progress';
import { useAccount } from '@/hooks/use-account';
import { cn } from '@/lib/utils';

type AppHeaderProps = {
  active?: 'home' | 'kamus' | 'profil' | 'journey' | 'practice' | 'progress';
};

const navigation = [
  { label: 'Beranda', href: '/', key: 'home' },
  { label: 'Kamus', href: '/kamus', key: 'kamus' },
  { label: 'Profil', href: '/profil', key: 'profil' },
] as const;

export function AppHeader({ active = 'home' }: AppHeaderProps) {
  const progress = useProgress();
  const account = useAccount();
  const initials = account.user?.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const isNavActive = (key: string) => {
    if (key === 'home') return active === 'home';
    if (key === 'kamus') return active === 'kamus';
    if (key === 'profil') return active === 'profil';
    return false;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-amber-200/60 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          aria-label="BISARA, kembali ke beranda"
        >
          <span className="grid size-11 place-items-center rounded-full bg-slate-900 text-[#55c7b5] shadow-xs transition-transform group-hover:-rotate-3">
            <Hand className="size-6 text-[#F8A51D]" strokeWidth={2.4} />
          </span>
          <span>
            <span className="block text-lg font-black leading-none tracking-[-0.04em] text-slate-900">
              BISARA
            </span>
            <span className="mt-1 hidden text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:block">
              Belajar untuk berkomunikasi
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-xs lg:flex"
          aria-label="Navigasi utama"
        >
          {navigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'rounded-full px-6 py-2 text-sm font-bold transition-colors',
                isNavActive(item.key)
                  ? 'bg-[#F8A51D] text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              aria-current={isNavActive(item.key) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-black text-slate-800">
            <Sparkles className="size-3.5 text-amber-500" fill="currentColor" />
            <span>20</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1.5 text-xs font-black text-slate-800">
            <Flame className="size-3.5 text-orange-500" fill="currentColor" />
            <span>{progress.streak > 0 ? progress.streak : 7} hari</span>
          </div>
          <Link
            href="/account"
            className="grid h-9 min-w-9 place-items-center rounded-full bg-slate-900 px-4 text-xs font-black text-white shadow-xs outline-none ring-offset-2 transition-transform hover:scale-105 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-ring"
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
        className="flex justify-center gap-4 overflow-x-auto border-t border-slate-100 bg-white/90 px-4 py-2.5 text-sm font-semibold lg:hidden"
        aria-label="Navigasi seluler"
      >
        {navigation.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isNavActive(item.key) ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
              isNavActive(item.key)
                ? 'bg-[#F8A51D] text-slate-900 font-black'
                : 'text-slate-600',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
