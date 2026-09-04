import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Hand,
  Headphones,
  LockKeyhole,
  Map,
  MessageCircleMore,
  Play,
  Target,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { chapters } from '@/lib/learning-data';
import { cn } from '@/lib/utils';

const learningSteps = [
  { label: 'Kenali', icon: BookOpen, state: 'done' },
  { label: 'Tirukan', icon: Hand, state: 'active' },
  { label: 'Komunikasikan', icon: MessageCircleMore, state: 'next' },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="home" />

      <div id="top" className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-700">
              <span className="size-2 rounded-full bg-signal-teal" />
              Selamat datang kembali
            </p>
            <h1 className="max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.045em] text-signal-navy sm:text-4xl lg:text-5xl">
              Lanjutkan langkahmu untuk berkomunikasi.
            </h1>
          </div>
          <div className="grid grid-cols-3 divide-x divide-signal-navy/10 border-y border-signal-navy/10 py-3 lg:min-w-[390px]">
            <Stat value="2" label="Misi selesai" />
            <Stat value="18" label="Tanda dikuasai" />
            <Stat value="2" label="Lencana" />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)]">
          <article className="relative overflow-hidden rounded-[2rem] bg-signal-navy p-6 text-white sm:p-8 lg:p-10">
            <div
              className="absolute -right-16 -top-24 size-80 rounded-full border-[56px] border-signal-teal/10"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-28 right-28 size-56 rounded-full border-[42px] border-signal-coral/10"
              aria-hidden="true"
            />

            <div className="relative grid min-h-[365px] gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex flex-col justify-between">
                <div>
                  <Badge className="mb-5 h-7 bg-signal-teal px-3 font-extrabold text-signal-navy">
                    Misi aktif · Bab 1
                  </Badge>
                  <p className="mb-2 text-sm font-bold uppercase tracking-[0.15em] text-signal-teal">
                    Misi 03
                  </p>
                  <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
                    Berkenalan dengan teman baru
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
                    Latih cara menyebutkan nama, bertanya kabar, dan merespons
                    sapaan dalam percakapan singkat.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/missions/berkenalan"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'h-12 rounded-full bg-signal-teal px-5 font-extrabold text-signal-navy hover:bg-signal-teal/90',
                    )}
                  >
                    <Play className="size-4" fill="currentColor" />
                    Lanjutkan latihan
                  </Link>
                  <span className="flex items-center gap-2 px-2 text-sm font-semibold text-white/60">
                    <Target className="size-4" /> sekitar 8 menit
                  </span>
                </div>
              </div>

              <div className="self-end rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-bold">Tahap pembelajaran</p>
                  <span className="text-xs font-bold text-signal-teal">
                    2/3
                  </span>
                </div>
                <ol className="space-y-3">
                  {learningSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <li key={step.label} className="flex items-center gap-3">
                        <span
                          className={cn(
                            'grid size-9 place-items-center rounded-full border',
                            step.state === 'done' &&
                              'border-signal-teal bg-signal-teal text-signal-navy',
                            step.state === 'active' &&
                              'border-signal-yellow bg-signal-yellow text-signal-navy',
                            step.state === 'next' &&
                              'border-white/15 bg-white/5 text-white/40',
                          )}
                        >
                          {step.state === 'done' ? (
                            <Check className="size-4" strokeWidth={3} />
                          ) : (
                            <Icon className="size-4" />
                          )}
                        </span>
                        <span>
                          <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-white/40">
                            Tahap {index + 1}
                          </span>
                          <span
                            className={cn(
                              'text-sm font-bold',
                              step.state === 'next'
                                ? 'text-white/40'
                                : 'text-white',
                            )}
                          >
                            {step.label}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </article>

          <aside
            id="daily-quest"
            className="flex flex-col justify-between border-t-4 border-signal-coral bg-card p-6 sm:p-8"
          >
            <div>
              <div className="mb-8 flex items-start justify-between">
                <div className="grid size-12 place-items-center rounded-full bg-signal-coral/10 text-signal-coral">
                  <Trophy className="size-6" />
                </div>
                <Badge
                  variant="outline"
                  className="h-7 border-signal-coral/20 px-3 text-signal-coral"
                >
                  +50 XP
                </Badge>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-signal-coral">
                Daily quest
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
                Ulangi 5 tanda yang perlu diperkuat
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Fokus hari ini: posisi tangan dan arah gerakan.
              </p>
            </div>
            <div className="mt-10">
              <Progress value={40} className="gap-2">
                <ProgressLabel className="font-bold text-signal-navy">
                  Progres hari ini
                </ProgressLabel>
                <span className="ml-auto text-sm font-bold text-muted-foreground">
                  2 dari 5
                </span>
              </Progress>
              <button
                type="button"
                className="mt-6 flex w-full items-center justify-between border-t border-signal-navy/10 pt-5 text-left text-sm font-extrabold text-signal-navy transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Mulai quest
                <ArrowRight className="size-4" />
              </button>
            </div>
          </aside>
        </section>

        <section id="learning-journey" className="scroll-mt-8 py-14 lg:py-20">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                <Map className="size-4" /> perjalanan belajarmu
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-signal-navy">
                Tiga bab, satu tujuan nyata.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
              Selesaikan misi secara berurutan. Bantuan akan berkurang saat
              kemampuanmu berkembang.
            </p>
          </div>

          <div className="relative grid gap-4 lg:grid-cols-3">
            <div
              className="absolute left-[16%] right-[16%] top-14 hidden border-t-2 border-dashed border-signal-navy/10 lg:block"
              aria-hidden="true"
            />
            {chapters.map((chapter) => (
              <article
                key={chapter.number}
                className={cn(
                  'relative bg-card p-6 sm:p-7',
                  chapter.status === 'active'
                    ? 'border-2 border-signal-teal'
                    : 'border border-signal-navy/10',
                )}
              >
                <div className="mb-8 flex items-center justify-between">
                  <span
                    className={cn(
                      'grid size-14 place-items-center rounded-full text-lg font-black',
                      chapter.status === 'active'
                        ? 'bg-signal-teal text-signal-navy'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {chapter.status === 'locked' ? (
                      <LockKeyhole className="size-5" />
                    ) : (
                      chapter.number
                    )}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {chapter.status === 'active'
                      ? `${chapter.missions.filter((mission) => mission.status === 'completed').length} dari ${chapter.missions.length} misi`
                      : `${chapter.missions.length} misi`}
                  </span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700">
                  {chapter.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-signal-navy">
                  {chapter.title}
                </h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">
                  {chapter.description}
                </p>
                {chapter.status === 'active' ? (
                  <div className="mt-7">
                    <Progress value={chapter.progress} className="gap-2">
                      <ProgressLabel className="text-xs font-bold text-signal-navy">
                        Bab berjalan
                      </ProgressLabel>
                      <span className="ml-auto text-xs font-bold text-muted-foreground">
                        {chapter.progress}%
                      </span>
                    </Progress>
                    <Link
                      href="/missions"
                      className="mt-5 flex items-center gap-1 text-sm font-extrabold text-emerald-700 hover:text-signal-navy"
                    >
                      Lihat semua misi <ChevronRight className="size-4" />
                    </Link>
                  </div>
                ) : (
                  <p className="mt-7 flex items-center gap-2 border-t border-signal-navy/10 pt-5 text-xs font-bold text-muted-foreground">
                    <LockKeyhole className="size-3.5" /> Selesaikan bab
                    sebelumnya
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden bg-signal-teal-soft md:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-between bg-signal-teal p-7 sm:p-9">
            <Headphones className="size-8 text-signal-navy" />
            <div className="mt-16">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-signal-navy/60">
                Cara belajar BISARA
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.04em] text-signal-navy">
                Bukan hanya tahu. Kamu berlatih sampai siap merespons.
              </h2>
            </div>
          </div>
          <ol className="grid divide-y divide-signal-navy/10 p-7 sm:p-9">
            {[
              ['01', 'Recognize', 'Pahami bentuk, konteks, dan arti tanda.'],
              [
                '02',
                'Imitate',
                'Tirukan dengan bantuan contoh dan umpan balik.',
              ],
              [
                '03',
                'Communicate',
                'Gunakan tanpa petunjuk di dalam skenario.',
              ],
            ].map(([number, title, description]) => (
              <li
                key={number}
                className="grid grid-cols-[44px_1fr] gap-4 py-5 first:pt-0 last:pb-0"
              >
                <span className="font-mono text-sm font-black text-emerald-700">
                  {number}
                </span>
                <div>
                  <h3 className="font-black text-signal-navy">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-14 flex flex-col gap-3 border-t border-signal-navy/10 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-signal-navy">
            BISARA · Learn to communicate, not just memorize signs.
          </p>
          <p>Materi dikembangkan bersama dan divalidasi oleh komunitas Tuli.</p>
        </footer>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <p className="text-2xl font-black tracking-[-0.04em] text-signal-navy">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-bold leading-tight text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
