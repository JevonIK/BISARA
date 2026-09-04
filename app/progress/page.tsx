import type { Metadata } from 'next';

import { AppHeader } from '@/components/app-header';
import { ProgressDashboard } from '@/components/progress-dashboard';

export const metadata: Metadata = {
  title: 'Progres Belajar',
  description:
    'Pantau XP, streak, aktivitas mingguan, mastery, skor, dan lencana pembelajaran BISINDO.',
};

export default function ProgressPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="progress" />
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <ProgressDashboard />
      </div>
    </main>
  );
}
