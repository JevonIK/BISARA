import PracticePage from '@/app/missions/practice/page';

export { metadata } from '@/app/missions/practice/page';

export default async function BerkenalanPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ sign?: string; source?: string }>;
}) {
  const params = await searchParams;
  return (
    <PracticePage
      searchParams={Promise.resolve({ ...params, mission: 'berkenalan' })}
    />
  );
}
