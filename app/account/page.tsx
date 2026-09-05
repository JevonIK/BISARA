import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-header';
import { AccountPanel } from '@/components/account-panel';

export const metadata: Metadata = {
  title: 'Akun',
  description: 'Masuk dan simpan progres belajar BISARA ke akunmu.',
};
export default function AccountPage() {
  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="px-5 py-10">
        <AccountPanel />
      </div>
    </main>
  );
}
