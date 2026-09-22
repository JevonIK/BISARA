'use client';

import { Flame, Star } from 'lucide-react';
import Image from 'next/image';
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
    <header className="sticky top-0 z-50 border-b border-amber-300/60 bg-[#FED247] shadow-2xs">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          aria-label="BISARA, kembali ke beranda"
        >
          <Image
            src="/assets/bisara/secondary-logo.png"
            alt=""
            width={224}
            height={60}
            className="h-8 w-auto sm:h-11 lg:h-13"
            priority
            draggable={false}
          />
        </Link>

        <nav
          className="hidden items-center rounded-full border border-amber-300/50 bg-white p-1 shadow-xs lg:flex"
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
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-white px-3.5 py-1.5 text-xs font-black text-slate-800 shadow-2xs">
            <Star className="size-3.5 text-amber-500 fill-amber-500" />
            <span>20</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-white px-3.5 py-1.5 text-xs font-black text-slate-800 shadow-2xs">
            <Flame className="size-3.5 text-orange-500" fill="currentColor" />
            <span>{progress.streak > 0 ? progress.streak : 7} hari</span>
          </div>
          <Link
            href={account.user ? '/profil' : '/account'}
            className="grid h-9 min-w-9 place-items-center rounded-full bg-slate-900 px-5 text-xs font-black text-white shadow-xs outline-none ring-offset-2 transition-transform hover:scale-105 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              account.user
                ? `Buka profil ${account.user.displayName}`
                : 'Masuk ke akun'
            }
          >
            {account.status === 'loading' ? '…' : initials || 'Masuk'}
          </Link>
        </div>
      </div>
      <nav
        className="flex justify-center gap-4 overflow-x-auto border-t border-amber-300/40 bg-[#FED247] px-4 py-2.5 text-sm font-semibold lg:hidden"
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
                : 'text-slate-800',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
