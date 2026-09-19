import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { AlphabetMission } from '@/components/alphabet-mission';
import {
  MissionHeroProgressCard,
  ToastingIllustration,
} from '@/components/mission-learn-hero';
import { MissionSectionNavigation } from '@/components/mission-section-navigation';
import { MissionVocabularyCarousel } from '@/components/mission-vocabulary-carousel';
import { getAlphabetVideosForMission } from '@/lib/alphabet-data';
import { getSigns } from '@/lib/curriculum-data';
import { getChapterForMission, getMission } from '@/lib/learning-data';

export const metadata: Metadata = {
  title: 'Misi Belajar BISINDO • BISARA',
  description:
    'Amati setiap tanda, tirukan, uji pengenalan, dan uji peragaan.',
};

export default async function MissionLearningPage({
  searchParams,
}: {
  searchParams: Promise<{
    mission?: string;
    section?: string;
    replay?: string;
  }>;
}) {
  const { mission: missionId, section, replay } = await searchParams;
  const mission = getMission(missionId);
  const chapter = getChapterForMission(mission.id);
  if (mission.type === 'alphabet' && section && section !== 'amati') {
    return (
      <AlphabetMission
        key={mission.id}
        mission={mission}
        chapter={chapter}
        initialSection={section}
        replay={replay === '1'}
      />
    );
  }
  const missionSigns =
    mission.type === 'alphabet'
      ? getAlphabetVideosForMission(mission.id).map((v) => ({
          id: `letter-${v.letter.toLowerCase()}`,
          label: `Huruf ${v.letter}`,
          category: 'identitas' as const,
          videoSrc: v.videoSrc,
          tips: [
            v.letter === 'J' || v.letter === 'Z'
              ? 'Amati bentuk awal, arah, dan lintasan tangan sepanjang video contoh.'
              : 'Ikuti bentuk jari, arah telapak, dan orientasi tangan sesuai contoh.',
          ],
        }))
      : getSigns(mission.signIds);

  return (
    <main className="min-h-screen bg-[#FFE8A3] pb-44">
      <AppHeader active="home" />
      <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8 lg:py-5">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="size-4" /> Kembali ke beranda
        </Link>

        {/* Hero Card matching Image 0 */}
        <section className="relative mt-4 overflow-hidden rounded-[2.5rem] bg-white p-7 sm:p-10 lg:p-12 border border-amber-200/50 shadow-xs">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_350px] gap-8 items-center">
            {/* Left: Mission Information */}
            <div>
              <span className="inline-block rounded-full bg-[#FFAE00] px-4 py-1 text-xs font-black text-slate-950 shadow-2xs">
                Bab {chapter.number.replace(/^0/, '')} • Misi {mission.number.replace(/^0/, '')}
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-[#E54D2E] block mt-4">
                MISI AKTIF
              </span>
              <h1 className="mt-1.5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                {mission.type === 'alphabet' ? `Huruf ${mission.title}` : mission.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm sm:text-base font-semibold text-slate-600 leading-relaxed">
                {mission.description}
              </p>
            </div>

            {/* Right: Floating Progress Card with Toasting Illustration in background */}
            <div className="relative flex justify-center lg:justify-end items-center">
              <div className="absolute -top-20 -right-6 sm:-right-8 w-80 sm:w-96 h-80 sm:h-96 pointer-events-none select-none overflow-visible hidden sm:block">
                <ToastingIllustration className="size-full" />
              </div>
              <MissionHeroProgressCard missionId={mission.id} />
            </div>
          </div>
        </section>

        {/* Target Pembelajaran & Amati Video Demonstration Carousel */}
        <MissionVocabularyCarousel mission={mission} signs={missionSigns} />
      </div>

      {/* Fixed bottom timeline navigation */}
      <MissionSectionNavigation
        missionId={mission.id}
        section="amati"
        variant="bottom-bar"
      />
    </main>
  );
}
