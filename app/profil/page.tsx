import { AppHeader } from '@/components/app-header';

export default function ProfilPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="profil" />
      <div className="mx-auto max-w-7xl px-5 py-20 text-center">
        <h1 className="text-3xl font-black text-slate-900">Profil Pengguna</h1>
        <p className="mt-3 text-slate-500">
          Halaman profil sedang disiapkan.
        </p>
      </div>
    </main>
  );
}
