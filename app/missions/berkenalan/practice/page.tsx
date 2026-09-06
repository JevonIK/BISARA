import type { Metadata } from 'next';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Hand,
  Info,
  MessageCircleMore,
  MoveRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { CameraPractice } from '@/components/camera-practice';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Latihan Kamera — Tanda Saya',
  description:
    'Latih tanda BISINDO menggunakan kamera dan deteksi landmark tangan langsung di browser.',
};

const missionStages = [
  { label: 'Kenali', icon: BookOpen, state: 'completed' },
  { label: 'Tirukan', icon: Hand, state: 'current' },
  { label: 'Komunikasikan', icon: MessageCircleMore, state: 'locked' },
] as const;

export default function PracticePage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />

      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Link
              href="/missions/berkenalan"
              className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-signal-navy"
            >
              <ArrowLeft className="size-4" /> Kembali ke detail misi
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge className="h-7 bg-signal-teal px-3 font-extrabold text-signal-navy">
                Bab 1 · Misi 03
              </Badge>
              <Badge
                variant="outline"
                className="h-7 border-signal-navy/10 px-3 text-muted-foreground"
              >
                Tahap Tirukan
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-signal-navy sm:text-5xl">
              Latih tanda “Saya”
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Posisikan tubuh bagian atas dan tangan di dalam bingkai. Tiru
              gerakan dari video contoh, lalu tekan "Mulai latihan" untuk
              merekam dan mendapatkan skor kemiripan.
            </p>
          </div>

          <ol
            className="flex items-center gap-2"
            aria-label="Tahap pembelajaran"
          >
            {missionStages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <li key={stage.label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'grid size-10 place-items-center rounded-full border',
                      stage.state === 'completed' &&
                        'border-signal-teal bg-signal-teal text-signal-navy',
                      stage.state === 'current' &&
                        'border-signal-yellow bg-signal-yellow text-signal-navy',
                      stage.state === 'locked' &&
                        'border-signal-navy/10 bg-muted text-muted-foreground',
                    )}
                    title={stage.label}
                  >
                    {stage.state === 'completed' ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <Icon className="size-4" />
                    )}
                    <span className="sr-only">{stage.label}</span>
                  </span>
                  {index < missionStages.length - 1 && (
                    <MoveRight className="size-4 text-signal-navy/25" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="order-2 space-y-5 lg:order-1">
            <div className="border-t-4 border-signal-teal bg-card p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Contoh tanda
              </p>
              <div className="mt-5 overflow-hidden bg-signal-teal-soft">
                <video
                  className="aspect-[4/3] w-full object-cover"
                  src="/media/wl-bisindo/signer0_label9_sample3.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Fokus pengamatan
                </p>
                <ul className="mt-3 space-y-3 text-sm font-bold text-signal-navy">
                  <li className="flex items-center gap-3">
                    <span className="size-2 rounded-full bg-signal-teal" />{' '}
                    Bentuk tangan
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="size-2 rounded-full bg-signal-yellow" />{' '}
                    Posisi terhadap tubuh
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="size-2 rounded-full bg-signal-coral" />{' '}
                    Arah telapak
                  </li>
                </ul>
              </div>
            </div>

            <div className="border border-signal-navy/10 bg-card p-6">
              <div className="flex gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-black text-signal-navy">
                    Penilaian kemiripan dengan contoh
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Skor dihitung dari kemiripan dengan satu contoh WL-BISINDO
                    Banten. Ambang belum dikalibrasi bersama validator Tuli.
                    Skor ini untuk latihan, bukan sertifikasi.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="order-1 lg:order-2">
            <CameraPractice referenceVideoUrl="/media/wl-bisindo/signer0_label9_sample3.mp4" />
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-4 border border-signal-navy/10 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div>
              <h2 className="text-sm font-black text-signal-navy">
                Privasi latihan kamera
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                Frame kamera diproses pada perangkat untuk menghasilkan titik
                landmark. BISARA tidak mengunggah atau menyimpan video latihan
                ini. Model MediaPipe dimuat saat kamera pertama kali diaktifkan.
                MediaPipe dapat mengirim metrik penggunaan dan performa sesuai
                kebijakan penyedianya, tetapi frame kamera tetap di perangkat.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="h-7 shrink-0 border-signal-teal bg-signal-teal-soft px-3 text-emerald-800"
          >
            On-device processing
          </Badge>
        </section>
      </div>
    </main>
  );
}
