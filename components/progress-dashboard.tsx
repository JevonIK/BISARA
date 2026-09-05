'use client';

import {
  Award,
  Check,
  Clock3,
  Flame,
  LockKeyhole,
  MessageCircleMore,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { useProgress } from '@/hooks/use-progress';
import { useAccount } from '@/hooks/use-account';
import { reviewSignIds } from '@/lib/progress-storage';
import { cn } from '@/lib/utils';

const chartConfig = {
  minutes: {
    label: 'Menit latihan',
    color: '#55c7b5',
  },
} satisfies ChartConfig;

const badges = [
  {
    id: 'first-step',
    name: 'Langkah Pertama',
    description: 'Selesaikan misi pertama.',
    icon: Target,
    color: 'teal',
  },
  {
    id: 'streak-seven',
    name: '7 Hari Konsisten',
    description: 'Berlatih tujuh hari beruntun.',
    icon: Flame,
    color: 'coral',
  },
  {
    id: 'chapter-one',
    name: 'Pemahaman Bab 1',
    description: 'Dapatkan minimal satu bintang.',
    icon: Star,
    color: 'yellow',
  },
  {
    id: 'first-conversation',
    name: 'Percakapan Pertama',
    description: 'Selesaikan simulasi bercabang.',
    icon: MessageCircleMore,
    color: 'navy',
  },
] as const;

export function ProgressDashboard() {
  const userProgress = useProgress();
  const account = useAccount();
  const level = Math.floor(userProgress.xp / 500) + 1;
  const levelProgress = userProgress.xp % 500;
  const reviewProgress = Math.round(
    (userProgress.reviewedSigns.length / reviewSignIds.length) * 100,
  );
  const activeDays = userProgress.weeklyActivity.filter(
    (entry) => entry.minutes > 0,
  ).length;

  const unlockedBadges = new Set([
    ...(userProgress.completedMissions > 0 ? ['first-step'] : []),
    ...(userProgress.streak >= 7 ? ['streak-seven'] : []),
    ...(userProgress.chapterOneStars > 0 ? ['chapter-one'] : []),
    ...(userProgress.conversationCompletions > 0 ? ['first-conversation'] : []),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3 border bg-card p-4 text-sm">
        <p>
          {account.user
            ? `${account.user.displayName} · ${account.sync === 'saved' ? 'Progres tersimpan di akun' : 'Periksa status sinkronisasi'}`
            : 'Mode tamu · progres tersimpan di browser ini. Angka awal berasal dari data contoh prototipe.'}
        </p>
        <Link href="/account" className="font-bold text-emerald-800">
          {account.user ? 'Kelola akun →' : 'Masuk untuk sinkronisasi →'}
        </Link>
      </div>
      <section className="grid overflow-hidden bg-signal-navy text-white lg:grid-cols-[1fr_360px]">
        <div className="p-7 sm:p-10">
          <Badge className="bg-signal-teal text-signal-navy">
            Level {level} · Communicator
          </Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.05em] sm:text-5xl">
            Progresmu mulai membentuk kebiasaan komunikasi.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
            Setiap misi, tes, dan review memperkuat kemampuan mengenali,
            menirukan, lalu menggunakan tanda dalam konteks.
          </p>
        </div>

        <div className="flex flex-col justify-between border-t border-white/10 bg-white/[0.04] p-7 lg:border-l lg:border-t-0 sm:p-9">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
                Total pengalaman
              </p>
              <p className="mt-2 text-5xl font-black tracking-[-0.06em]">
                {userProgress.xp.toLocaleString('id-ID')}
              </p>
              <p className="text-sm font-bold text-white/45">XP</p>
            </div>
            <Sparkles className="size-7 text-signal-yellow" />
          </div>
          <div className="mt-10">
            <Progress value={(levelProgress / 500) * 100} className="gap-2">
              <ProgressLabel className="text-xs font-bold text-white">
                Menuju level {level + 1}
              </ProgressLabel>
              <span className="ml-auto text-xs font-bold text-white/55">
                {levelProgress}/500 XP
              </span>
            </Progress>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          value={`${userProgress.streak} hari`}
          label="Streak berjalan"
          tone="coral"
        />
        <StatCard
          icon={Check}
          value={`${userProgress.completedMissions}/15`}
          label="Misi selesai"
          tone="teal"
        />
        <StatCard
          icon={Clock3}
          value={`${userProgress.totalPracticeMinutes} menit`}
          label="Total latihan"
          tone="yellow"
        />
        <StatCard
          icon={Trophy}
          value={`${userProgress.bestChapterScore}`}
          label="Skor terbaik Bab 1"
          tone="navy"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <article className="border border-signal-navy/10 bg-card p-6 sm:p-8">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Aktivitas mingguan
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
                {activeDays} hari aktif minggu ini
              </h2>
            </div>
            <p className="text-xs font-bold text-muted-foreground">
              Menit latihan per hari
            </p>
          </div>

          <ChartContainer
            config={chartConfig}
            className="h-[260px] w-full aspect-auto"
            initialDimension={{ width: 720, height: 260 }}
          >
            <BarChart
              accessibilityLayer
              data={userProgress.weeklyActivity}
              margin={{ left: 4, right: 4, top: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="minutes"
                fill="var(--color-minutes)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </article>

        <aside className="flex flex-col justify-between border-t-4 border-signal-coral bg-card p-6 sm:p-8">
          <div>
            <div className="flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-full bg-signal-coral/10 text-signal-coral">
                <RefreshCw className="size-5" />
              </span>
              <Badge
                variant="outline"
                className="border-signal-coral/20 text-signal-coral"
              >
                Daily quest
              </Badge>
            </div>
            <h2 className="mt-6 text-2xl font-black tracking-[-0.035em] text-signal-navy">
              Perkuat lima tanda hari ini
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {userProgress.reviewedSigns.length} dari {reviewSignIds.length}{' '}
              tanda sudah diulang.
            </p>
          </div>
          <div className="mt-9">
            <Progress value={reviewProgress} className="gap-2">
              <ProgressLabel className="text-xs font-bold text-signal-navy">
                Progres review
              </ProgressLabel>
              <span className="ml-auto text-xs font-bold text-muted-foreground">
                {reviewProgress}%
              </span>
            </Progress>
            <Link
              href="/review"
              className="mt-6 flex items-center justify-between border-t border-signal-navy/10 pt-5 text-sm font-extrabold text-signal-navy hover:text-emerald-700"
            >
              {reviewProgress === 100
                ? 'Lihat hasil review'
                : 'Lanjutkan review'}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <article className="border border-signal-navy/10 bg-card p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Tingkat mastery
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
            Recognize → Imitate → Communicate
          </h2>
          <div className="mt-7 space-y-6">
            <MasteryRow
              label="Recognize (skor tes)"
              value={userProgress.bestChapterScore}
              color="bg-signal-teal"
            />
            <p className="text-sm text-muted-foreground">
              Penilaian Imitate dan Communicate belum tersedia. Penyelesaian
              simulasi belum membuktikan akurasi isyarat.
            </p>
            <MasteryRow
              label="Simulasi perkenalan selesai"
              value={userProgress.conversationCompletions > 0 ? 100 : 0}
              color="bg-signal-coral"
            />
          </div>
        </article>

        <article className="border border-signal-navy/10 bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Koleksi lencana
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-signal-navy">
                Pencapaian yang sudah kamu buka
              </h2>
            </div>
            <Award className="size-6 text-amber-600" />
          </div>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {badges.map((badge) => {
              const unlocked = unlockedBadges.has(badge.id);
              const Icon = badge.icon;
              return (
                <li
                  key={badge.id}
                  className={cn(
                    'flex min-h-28 items-center gap-4 border p-4',
                    unlocked
                      ? 'border-signal-navy/10 bg-background'
                      : 'border-signal-navy/5 bg-muted/35 opacity-55',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-full',
                      unlocked &&
                        badge.color === 'teal' &&
                        'bg-signal-teal text-signal-navy',
                      unlocked &&
                        badge.color === 'coral' &&
                        'bg-signal-coral/15 text-signal-coral',
                      unlocked &&
                        badge.color === 'yellow' &&
                        'bg-signal-yellow/30 text-amber-700',
                      unlocked &&
                        badge.color === 'navy' &&
                        'bg-signal-navy text-white',
                      !unlocked && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {unlocked ? (
                      <Icon className="size-5" />
                    ) : (
                      <LockKeyhole className="size-4" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-black text-signal-navy">
                      {badge.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {badge.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
  tone: 'teal' | 'coral' | 'yellow' | 'navy';
}) {
  return (
    <article className="flex items-center gap-4 border border-signal-navy/10 bg-card p-5">
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full',
          tone === 'teal' && 'bg-signal-teal-soft text-emerald-800',
          tone === 'coral' && 'bg-signal-coral/10 text-signal-coral',
          tone === 'yellow' && 'bg-signal-yellow/30 text-amber-700',
          tone === 'navy' && 'bg-signal-navy text-white',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xl font-black tracking-[-0.03em] text-signal-navy">
          {value}
        </p>
        <p className="mt-0.5 text-xs font-bold text-muted-foreground">
          {label}
        </p>
      </div>
    </article>
  );
}

function MasteryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold">
        <span className="text-signal-navy">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
