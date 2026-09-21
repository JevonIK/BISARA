'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { ArrowRight, Sparkles, Trophy, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useProgress } from '@/hooks/use-progress';
import {
  BADGE_UNLOCK_EVENT,
  getProfileBadges,
  getSeenBadgeIds,
  markBadgeAsSeen,
  syncSeenBadgesWithUnlocked,
  type ProfileBadge,
} from '@/lib/badges';

// Decorative sunburst rays behind the badge
function SunburstBackground() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="absolute size-56 sm:size-72 -top-6 -left-6 sm:-top-8 sm:-left-8 text-amber-300/40 pointer-events-none animate-[spin_40s_linear_infinite]"
      fill="currentColor"
    >
      <circle cx="100" cy="100" r="28" className="text-amber-200/50" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <polygon
          key={deg}
          points="95,0 105,0 100,100"
          transform={`rotate(${deg} 100 100)`}
          opacity="0.35"
        />
      ))}
    </svg>
  );
}

// Lightweight CSS confetti particles
const CONFETTI_COLORS = [
  '#00D5D1',
  '#FFAE00',
  '#F06543',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
];

function ConfettiParticles() {
  const particles = [
    { left: '10%', top: '15%', delay: '0s', size: 10, color: CONFETTI_COLORS[0], rotate: '12deg' },
    { left: '22%', top: '8%', delay: '0.2s', size: 8, color: CONFETTI_COLORS[1], rotate: '45deg' },
    { left: '85%', top: '12%', delay: '0.1s', size: 11, color: CONFETTI_COLORS[2], rotate: '-20deg' },
    { left: '92%', top: '25%', delay: '0.3s', size: 9, color: CONFETTI_COLORS[3], rotate: '30deg' },
    { left: '8%', top: '75%', delay: '0.4s', size: 9, color: CONFETTI_COLORS[4], rotate: '-15deg' },
    { left: '18%', top: '85%', delay: '0.15s', size: 12, color: CONFETTI_COLORS[5], rotate: '40deg' },
    { left: '80%', top: '80%', delay: '0.25s', size: 8, color: CONFETTI_COLORS[0], rotate: '-35deg' },
    { left: '90%', top: '70%', delay: '0.35s', size: 10, color: CONFETTI_COLORS[1], rotate: '15deg' },
    { left: '5%', top: '45%', delay: '0.05s', size: 8, color: CONFETTI_COLORS[2], rotate: '50deg' },
    { left: '94%', top: '48%', delay: '0.22s', size: 11, color: CONFETTI_COLORS[3], rotate: '-45deg' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-sm animate-pulse"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size * 0.75}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate})`,
            animationDelay: p.delay,
            animationDuration: '2s',
          }}
        />
      ))}
    </div>
  );
}

export function BadgeUnlockCelebration() {
  const pathname = usePathname();
  const progress = useProgress();
  const [badgeQueue, setBadgeQueue] = useState<ProfileBadge[]>([]);
  const [, startTransition] = useTransition();

  const activeBadge = badgeQueue[0] ?? null;

  // 1. Listen for manual trigger (e.g., clicking on a badge in the profile page)
  useEffect(() => {
    const handleManualEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileBadge>;
      if (customEvent.detail) {
        startTransition(() => {
          setBadgeQueue((prev) => {
            const existingIds = new Set(prev.map((b) => b.id));
            if (existingIds.has(customEvent.detail.id)) return prev;
            return [...prev, customEvent.detail];
          });
        });
      }
    };

    window.addEventListener(BADGE_UNLOCK_EVENT, handleManualEvent);
    return () => {
      window.removeEventListener(BADGE_UNLOCK_EVENT, handleManualEvent);
    };
  }, []);

  // 2. Automatically detect newly unlocked badges from progress
  useEffect(() => {
    // Never auto-popup modal when user is already on the profile page
    if (pathname === '/profil') return;

    const allBadges = getProfileBadges(progress);
    const unlocked = allBadges.filter((b) => b.unlocked);
    const unlockedIds = unlocked.map((b) => b.id);

    // Keep seen badges synchronized with valid unlocked badges
    syncSeenBadgesWithUnlocked(unlockedIds);

    const seenIds = new Set(getSeenBadgeIds());
    const newlyUnlocked = unlocked.filter((b) => !seenIds.has(b.id));

    if (newlyUnlocked.length > 0) {
      // Immediately mark all newly unlocked badges as seen so they never trigger again
      newlyUnlocked.forEach((b) => markBadgeAsSeen(b.id));

      startTransition(() => {
        setBadgeQueue((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const toAdd = newlyUnlocked.filter((b) => !existingIds.has(b.id));
          return [...prev, ...toAdd];
        });
      });
    }
  }, [progress, pathname]);

  const handleNextOrClose = useCallback(() => {
    startTransition(() => {
      setBadgeQueue((prev) => prev.slice(1));
    });
  }, []);

  const handleDismissAll = useCallback(() => {
    // Ensure all currently unlocked badges are marked as seen
    const allBadges = getProfileBadges(progress);
    allBadges.filter((b) => b.unlocked).forEach((b) => markBadgeAsSeen(b.id));
    startTransition(() => {
      setBadgeQueue([]);
    });
  }, [progress]);

  useEffect(() => {
    if (!activeBadge) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismissAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBadge, handleDismissAll]);

  if (!activeBadge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Interactive Backdrop Button */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup modal"
        onClick={handleDismissAll}
        className="fixed inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-300 cursor-default"
      />

      {/* Modal Dialog Card */}
      <div
        key={activeBadge.id}
        aria-labelledby="badge-modal-title"
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white p-7 sm:p-9 text-center shadow-2xl border-4 animate-in zoom-in-75 duration-300 ${
          activeBadge.unlocked ? 'border-[#FFAE00]' : 'border-slate-200'
        }`}
      >
        {activeBadge.unlocked && <ConfettiParticles />}

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismissAll}
          aria-label="Tutup"
          className="absolute top-4 right-4 z-20 flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Header Pill */}
        <div className="relative z-10 flex justify-center">
          {activeBadge.unlocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-4 py-1 text-xs font-black tracking-widest uppercase text-[#F06543] shadow-2xs">
              <Sparkles className="size-3.5 text-[#FFAE00] fill-[#FFAE00]" />
              {badgeQueue.length > 1
                ? `Lencana Baru (${badgeQueue.length} Terbuka!)`
                : 'Lencana Baru Terbuka!'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-4 py-1 text-xs font-black tracking-widest uppercase text-slate-600 shadow-2xs">
              🔒 Belum Terbuka
            </span>
          )}
        </div>

        {/* Badge Hero with Radial Sunburst */}
        <div className="relative z-10 my-6 flex items-center justify-center">
          <div className="relative flex size-44 sm:size-52 items-center justify-center">
            {/* Sunburst Rays & Pulsing Glow (only for unlocked) */}
            {activeBadge.unlocked && (
              <>
                <SunburstBackground />
                <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-amber-300/40 via-yellow-200/50 to-orange-300/30 blur-xl animate-pulse pointer-events-none" />
              </>
            )}

            {/* Bounce-animated Badge Image */}
            <div
              className={`relative z-10 size-32 sm:size-40 transition-transform duration-500 hover:scale-110 ${
                activeBadge.unlocked ? '' : 'grayscale opacity-60'
              }`}
            >
              <Image
                src={activeBadge.image}
                alt={activeBadge.title}
                width={160}
                height={160}
                priority
                className={`size-full object-contain select-none ${
                  activeBadge.unlocked
                    ? 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]'
                    : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Badge Title & Subtitle */}
        <div className="relative z-10">
          <h2
            id="badge-modal-title"
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              activeBadge.unlocked ? 'text-slate-900' : 'text-slate-700'
            }`}
          >
            {activeBadge.title}
          </h2>
          <p
            className={`mt-1 text-xs sm:text-sm font-semibold max-w-xs mx-auto ${
              activeBadge.unlocked ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            {activeBadge.subtitle}
          </p>

          <p
            className={`mt-3.5 text-xs sm:text-sm font-medium rounded-2xl p-3 border max-w-xs mx-auto ${
              activeBadge.unlocked
                ? 'bg-amber-50/80 border-amber-200/50 text-slate-600'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {activeBadge.unlocked
              ? 'Selamat! Kamu telah membuktikan dedikasimu dalam menguasai BISINDO!'
              : `Selesaikan tantangan "${activeBadge.subtitle}" untuk membuka lencana ini!`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleNextOrClose}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-black shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
              activeBadge.unlocked
                ? 'bg-[#FFAE00] hover:bg-[#F8A51D] text-slate-950'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {activeBadge.unlocked ? (
              badgeQueue.length > 1 ? (
                <>
                  Lencana Berikutnya ({badgeQueue.length - 1} lagi){' '}
                  <ArrowRight className="size-4" />
                </>
              ) : pathname === '/profil' ? (
                'Tutup'
              ) : (
                <>
                  Lanjutkan Belajar <ArrowRight className="size-4" />
                </>
              )
            ) : (
              'Mengerti, Siap Belajar!'
            )}
          </button>
          {pathname !== '/profil' && (
            <Link
              href="/profil"
              onClick={handleDismissAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs transition-colors"
            >
              <Trophy className="size-4 text-[#FFAE00]" /> Lihat Koleksi
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
