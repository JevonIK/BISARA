import type { Metadata } from 'next';

import { AppHeader } from '@/components/app-header';
import { ReviewQuest } from '@/components/review-quest';

export const metadata: Metadata = {
  title: 'Daily Review Quest',
  description:
    'Ulangi tanda yang perlu diperkuat, pertahankan streak, dan dapatkan XP harian.',
};

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="practice" />
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <ReviewQuest />
      </div>
    </main>
  );
}
