import MissionTestPage from '@/app/missions/test/page';

export { metadata } from '@/app/missions/test/page';

export default async function BerkenalanTestPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  return (
    <MissionTestPage
      searchParams={Promise.resolve({ ...params, mission: 'berkenalan' })}
    />
  );
}
