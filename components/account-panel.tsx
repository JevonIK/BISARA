'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAccount } from '@/hooks/use-account';
import {
  authenticate,
  canImportGuestProgress,
  hasPersistentStorage,
  importGuestProgress,
  refreshAccount,
} from '@/lib/account-session';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AccountPanel() {
  const router = useRouter();
  const account = useAccount();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (account.status === 'ready' && account.user) {
      router.replace('/');
    }
  }, [account.status, account.user, router]);

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
    if (mode === 'forgot') {
      const form = event.currentTarget;
      const values = new FormData(form);
      const email = values.get('email');
      if (email && typeof email === 'string' && email.trim().length > 0) {
        setResetSent(true);
      }
      return;
    }

    const form = event.currentTarget;
    const values = new FormData(form);
    const field = (name: string) => {
      const value = values.get(name);
      return typeof value === 'string' ? value : '';
    };

    await perform(async () => {
      const user = await authenticate(mode, {
        email: field('email').trim(),
        password: field('password'),
        ...(mode === 'register'
          ? { displayName: field('displayName').trim() }
          : {}),
      });
      if (canImportGuestProgress()) {
        importGuestProgress();
      }
      const username =
        user?.displayName || field('displayName').trim() || 'Pengguna';
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bisara_welcome_user', username);
      }
      form.reset();
      router.push('/?login=success');
    });
  }

  return (
    <section className="grid grid-cols-1 overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] bg-white shadow-sm border border-amber-200/50 lg:grid-cols-[1fr_1.2fr] items-stretch">
      {/* Left Golden Card with Illustration matching mockup */}
      <div className="relative flex min-h-[500px] lg:min-h-[640px] flex-col justify-between overflow-hidden bg-[#FFAE00] p-8 sm:p-12 lg:p-14 shadow-xs">
        {/* Top Text content */}
        <div className="relative z-10">
          <span className="text-xs font-black uppercase tracking-widest text-slate-900/80">
            BISARA
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.12] tracking-tight text-slate-900">
            Perjalanan
            <br />
            belajarmu, di
            <br />
            setiap perangkat.
          </h1>
          <p className="mt-4 text-xs sm:text-sm lg:text-base font-semibold leading-relaxed text-slate-900/85 max-w-md">
            Masuk untuk menyimpan hasil tes, lencana, dan review ke akunmu. Progres
            tamu tetap tersedia di browser ini.
          </p>
        </div>

        {/* Vector Hands & Ribbon Illustration */}
        <div className="relative z-0 mt-auto pt-8">
          <LoginIllustration />
        </div>
      </div>

      {/* Right Form Card */}
      <div className="flex flex-col justify-center bg-white p-8 sm:p-12 lg:p-16">
        <div className="mx-auto w-full max-w-lg">
        {account.status === 'loading' || account.user ? (
          <div className="flex items-center gap-3 py-12 text-slate-600 font-bold">
            <LoaderCircle className="size-5 animate-spin text-amber-500" />
            {account.user ? 'Mengarahkan ke beranda…' : 'Memeriksa sesi…'}
          </div>
        ) : (
          /* Login / Register / Forgot Password Forms */
          <div>
            {/* Top Switcher: Masuk / Daftar */}
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setResetSent(false);
                }}
                className={cn(
                  'rounded-full px-5 py-1.5 text-xs sm:text-sm font-black transition-colors',
                  mode === 'login' || mode === 'forgot'
                    ? 'bg-[#FFAE00] text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-bold',
                )}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setResetSent(false);
                }}
                className={cn(
                  'rounded-full px-5 py-1.5 text-xs sm:text-sm font-black transition-colors',
                  mode === 'register'
                    ? 'bg-[#FFAE00] text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-bold',
                )}
              >
                Daftar
              </button>
            </div>

            {/* View 1: Login Form (Photo 1) */}
            {mode === 'login' && (
              <>
                <h2 className="mt-6 sm:mt-8 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Lanjutkan belajarmu
                </h2>

                <form onSubmit={submit} className="mt-6 space-y-4 sm:space-y-5">
                  <div>
                    <label
                      htmlFor="account-email"
                      className="mb-2 block text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Email
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50">
                      <Mail className="size-5 text-slate-400 shrink-0" />
                      <input
                        id="account-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={320}
                        placeholder=""
                        className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="account-password"
                      className="mb-2 block text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Kata sandi
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50">
                      <LockKeyhole className="size-5 text-slate-400 shrink-0" />
                      <input
                        id="account-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        minLength={8}
                        maxLength={128}
                        placeholder=""
                        className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                        aria-label={
                          showPassword
                            ? 'Sembunyikan kata sandi'
                            : 'Tampilkan kata sandi'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="size-5" />
                        ) : (
                          <Eye className="size-5" />
                        )}
                      </button>
                    </div>
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError('');
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-950 hover:underline"
                      >
                        Lupa Kata Sandi?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-[#FFAE00] hover:bg-[#F2A300] py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-950 shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {busy && <LoaderCircle className="size-4 animate-spin" />}
                    Masuk ke akun
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-4 text-xs font-bold text-slate-400">
                    atau masuk dengan
                  </span>
                </div>

                {/* Social Buttons */}
                <div className="flex gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setError('Autentikasi pihak ketiga akan segera hadir.')
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setError('Autentikasi pihak ketiga akan segera hadir.')
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <AppleIcon />
                    Apple
                  </button>
                </div>

                <Link
                  href="/"
                  className="mt-6 inline-block text-xs sm:text-sm font-black text-[#F06543] hover:text-[#D84315] hover:underline"
                >
                  Lanjutkan sebagai tamu →
                </Link>
              </>
            )}

            {/* View 2: Register Form (Photo 3) */}
            {mode === 'register' && (
              <>
                <h2 className="mt-6 sm:mt-8 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Buat akun Bisara
                </h2>

                <form onSubmit={submit} className="mt-6 space-y-4 sm:space-y-5">
                  <div>
                    <label
                      htmlFor="display-name"
                      className="mb-2 block text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Nama
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50">
                      <input
                        id="display-name"
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder=""
                        className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="account-email"
                      className="mb-2 block text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Email
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50">
                      <Mail className="size-5 text-slate-400 shrink-0" />
                      <input
                        id="account-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={320}
                        placeholder=""
                        className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="account-password"
                      className="mb-2 block text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Kata sandi
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50">
                      <LockKeyhole className="size-5 text-slate-400 shrink-0" />
                      <input
                        id="account-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={128}
                        placeholder=""
                        className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                        aria-label={
                          showPassword
                            ? 'Sembunyikan kata sandi'
                            : 'Tampilkan kata sandi'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="size-5" />
                        ) : (
                          <Eye className="size-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-[#FFAE00] hover:bg-[#F2A300] py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-950 shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {busy && <LoaderCircle className="size-4 animate-spin" />}
                    Buat akun
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-4 text-xs font-bold text-slate-400">
                    atau daftar dengan
                  </span>
                </div>

                {/* Social Buttons */}
                <div className="flex gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setError('Autentikasi pihak ketiga akan segera hadir.')
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setError('Autentikasi pihak ketiga akan segera hadir.')
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <AppleIcon />
                    Apple
                  </button>
                </div>

                <Link
                  href="/"
                  className="mt-6 inline-block text-xs sm:text-sm font-black text-[#F06543] hover:text-[#D84315] hover:underline"
                >
                  Lanjutkan sebagai tamu →
                </Link>
              </>
            )}

            {/* View 3: Forgot Password (Photo 2) */}
            {mode === 'forgot' && (
              <>
                <h2 className="mt-6 sm:mt-8 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Atur Ulang Kata Sandi
                </h2>
                <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                  Masukkan email yang terdaftar. Kami akan mengirimkan tautan
                  untuk membuat kata sandi baru.
                </p>

                <form onSubmit={submit} className="mt-6 space-y-4 sm:space-y-5">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="mb-2 block text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Email Terdaftar
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50">
                      <Mail className="size-5 text-slate-400 shrink-0" />
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={320}
                        placeholder=""
                        className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-[#FFAE00] hover:bg-[#F2A300] py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-950 shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {busy && <LoaderCircle className="size-4 animate-spin" />}
                    Kirim Tautan Reset
                  </button>
                </form>

                {resetSent && (
                  <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-[#E8F8F0] p-4 text-emerald-950 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                          Tautan Terkirim!
                        </h4>
                        <p className="mt-0.5 text-[11px] sm:text-xs font-semibold text-emerald-800">
                          Cek kotak masuk email kamu untuk melanjutkan.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetSent(false)}
                      className="p-1 text-emerald-700 hover:text-emerald-950"
                      aria-label="Tutup notifikasi"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="mt-6 inline-block text-xs sm:text-sm font-black text-slate-600 hover:text-slate-950 hover:underline"
                >
                  ← Kembali ke Masuk
                </button>
              </>
            )}

            {/* Error or server message */}
            {(error || account.message) && (
              <p role="alert" className="mt-4 text-xs font-bold text-red-600">
                {error || account.message}
              </p>
            )}

            {!hasPersistentStorage() && (
              <p role="alert" className="mt-4 text-xs text-amber-900">
                Browser membatasi penyimpanan. Pastikan sinkronisasi selesai
                sebelum menutup tab.
              </p>
            )}

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
        </div>
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      className="size-4 shrink-0 fill-current text-slate-900"
      viewBox="0 0 170 170"
      aria-hidden="true"
    >
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.88-11.96-14.52-7.6-11.85-13.41-24.96-17.43-39.32-4.02-14.36-6.03-27.47-6.03-39.32 0-14.99 3.62-27.42 10.86-37.28 7.24-9.86 16.5-14.88 27.78-15.07 5.06 0 10.59 1.34 16.59 4.02 6 2.68 9.94 4.07 11.83 4.17 1.66 0 5.86-1.46 12.61-4.39 6.75-2.93 12.61-4.24 17.58-3.92 13.88.75 25.13 5.73 33.75 14.93-12.18 7.39-18.17 17.51-17.97 30.37.2 10.15 4.06 18.77 11.59 25.86 7.53 7.09 16.48 11.22 26.85 12.39-2.2 6.54-4.8 13.04-7.8 19.51zM119.22 31.84c0-7.39 2.68-14.42 8.04-21.09 5.36-6.67 11.83-10.75 19.41-12.25.13 1.08.2 2.12.2 3.12 0 7.39-2.82 14.57-8.46 21.55-5.64 6.98-12.05 10.97-19.24 11.97-.27-1.1-.42-2.2-.42-3.3z" />
    </svg>
  );
}

function LoginIllustration() {
  return (
    <svg
      className="w-full h-auto max-h-[300px]"
      viewBox="0 0 380 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top right decorative star */}
      <path
        d="M330 20L334 33L348 35L337 44L340 58L328 50L317 58L320 44L309 35L323 33L330 20Z"
        fill="#FFD268"
        fillOpacity="0.8"
      />
      {/* Top right curly ribbon */}
      <path
        d="M340 65 C358 78, 362 95, 348 106 C334 118, 344 135, 360 142"
        stroke="#D95328"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Bottom left decorative star */}
      <path
        d="M25 210L28 219L38 220L30 227L33 236L25 231L17 236L19 227L12 220L21 219L25 210Z"
        fill="#FFD268"
        fillOpacity="0.8"
      />
      {/* Bottom left small curly ribbon */}
      <path
        d="M30 185 C38 190, 40 198, 34 203 C28 208, 32 216, 38 218"
        stroke="#D95328"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left arm sleeve (rust/terracotta) */}
      <path d="M110 280 L125 190 L175 190 L165 280 Z" fill="#B84A22" />
      {/* Left sleeve cuff */}
      <path
        d="M125 190 Q150 186 175 190 L177 202 Q150 198 123 202 Z"
        fill="#9C3E1B"
      />

      {/* Left hand */}
      <path
        d="M130 190 C126 168 120 142 115 120 C112 111 123 107 127 115 C132 126 135 142 137 155 C140 137 144 108 150 84 C154 74 163 77 161 88 C158 107 154 133 153 148 C158 128 166 98 173 80 C177 70 187 74 183 85 C178 104 173 130 171 144 C176 132 185 110 192 98 C197 90 206 95 201 105 C193 126 185 152 181 170 C177 182 172 190 169 190 Z"
        fill="#FCDAC9"
      />
      {/* Left hand palm crease */}
      <path
        d="M152 160 C156 172 163 180 170 185"
        stroke="#5A473E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Right arm sleeve (warm cream / yellow) */}
      <path d="M195 280 L205 178 L260 178 L275 280 Z" fill="#F4CD75" />
      {/* Right sleeve cuff / fold line */}
      <path
        d="M205 178 Q232 174 260 178 L262 190 Q232 186 203 190 Z"
        fill="#E5B953"
      />
      <line
        x1="215"
        y1="215"
        x2="258"
        y2="265"
        stroke="#DFB246"
        strokeWidth="2.5"
      />

      {/* Right hand */}
      <path
        d="M207 178 C203 169 196 146 188 130 C182 119 193 112 199 121 C204 130 210 144 214 155 C212 135 210 102 210 78 C210 66 221 66 223 78 C225 100 227 127 229 143 C234 122 240 93 245 75 C249 64 260 68 257 80 C252 101 249 127 247 143 C252 130 261 108 268 97 C273 88 283 93 278 104 C270 125 261 152 257 168 C254 178 248 178 245 178 Z"
        fill="#FCDAC9"
      />
      {/* Right hand palm crease */}
      <path
        d="M228 157 C231 168 236 177 244 183"
        stroke="#5A473E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Flowing wrapping ribbon (front of sleeves) */}
      <path
        d="M50 240 C90 205 135 190 180 200 C230 210 270 180 310 140 C330 120 360 90 380 70"
        stroke="#D95328"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M80 255 C125 238 175 230 225 240 C265 248 305 230 345 200"
        stroke="#BA3F17"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
