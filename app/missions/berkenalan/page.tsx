import MissionLearningPage from '@/app/missions/learn/page';

export { metadata } from '@/app/missions/learn/page';

export default function BerkenalanPage() {
  return (
    <MissionLearningPage
      searchParams={Promise.resolve({ mission: 'berkenalan' })}
    />
  );
}
