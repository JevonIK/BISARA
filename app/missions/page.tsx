import type { Metadata } from 'next';

import { AppHeader } from '@/components/app-header';
import { MissionJourney } from '@/components/mission-journey';

export const metadata: Metadata = {
  title: 'Perjalanan Belajar',
  description:
    'Pilih misi BISINDO dan lanjutkan perjalanan dari mengenali tanda hingga menggunakannya dalam percakapan.',
};

export default function MissionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader active="journey" />
      <MissionJourney />
    </main>
  );
}
