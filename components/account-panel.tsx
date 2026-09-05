'use client';

import { useState } from 'react';
import {
  Cloud,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useAccount } from '@/hooks/use-account';
import { useProgress } from '@/hooks/use-progress';
import {
  authenticate,
  canImportGuestProgress,
  hasPersistentStorage,
  importGuestProgress,
  logoutAccount,
  refreshAccount,
  resolveProgressConflict,
  syncProgress,
} from '@/lib/account-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AccountPanel() {
  const account = useAccount();
  const progress = useProgress();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Terjadi kesalahan. Coba lagi.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const field = (name: string) => {
      const value = values.get(name);
      return typeof value === 'string' ? value : '';
    };
    await perform(async () => {
      await authenticate(mode, {
        email: field('email').trim(),
        password: field('password'),
        ...(mode === 'register'
          ? { displayName: field('displayName').trim() }
          : {}),
      });
      form.reset();
    });
  }

  return (
    <section className="mx-auto grid max-w-5xl overflow-hidden border bg-card lg:grid-cols-[0.85fr_1.15fr]">
      <div className="bg-signal-navy p-8 text-white sm:p-12">
        <Cloud className="size-10 text-signal-teal" />
        <p className="mt-10 text-xs font-bold uppercase tracking-widest text-signal-teal">
          Akun BISARA
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
          Perjalanan belajarmu, di setiap perangkat.
        </h1>
        <p className="mt-6 leading-7 text-white/75">
          Masuk untuk menyimpan hasil tes, XP, dan review ke akunmu. Progres
          tamu tetap tersedia di browser ini.
        </p>
        <div className="mt-10 flex gap-3 border-t border-white/20 pt-6 text-sm text-white/75">
          <ShieldCheck className="size-5 shrink-0 text-signal-teal" />
          <p>
            Sinkronisasi menyimpan progres belajar. Video kamera tidak dikirim
            ke akun.
          </p>
        </div>
      </div>
      <div className="p-6 sm:p-10">
        {account.status === 'loading' ? (
          <output className="flex items-center gap-3">
            <LoaderCircle className="size-5 animate-spin" />
            Memeriksa sesi…
          </output>
        ) : account.user ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black">
                Halo, {account.user.displayName}.
              </h2>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {account.user.email}
              </p>
            </div>
            <div className="border bg-background p-5">
              <p className="text-3xl font-black">
                {progress.xp.toLocaleString('id-ID')} XP
              </p>
              <p className="mt-2 text-sm">
                Skor terbaik: {progress.bestChapterScore}/100
              </p>
              <output className="mt-4 block text-sm font-semibold">
                {account.sync === 'saved'
                  ? 'Progres tersimpan di akun.'
                  : account.sync === 'saving'
                    ? 'Menyimpan progres…'
                    : account.sync === 'conflict'
                      ? 'Ada dua versi progres.'
                      : 'Menunggu sinkronisasi.'}
              </output>
            </div>
            {account.sync === 'conflict' && (
              <div className="space-y-3 border border-amber-400 bg-amber-50 p-5 text-sm text-amber-950">
                <p>
                  Perangkat lain telah memperbarui akun. Pilih versi yang ingin
                  dipakai. Kedua versi dicadangkan di browser sebelum pilihan
                  diterapkan.
                </p>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    perform(() => resolveProgressConflict('server'))
                  }
                >
                  Gunakan progres server
                </Button>
                <details>
                  <summary className="cursor-pointer py-2 font-semibold">
                    Pertahankan versi browser ini
                  </summary>
                  <p className="mb-3">
                    Pilihan ini mengganti progres server dengan versi lokal,
                    termasuk XP dan skor. Perubahan perangkat lain tidak
                    digabung.
                  </p>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      perform(() => resolveProgressConflict('local'))
                    }
                  >
                    Ganti server dengan versi lokal
                  </Button>
                </details>
              </div>
            )}
            {canImportGuestProgress() && (
              <div className="space-y-3 border bg-signal-teal-soft p-5 text-sm">
                <p>
                  Akun ini masih kosong. Progres tamu dapat disalin sekali,
                  termasuk angka contoh yang berasal dari prototipe.
                </p>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={importGuestProgress}
                >
                  Salin progres tamu ke akun ini
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={
                  busy ||
                  account.sync === 'saving' ||
                  account.sync === 'conflict'
                }
                onClick={() => perform(syncProgress)}
              >
                <RefreshCw className="size-4" />
                Sinkronkan
              </Button>
              <Button
                disabled={busy || account.sync === 'saving'}
                variant="outline"
                onClick={() => perform(logoutAccount)}
              >
                <LogOut className="size-4" />
                Keluar
              </Button>
            </div>
            <Link
              href="/progress"
              className="block text-sm font-bold text-emerald-800"
            >
              Buka progres belajar →
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-7 flex gap-2" aria-label="Pilihan akses akun">
              <Button
                variant={mode === 'login' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Masuk
              </Button>
              <Button
                variant={mode === 'register' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Daftar
              </Button>
            </div>
            <h2 className="text-2xl font-black">
              {mode === 'login' ? 'Lanjutkan belajarmu' : 'Buat akun belajar'}
            </h2>
            <form onSubmit={submit} className="mt-6 space-y-5">
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="display-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Nama
                  </label>
                  <Input
                    id="display-name"
                    name="displayName"
                    autoComplete="nickname"
                    required
                    minLength={2}
                    maxLength={80}
                    className="h-11"
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="account-email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email
                </label>
                <Input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  className="h-11"
                />
              </div>
              <div>
                <label
                  htmlFor="account-password"
                  className="mb-2 block text-sm font-semibold"
                >
                  Kata sandi
                </label>
                <Input
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  required
                  minLength={8}
                  maxLength={128}
                  className="h-11"
                  aria-describedby="password-note"
                />
                <p
                  id="password-note"
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Gunakan 8–128 karakter.
                </p>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full font-bold"
              >
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {mode === 'login' ? 'Masuk ke akun' : 'Buat akun'}
              </Button>
            </form>
            <Link
              href="/"
              className="mt-5 block text-sm font-bold text-emerald-800"
            >
              Lanjutkan sebagai tamu →
            </Link>
            {account.status === 'offline' && (
              <Button
                variant="outline"
                className="mt-4"
                disabled={busy}
                onClick={() => perform(refreshAccount)}
              >
                Periksa koneksi
              </Button>
            )}
          </div>
        )}
        {(error || account.message) && (
          <p role="alert" className="mt-5 text-sm leading-6 text-red-800">
            {error || account.message}
          </p>
        )}
        {!hasPersistentStorage() && (
          <p role="alert" className="mt-4 text-sm text-amber-900">
            Browser membatasi penyimpanan. Perubahan lokal hanya bertahan selama
            tab ini terbuka; pastikan sinkronisasi selesai.
          </p>
        )}
      </div>
    </section>
  );
}
