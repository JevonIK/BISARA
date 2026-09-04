export type MissionStatus = 'completed' | 'current' | 'locked';

export type Mission = {
  id: string;
  number: string;
  title: string;
  description: string;
  duration: number;
  xp: number;
  status: MissionStatus;
  vocabulary: string[];
  href?: string;
  type: 'lesson' | 'checkpoint';
};

export type Chapter = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  status: 'active' | 'locked';
  progress: number;
  missions: Mission[];
};

export const chapters: Chapter[] = [
  {
    id: 'chapter-1',
    number: '01',
    eyebrow: 'Mulai terhubung',
    title: 'Kenalan & sapaan',
    description:
      'Belajar memperkenalkan diri dan memulai percakapan sederhana.',
    status: 'active',
    progress: 60,
    missions: [
      {
        id: 'saya-dan-kamu',
        number: '01',
        title: 'Saya dan kamu',
        description: 'Kenali tanda dasar untuk menyebut diri dan lawan bicara.',
        duration: 6,
        xp: 40,
        status: 'completed',
        vocabulary: ['Saya', 'Siapa', 'Apa'],
        type: 'lesson',
      },
      {
        id: 'sapaan-waktu',
        number: '02',
        title: 'Sapaan berdasarkan waktu',
        description: 'Gunakan tanda waktu saat membuka percakapan.',
        duration: 7,
        xp: 45,
        status: 'completed',
        vocabulary: ['Pagi', 'Siang', 'Sore', 'Malam'],
        type: 'lesson',
      },
      {
        id: 'berkenalan',
        number: '03',
        title: 'Berkenalan dengan teman baru',
        description:
          'Berlatih merespons perkenalan melalui tanda-tanda yang sudah dipelajari.',
        duration: 8,
        xp: 60,
        status: 'current',
        vocabulary: ['Saya', 'Siapa', 'Teman', 'Terima kasih', 'Maaf'],
        href: '/missions/berkenalan',
        type: 'lesson',
      },
      {
        id: 'minta-pengulangan',
        number: '04',
        title: 'Meminta pengulangan',
        description: 'Belajar meminta lawan bicara mengulang secara sopan.',
        duration: 6,
        xp: 45,
        status: 'locked',
        vocabulary: ['Maaf', 'Lagi', 'Bagaimana'],
        type: 'lesson',
      },
      {
        id: 'checkpoint-kenalan',
        number: '05',
        title: 'Tes percakapan kenalan',
        description: 'Terapkan seluruh materi bab tanpa contoh visual.',
        duration: 10,
        xp: 100,
        status: 'locked',
        vocabulary: [],
        type: 'checkpoint',
      },
    ],
  },
  {
    id: 'chapter-2',
    number: '02',
    eyebrow: 'Kebutuhan sehari-hari',
    title: 'Makan & beraktivitas',
    description:
      'Berlatih meminta, menjawab, dan menyampaikan kebutuhan dasar.',
    status: 'locked',
    progress: 0,
    missions: [
      {
        id: 'makan-dan-minum',
        number: '01',
        title: 'Makan dan minum',
        description: 'Sampaikan kebutuhan sederhana saat berada di kafe.',
        duration: 7,
        xp: 45,
        status: 'locked',
        vocabulary: ['Makan', 'Air'],
        type: 'lesson',
      },
      {
        id: 'belajar-dan-mengingat',
        number: '02',
        title: 'Belajar dan mengingat',
        description: 'Gunakan tanda untuk membicarakan aktivitas belajar.',
        duration: 7,
        xp: 45,
        status: 'locked',
        vocabulary: ['Belajar', 'Ingat', 'Hari'],
        type: 'lesson',
      },
      {
        id: 'rencana-hari-ini',
        number: '03',
        title: 'Rencana hari ini',
        description: 'Tanyakan dan jawab aktivitas pada hari tertentu.',
        duration: 8,
        xp: 55,
        status: 'locked',
        vocabulary: ['Hari', 'Kapan', 'Apa'],
        type: 'lesson',
      },
      {
        id: 'datang-dan-berangkat',
        number: '04',
        title: 'Datang dan berangkat',
        description: 'Jelaskan pergerakan dalam percakapan singkat.',
        duration: 7,
        xp: 50,
        status: 'locked',
        vocabulary: ['Datang', 'Berangkat'],
        type: 'lesson',
      },
      {
        id: 'checkpoint-kafe',
        number: '05',
        title: 'Tes percakapan kafe',
        description: 'Selesaikan skenario pemesanan tanpa petunjuk.',
        duration: 10,
        xp: 100,
        status: 'locked',
        vocabulary: [],
        type: 'checkpoint',
      },
    ],
  },
  {
    id: 'chapter-3',
    number: '03',
    eyebrow: 'Bergerak bersama',
    title: 'Arah & transportasi',
    description: 'Gunakan BISINDO saat bertanya arah dan bepergian.',
    status: 'locked',
    progress: 0,
    missions: [
      {
        id: 'mencari-tempat',
        number: '01',
        title: 'Mencari tempat',
        description: 'Tanyakan lokasi dan cari tujuan perjalanan.',
        duration: 8,
        xp: 50,
        status: 'locked',
        vocabulary: ['Di mana', 'Cari', 'Rumah'],
        type: 'lesson',
      },
      {
        id: 'bertanya-arah',
        number: '02',
        title: 'Bertanya arah',
        description: 'Gunakan pertanyaan dasar dalam konteks perjalanan.',
        duration: 8,
        xp: 55,
        status: 'locked',
        vocabulary: ['Di mana', 'Bagaimana', 'Mengapa'],
        type: 'lesson',
      },
      {
        id: 'waktu-perjalanan',
        number: '03',
        title: 'Waktu perjalanan',
        description: 'Bicarakan waktu kedatangan dan keberangkatan.',
        duration: 7,
        xp: 50,
        status: 'locked',
        vocabulary: ['Kapan', 'Datang', 'Berangkat'],
        type: 'lesson',
      },
      {
        id: 'naik-motor',
        number: '04',
        title: 'Pergi dengan motor',
        description: 'Pahami respons sederhana tentang moda perjalanan.',
        duration: 7,
        xp: 50,
        status: 'locked',
        vocabulary: ['Motor', 'Rumah', 'Teman'],
        type: 'lesson',
      },
      {
        id: 'checkpoint-perjalanan',
        number: '05',
        title: 'Tes percakapan perjalanan',
        description: 'Selesaikan skenario bertanya arah tanpa petunjuk.',
        duration: 12,
        xp: 120,
        status: 'locked',
        vocabulary: [],
        type: 'checkpoint',
      },
    ],
  },
];

export const activeMission = chapters[0].missions[2];
