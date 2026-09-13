'use client';

import { Brain, Check, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { RecallPractice } from '@/components/recall-practice';
import { Button, buttonVariants } from '@/components/ui/button';
import { useProgress } from '@/hooks/use-progress';
import { getSign, type SignId } from '@/lib/curriculum-data';
import { getReviewSignIds } from '@/lib/progress-storage';
import { cn } from '@/lib/utils';

export function ReviewQuest() {
  const progress = useProgress();
  const [queue, setQueue] = useState<SignId[] | null>(null);
  const targetIds = getReviewSignIds(progress);
  const pending = targetIds.filter(
    (id) => !progress.reviewedSigns.includes(id),
  );
  const completed = targetIds.length - pending.length;
  const hasLearned = Object.values(progress.signMastery).some(
    (item) => item.attempts > 0 || item.recall,
  );
  const nextDue = Object.values(progress.signMastery)
    .flatMap((item) => (item.recall ? [item.recall.nextReviewAt] : []))
    .sort()[0];

  if (queue)
    return <RecallPractice signIds={queue} onExit={() => setQueue(null)} />;

  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden bg-signal-navy text-white lg:grid-cols-[1fr_280px]">
        <div className="p-7 sm:p-10">
          <Brain className="size-9 text-signal-teal" />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-signal-teal">
            Review berkala
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight">
            Coba ingat sebelum melihat contoh.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
            Tanda yang sudah dipelajari kembali setelah jeda. Jika masih butuh
            bantuan, ulangi lebih cepat; jika bisa diingat mandiri, jedanya
            bertambah.
          </p>
        </div>
        <aside className="border-t border-white/15 p-7 lg:border-l lg:border-t-0">
          <Clock3 className="size-7 text-signal-yellow" />
          <p className="mt-6 text-sm text-white/70">Review hari ini</p>
          <p className="mt-2 text-4xl font-black">
            {completed}/{targetIds.length}
          </p>
          <p className="mt-3 text-sm text-white/70">
            {pending.length
              ? `${pending.length} tanda siap diulang`
              : 'Tidak ada review tertunda'}
          </p>
        </aside>
      </section>

      {pending.length ? (
        <section className="border border-signal-navy/10 bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-black text-signal-navy">
            Tanda untuk sesi ini
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Contoh akan disembunyikan sampai kamu mencoba atau meminta bantuan.
            Catatanmu adalah penilaian mandiri, terpisah dari hasil checker
            kamera.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {targetIds.map((id) => {
              const recall = progress.signMastery[id].recall;
              const done = progress.reviewedSigns.includes(id);
              return (
                <li key={id} className="border border-signal-navy/10 p-4">
                  <p className="flex items-center gap-2 font-black text-signal-navy">
                    {done ? (
                      <Check className="size-4 text-emerald-700" />
                    ) : null}
                    {getSign(id).label}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {done
                      ? 'Sudah dicoba hari ini'
                      : recall
                        ? recall.lastOutcome === 'independent'
                          ? 'Cek apakah masih ingat'
                          : 'Sebelumnya masih perlu bantuan / latihan'
                        : 'Belum pernah dicoba tanpa contoh'}
                  </p>
                </li>
              );
            })}
          </ul>
          <Button
            size="lg"
            onClick={() => setQueue(pending)}
            className="mt-7 rounded-full bg-signal-teal font-bold text-signal-navy"
          >
            Mulai review · {pending.length} tanda
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            +10 XP per tanda untuk catatan mengingat pertama hari ini.
          </p>
        </section>
      ) : (
        <section className="border border-signal-teal bg-signal-teal-soft p-7">
          <h2 className="text-2xl font-black text-signal-navy">
            {hasLearned
              ? 'Beri jeda sebelum mengulang lagi'
              : 'Pelajari tanda pertamamu'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {hasLearned
              ? `Tidak perlu mengulang seluruh materi hari ini.${nextDue ? ` Jadwal review berikutnya: ${nextDue}.` : ''} Kamu bisa melanjutkan misi.`
              : 'Setelah mencoba latihan tanda, materi itu akan masuk daftar review. Tidak ada kosakata baru yang diujikan di sini.'}
          </p>
          <Link
            href="/missions"
            className={cn(
              buttonVariants(),
              'mt-5 rounded-full bg-signal-navy text-white',
            )}
          >
            Lanjutkan perjalanan
          </Link>
        </section>
      )}
    </div>
  );
}
