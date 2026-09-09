import type { Metadata } from 'next';
import { ArrowLeft, CircleAlert, Flag, LockKeyhole, Star } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { ChapterTest } from '@/components/chapter-test';

export const metadata: Metadata = {
  title: 'Tes Bab 1 — Kenalan & Sapaan',
  description:
    'Uji pemahaman tanda BISINDO dan kemampuan memilih respons dalam simulasi percakapan bercabang.',
};

type ChapterTestPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function ChapterTestPage({
  searchParams,
}: ChapterTestPageProps) {
  const { mode } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />

      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <header className="mb-8 grid gap-6 border-b border-signal-navy/10 pb-8 lg:grid-cols-[1fr_370px] lg:items-end">
          <div>
            <Link
              href="/missions/berkenalan"
              className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-signal-navy"
            >
              <ArrowLeft className="size-4" /> Kembali ke detail misi
            </Link>
            <p className="mt-7 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-signal-coral">
              <Flag className="size-4" /> Tes Bab 1
            </p>
            <h1 className="mt-3 text-4xl font-black leading-[1.08] tracking-[-0.05em] text-signal-navy sm:text-5xl">
              Buktikan kamu siap merespons tanpa contoh.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Pilih mode tes arti tanda atau selesaikan percakapan bercabang.
              Kamu dapat mengulang tes dan mempertahankan skor terbaik.
            </p>
          </div>

          <aside className="border-l-4 border-signal-coral bg-card p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-coral">
              Aturan bintang
            </p>
            <div className="mt-5 grid grid-cols-3 divide-x divide-signal-navy/10">
              <ScoreRule stars={1} label="50–69" />
              <ScoreRule stars={2} label="70–89" />
              <ScoreRule stars={3} label="90–100" />
            </div>
            <p className="mt-5 flex items-start gap-2 border-t border-signal-navy/10 pt-4 text-xs leading-5 text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
              Minimal 50 poin untuk membuka bab berikutnya.
            </p>
          </aside>
        </header>

        <ChapterTest
          initialView={mode === 'conversation' ? 'conversation' : 'menu'}
        />

        <aside className="mt-7 flex gap-3 border border-signal-yellow bg-signal-yellow/15 p-5 text-xs leading-5 text-amber-950">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          Video pada tes ini adalah sampel WL-BISINDO variasi Banten. Mode
          respons kamera belum diberi skor sampai classifier dan ambang
          penilaiannya tervalidasi.
        </aside>
      </div>
    </main>
  );
}

function ScoreRule({ stars, label }: { stars: number; label: string }) {
  return (
    <div className="px-3 text-center first:pl-0 last:pr-0">
      <div className="flex justify-center gap-0.5 text-amber-500">
        {Array.from({ length: stars }).map((_, index) => (
          <Star key={index} className="size-3.5" fill="currentColor" />
        ))}
      </div>
      <p className="mt-2 text-sm font-black text-signal-navy">{label}</p>
    </div>
  );
}
