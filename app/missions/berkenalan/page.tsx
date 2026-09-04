import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Hand,
  Info,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { activeMission } from '@/lib/learning-data';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Berkenalan dengan Teman Baru',
  description:
    'Pelajari tanda BISINDO yang digunakan untuk merespons perkenalan dalam skenario terpandu.',
};

const stages = [
  {
    number: '01',
    title: 'Kenali',
    description:
      'Amati demonstrasi tervalidasi dan pahami konteks penggunaan setiap tanda.',
    duration: '2 menit',
    state: 'completed',
    icon: BookOpen,
  },
  {
    number: '02',
    title: 'Tirukan',
    description:
      'Praktikkan tanda dengan kamera dan perbaiki satu parameter pada setiap percobaan.',
    duration: '4 menit',
    state: 'current',
    icon: Hand,
  },
  {
    number: '03',
    title: 'Komunikasikan',
    description:
      'Respons prompt percakapan tanpa melihat contoh atau lembar bantuan.',
    duration: '2 menit',
    state: 'locked',
    icon: MessageCircleMore,
  },
] as const;

const scenario = [
  {
    speaker: 'Teman baru',
    prompt: 'Menunjukkan tanda “Siapa?”',
    response: 'Kenali maksud pertanyaan.',
  },
  {
    speaker: 'Kamu',
    prompt: 'Tunjukkan tanda “Saya”.',
    response: 'Kamera menilai percobaan terpandu.',
  },
  {
    speaker: 'Teman baru',
    prompt: 'Menunjukkan tanda “Teman”.',
    response: 'Balas dengan “Terima kasih”.',
  },
] as const;

export default function MissionDetailPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />

      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href="/missions"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-signal-navy"
          >
            <ArrowLeft className="size-4" /> Kembali ke perjalanan
          </Link>
        </nav>

        <section className="relative overflow-hidden rounded-[2rem] bg-signal-navy px-6 py-8 text-white sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-28 size-96 rounded-full border-[70px] border-signal-teal/10"
          />
          <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge className="h-7 bg-signal-teal px-3 font-extrabold text-signal-navy">
                  Bab 1 · Misi {activeMission.number}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-7 border-white/15 px-3 text-white/70"
                >
                  BISINDO Banten
                </Badge>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-signal-teal">
                Misi aktif
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.05em] sm:text-5xl">
                {activeMission.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
                {activeMission.description} Fokus misi ini adalah mengenali dan
                menghasilkan satu tanda pada satu waktu dalam alur percakapan
                terpandu.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold text-white/75">
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4 text-signal-teal" />
                  {activeMission.duration} menit
                </span>
                <span className="flex items-center gap-2">
                  <Star
                    className="size-4 text-signal-yellow"
                    fill="currentColor"
                  />
                  +{activeMission.xp} XP
                </span>
                <span className="flex items-center gap-2">
                  <Target className="size-4 text-signal-coral" />5 tanda
                </span>
              </div>
            </div>

            <aside className="border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">
                    Progres misi
                  </p>
                  <p className="mt-1 text-3xl font-black">35%</p>
                </div>
                <span className="text-xs font-bold text-signal-teal">
                  Tahap 2 dari 3
                </span>
              </div>
              <Progress value={35} className="mt-5 gap-2">
                <ProgressLabel className="sr-only">Progres misi</ProgressLabel>
              </Progress>
              <a
                href="#lesson-plan"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'mt-6 h-12 w-full rounded-full bg-signal-teal px-5 font-extrabold text-signal-navy hover:bg-signal-teal/90',
                )}
              >
                Lihat tahap aktif <ArrowRight className="size-4" />
              </a>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:py-14">
          <div className="border border-signal-navy/10 bg-card p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
              Target pembelajaran
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
              Lima tanda untuk memulai interaksi sederhana
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Seluruh kosakata misi ini tersedia dalam WL-BISINDO. Demonstrasi
              final dan cara koreksi tetap harus mendapat persetujuan validator
              Tuli sebelum dirilis.
            </p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {activeMission.vocabulary.map((word, index) => (
                <li
                  key={word}
                  className="flex min-h-24 flex-col justify-between border-t-2 border-signal-teal bg-signal-teal-soft p-4"
                >
                  <span className="font-mono text-[10px] font-black text-emerald-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-5 font-black text-signal-navy">
                    {word}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="border-t-4 border-signal-yellow bg-card p-6 sm:p-8">
            <ShieldCheck className="size-7 text-amber-600" />
            <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-signal-navy">
              Batas kemampuan prototipe
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Misi ini menilai tanda terisolasi yang dipicu oleh prompt. Sistem
              belum diklaim mampu menerjemahkan percakapan BISINDO kontinu.
            </p>
            <div className="mt-6 flex gap-3 border-t border-signal-navy/10 pt-5 text-xs leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              Video kamera diproses secara lokal dan tidak disimpan secara
              default.
            </div>
          </aside>
        </section>

        <section id="lesson-plan" className="scroll-mt-8 pb-10 lg:pb-16">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                Alur misi
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-signal-navy">
                Bantuan berkurang saat kemampuanmu tumbuh.
              </h2>
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              Recognize → Imitate → Communicate
            </p>
          </div>

          <ol className="grid gap-4 lg:grid-cols-3">
            {stages.map((stage) => {
              const Icon = stage.icon;
              return (
                <li
                  key={stage.number}
                  className={cn(
                    'relative min-h-72 border p-6 sm:p-7',
                    stage.state === 'current' &&
                      'border-signal-yellow bg-signal-yellow/15',
                    stage.state === 'completed' &&
                      'border-signal-teal bg-signal-teal-soft',
                    stage.state === 'locked' && 'border-signal-navy/10 bg-card',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'grid size-12 place-items-center rounded-full',
                        stage.state === 'completed' &&
                          'bg-signal-teal text-signal-navy',
                        stage.state === 'current' &&
                          'bg-signal-yellow text-signal-navy',
                        stage.state === 'locked' &&
                          'bg-muted text-muted-foreground',
                      )}
                    >
                      {stage.state === 'completed' ? (
                        <Check className="size-5" strokeWidth={3} />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </span>
                    <span className="font-mono text-xs font-black text-muted-foreground">
                      {stage.number}
                    </span>
                  </div>
                  <p className="mt-7 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    {stage.state === 'completed' && 'Selesai'}
                    {stage.state === 'current' && 'Tahap aktif'}
                    {stage.state === 'locked' && 'Terkunci'}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
                    {stage.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {stage.description}
                  </p>
                  <p className="absolute bottom-6 left-6 flex items-center gap-2 text-xs font-bold text-signal-navy sm:left-7">
                    <Clock3 className="size-3.5" /> {stage.duration}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="grid overflow-hidden bg-signal-navy text-white lg:grid-cols-[0.72fr_1.28fr]">
          <div className="flex flex-col justify-between bg-signal-coral p-7 text-signal-navy sm:p-9">
            <MessageCircleMore className="size-8" />
            <div className="mt-20">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-navy/60">
                Preview skenario
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.04em]">
                Berlatih merespons, bukan menghafal urutan.
              </h2>
            </div>
          </div>

          <ol className="divide-y divide-white/10 p-7 sm:p-9">
            {scenario.map((turn, index) => (
              <li
                key={`${turn.speaker}-${turn.prompt}`}
                className="grid gap-3 py-6 first:pt-0 last:pb-0 sm:grid-cols-[40px_135px_1fr] sm:items-start"
              >
                <span className="font-mono text-xs font-black text-signal-teal">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-black">{turn.speaker}</span>
                <span>
                  <span className="block text-sm font-bold">{turn.prompt}</span>
                  <span className="mt-1 block text-sm leading-6 text-white/55">
                    {turn.response}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-10 flex flex-col gap-4 border-t border-signal-navy/10 py-7 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/missions"
            className="text-sm font-extrabold text-muted-foreground hover:text-signal-navy"
          >
            ← Pilih misi lain
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Sparkles className="size-4 text-amber-600" />
            Tahap kamera akan tersedia pada milestone berikutnya.
          </div>
        </footer>
      </div>
    </main>
  );
}
