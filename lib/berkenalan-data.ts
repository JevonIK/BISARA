import { getSigns, type SignId } from '@/lib/curriculum-data';

export const berkenalanSignIds = [
  'saya',
  'siapa',
  'teman',
  'terima-kasih',
  'maaf',
] as const satisfies readonly SignId[];

export const berkenalanSigns = getSigns(berkenalanSignIds);

export type BerkenalanSign = (typeof berkenalanSigns)[number];
export type BerkenalanSignId = (typeof berkenalanSignIds)[number];

export function isBerkenalanSignId(value: string): value is BerkenalanSignId {
  return berkenalanSignIds.includes(value as BerkenalanSignId);
}

export function getBerkenalanSign(value?: string) {
  return (
    berkenalanSigns.find((sign) => sign.id === value) ?? berkenalanSigns[0]
  );
}

export { versionedSignVideo } from '@/lib/curriculum-data';
