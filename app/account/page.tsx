import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-header';
import { AccountPanel } from '@/components/account-panel';

export const metadata: Metadata = {
  title: 'Akun',
  description: 'Masuk dan simpan progres belajar BISARA ke akunmu.',
};
export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#FFE8A3] pb-16">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 lg:px-6">
        <AccountPanel />
      </div>
    </main>
  );
}
