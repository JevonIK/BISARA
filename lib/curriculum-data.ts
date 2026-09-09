export type SignDefinition = {
  id: string;
  label: string;
  datasetLabel: number;
  videoSrc: string;
  focus: string;
  note: string;
};

const signRows = [
  [
    'air',
    'Air',
    0,
    'Orientasi telapak',
    'Jaga arah telapak dan lintasan tetap terbaca dari awal sampai akhir.',
  ],
  [
    'belajar',
    'Belajar',
    1,
    'Koordinasi tangan',
    'Perhatikan hubungan kedua tangan dan ulangi ritme gerak secara utuh.',
  ],
  [
    'cari',
    'Cari',
    2,
    'Arah gerakan',
    'Ikuti arah gerak tanpa memotong bagian awal atau akhir tanda.',
  ],
  [
    'hari',
    'Hari',
    3,
    'Posisi terhadap tubuh',
    'Pertahankan tinggi tangan dan jaraknya terhadap tubuh.',
  ],
  [
    'ingat',
    'Ingat',
    4,
    'Titik akhir',
    'Jaga bentuk tangan ketika mencapai titik akhir tanda.',
  ],
  [
    'lagi',
    'Lagi',
    5,
    'Pengulangan gerak',
    'Tiru jumlah pengulangan dan tempo pada demonstrasi.',
  ],
  [
    'maaf',
    'Maaf',
    6,
    'Orientasi telapak',
    'Bandingkan arah telapak pada awal dan akhir demonstrasi.',
  ],
  [
    'makan',
    'Makan',
    7,
    'Posisi terhadap wajah',
    'Jaga bentuk tangan dan titik gerak di dekat wajah.',
  ],
  [
    'motor',
    'Motor',
    8,
    'Koordinasi tangan',
    'Pertahankan jarak kedua tangan dan gerakkan secara serempak.',
  ],
  [
    'saya',
    'Saya',
    9,
    'Posisi terhadap tubuh',
    'Jaga telapak menghadap tubuh dan pertahankan titik akhir di dada.',
  ],
  [
    'terima-kasih',
    'Terima kasih',
    10,
    'Arah gerakan',
    'Ikuti titik awal, arah, dan titik akhir gerakan secara utuh.',
  ],
  [
    'tuli',
    'Tuli',
    11,
    'Posisi terhadap wajah',
    'Perhatikan titik sentuh dan perpindahan tangan di sekitar wajah.',
  ],
  [
    'apa',
    'Apa',
    12,
    'Bentuk tangan',
    'Pertahankan bentuk jari dan ruang gerak di depan tubuh.',
  ],
  [
    'siapa',
    'Siapa',
    13,
    'Bentuk tangan',
    'Pertahankan bentuk jari selama gerakan dan beri ruang di depan tubuh.',
  ],
  [
    'kapan',
    'Kapan',
    14,
    'Lintasan gerak',
    'Ikuti lintasan tangan dan pertahankan tempo yang stabil.',
  ],
  [
    'di-mana',
    'Di mana',
    15,
    'Ruang gerak',
    'Gunakan ruang gerak yang sama dengan demonstrasi.',
  ],
  [
    'mengapa',
    'Mengapa',
    16,
    'Perubahan bentuk tangan',
    'Perhatikan perubahan bentuk jari dari awal hingga akhir.',
  ],
  [
    'bagaimana',
    'Bagaimana',
    17,
    'Koordinasi tangan',
    'Mulai dengan kedua tangan siap dan selesaikan gerak bersama.',
  ],
  [
    'merah',
    'Merah',
    18,
    'Posisi terhadap wajah',
    'Pertahankan titik gerak dan bentuk jari di dekat wajah.',
  ],
  [
    'kuning',
    'Kuning',
    19,
    'Bentuk tangan',
    'Jaga bentuk tangan tetap konsisten sepanjang gerakan.',
  ],
  [
    'hijau',
    'Hijau',
    20,
    'Orientasi telapak',
    'Perhatikan arah telapak dan sumbu putaran tangan.',
  ],
  [
    'hitam',
    'Hitam',
    21,
    'Lintasan gerak',
    'Ikuti lintasan pendek secara presisi tanpa gerak tambahan.',
  ],
  [
    'dengar',
    'Dengar',
    22,
    'Posisi terhadap wajah',
    'Jaga jarak dan titik akhir tangan di sekitar telinga.',
  ],
  [
    'berangkat',
    'Berangkat',
    23,
    'Arah gerakan',
    'Tiru arah menjauh serta titik awal dan akhir tanda.',
  ],
  [
    'datang',
    'Datang',
    24,
    'Arah gerakan',
    'Tiru arah mendekat dan selesaikan tanda pada posisi yang sama.',
  ],
  [
    'teman',
    'Teman',
    25,
    'Koordinasi tangan',
    'Perhatikan hubungan gerak kedua tangan dari awal sampai akhir.',
  ],
  [
    'keluarga',
    'Keluarga',
    26,
    'Koordinasi tangan',
    'Pertahankan bentuk dan jarak kedua tangan selama gerakan.',
  ],
  [
    'rumah',
    'Rumah',
    27,
    'Bentuk tangan',
    'Bentuk batas gerak dengan jelas dan pertahankan simetri.',
  ],
  [
    'pagi',
    'Pagi',
    28,
    'Posisi terhadap tubuh',
    'Perhatikan titik awal di tubuh dan arah gerak tangan.',
  ],
  [
    'siang',
    'Siang',
    29,
    'Orientasi telapak',
    'Pertahankan arah telapak saat tangan berpindah posisi.',
  ],
  [
    'sore',
    'Sore',
    30,
    'Sudut lengan',
    'Tiru sudut lengan dan ketinggian tangan pada contoh.',
  ],
  [
    'malam',
    'Malam',
    31,
    'Koordinasi tangan',
    'Jaga hubungan kedua tangan dan selesaikan pada titik yang sama.',
  ],
] as const;

export type SignId = (typeof signRows)[number][0];

function sourceFor(datasetLabel: number) {
  const signer = datasetLabel <= 11 ? 0 : datasetLabel <= 25 ? 1 : 2;
  return `/media/wl-bisindo/signer${signer}_label${datasetLabel}_sample3.mp4`;
}

export const signs = signRows.map(([id, label, datasetLabel, focus, note]) => ({
  id,
  label,
  datasetLabel,
  videoSrc: sourceFor(datasetLabel),
  focus,
  note,
})) as readonly (SignDefinition & { id: SignId })[];

export const signIds = signs.map((sign) => sign.id) as SignId[];

export function isSignId(value: string): value is SignId {
  return signIds.includes(value as SignId);
}

export function getSign(value?: string) {
  return signs.find((sign) => sign.id === value) ?? signs[0];
}

export function getSigns(ids: readonly SignId[]) {
  return ids.map((id) => signs.find((sign) => sign.id === id)!).filter(Boolean);
}

export function versionedSignVideo(src: string) {
  return `${src}?v=20260909-curriculum`;
}
