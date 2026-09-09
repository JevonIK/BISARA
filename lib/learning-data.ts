import {
  getSigns,
  signIds as allSignIds,
  type SignId,
} from '@/lib/curriculum-data';

export type MissionStatus = 'completed' | 'current' | 'locked';

export type ContextChallenge = {
  id: string;
  cueSignId: SignId;
  prompt: string;
  options: SignId[];
  answer: SignId;
  successMessage: string;
};

export type Mission = {
  id: string;
  number: string;
  title: string;
  description: string;
  duration: number;
  xp: number;
  status: MissionStatus;
  signIds: SignId[];
  vocabulary: string[];
  href: string;
  type: 'lesson' | 'checkpoint';
  contextTitle: string;
  contextChallenges: ContextChallenge[];
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

type MissionInput = Omit<
  Mission,
  'status' | 'vocabulary' | 'href' | 'contextChallenges'
> & {
  contextChallenges: Array<Omit<ContextChallenge, 'id'> & { id?: string }>;
};

function mission(input: MissionInput): Mission {
  return {
    ...input,
    status: 'locked',
    vocabulary: getSigns(input.signIds).map((sign) => sign.label),
    href: `/missions/learn?mission=${input.id}`,
    contextChallenges: input.contextChallenges.map((challenge, index) => ({
      ...challenge,
      id: challenge.id ?? `${input.id}-context-${index + 1}`,
    })),
  };
}

const checkpoint = (
  id: string,
  number: string,
  title: string,
  description: string,
  signIds: SignId[],
  contextTitle: string,
  contextChallenges: MissionInput['contextChallenges'],
  xp = 100,
) =>
  mission({
    id,
    number,
    title,
    description,
    signIds,
    contextTitle,
    contextChallenges,
    xp,
    duration: 12,
    type: 'checkpoint',
  });

export const chapters: Chapter[] = [
  {
    id: 'chapter-1',
    number: '01',
    eyebrow: 'Mulai terhubung',
    title: 'Kenalan & sapaan',
    description:
      'Belajar memperkenalkan diri dan memulai percakapan sederhana.',
    status: 'active',
    progress: 0,
    missions: [
      mission({
        id: 'saya-dan-kamu',
        number: '01',
        title: 'Saya dan pertanyaan dasar',
        description: 'Kenali tanda untuk menyebut diri dan membuka pertanyaan.',
        duration: 8,
        xp: 40,
        type: 'lesson',
        signIds: ['saya', 'siapa', 'apa'],
        contextTitle: 'Memulai perkenalan',
        contextChallenges: [
          {
            cueSignId: 'siapa',
            prompt:
              'Seseorang menanyakan identitasmu. Tanda mana yang tepat untuk mulai menjawab?',
            options: ['saya', 'apa', 'siapa'],
            answer: 'saya',
            successMessage: 'Kamu merespons dengan memperkenalkan diri.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Kamu belum memahami hal yang dibicarakan. Pilih tanda untuk menanyakan halnya.',
            options: ['apa', 'saya', 'siapa'],
            answer: 'apa',
            successMessage: 'Pertanyaanmu sesuai dengan konteks.',
          },
        ],
      }),
      mission({
        id: 'sapaan-waktu',
        number: '02',
        title: 'Sapaan berdasarkan waktu',
        description: 'Gunakan tanda waktu saat membuka percakapan.',
        duration: 9,
        xp: 45,
        type: 'lesson',
        signIds: ['pagi', 'siang', 'sore', 'malam'],
        contextTitle: 'Memilih waktu yang tepat',
        contextChallenges: [
          {
            cueSignId: 'pagi',
            prompt:
              'Matahari baru terbit dan kamu bertemu teman. Pilih tanda waktunya.',
            options: ['pagi', 'sore', 'malam'],
            answer: 'pagi',
            successMessage: 'Sapaanmu sesuai dengan waktu.',
          },
          {
            cueSignId: 'malam',
            prompt:
              'Pertemuan berlangsung setelah matahari terbenam. Pilih tanda waktunya.',
            options: ['siang', 'malam', 'pagi'],
            answer: 'malam',
            successMessage: 'Kamu memilih konteks waktu dengan tepat.',
          },
        ],
      }),
      mission({
        id: 'berkenalan',
        number: '03',
        title: 'Berkenalan dengan teman baru',
        description: 'Berlatih merespons perkenalan dengan sopan.',
        duration: 12,
        xp: 60,
        type: 'lesson',
        signIds: ['saya', 'siapa', 'teman', 'terima-kasih', 'maaf'],
        contextTitle: 'Percakapan dengan teman baru',
        contextChallenges: [
          {
            cueSignId: 'siapa',
            prompt:
              'Teman baru menanyakan identitasmu. Pilih pembuka jawaban yang sesuai.',
            options: ['saya', 'maaf', 'terima-kasih'],
            answer: 'saya',
            successMessage:
              'Teman baru memahami bahwa kamu sedang memperkenalkan diri.',
          },
          {
            cueSignId: 'teman',
            prompt:
              'Teman baru menyambutmu. Pilih respons yang menjaga interaksi tetap sopan.',
            options: ['terima-kasih', 'siapa', 'maaf'],
            answer: 'terima-kasih',
            successMessage: 'Percakapan berlanjut dengan ramah.',
          },
        ],
      }),
      mission({
        id: 'minta-pengulangan',
        number: '04',
        title: 'Meminta pengulangan',
        description:
          'Minta lawan bicara mengulang atau menjelaskan secara sopan.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['maaf', 'lagi', 'bagaimana'],
        contextTitle: 'Memperbaiki komunikasi',
        contextChallenges: [
          {
            cueSignId: 'maaf',
            prompt:
              'Kamu belum menangkap pesan. Setelah meminta maaf, tanda mana yang meminta pengulangan?',
            options: ['lagi', 'bagaimana', 'maaf'],
            answer: 'lagi',
            successMessage: 'Kamu meminta pengulangan dengan jelas.',
          },
          {
            cueSignId: 'bagaimana',
            prompt:
              'Kamu ingin tahu cara melakukan sesuatu. Pilih tanda pertanyaan yang tepat.',
            options: ['bagaimana', 'lagi', 'maaf'],
            answer: 'bagaimana',
            successMessage: 'Kamu memilih bentuk pertanyaan yang sesuai.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-kenalan',
        '05',
        'Checkpoint kenalan & sapaan',
        'Gabungkan seluruh materi bab tanpa contoh visual.',
        [
          'saya',
          'siapa',
          'apa',
          'pagi',
          'siang',
          'sore',
          'malam',
          'teman',
          'terima-kasih',
          'maaf',
          'lagi',
          'bagaimana',
        ],
        'Simulasi perkenalan utuh',
        [
          {
            cueSignId: 'siapa',
            prompt: 'Jawab pertanyaan identitas secara langsung.',
            options: ['saya', 'teman', 'apa'],
            answer: 'saya',
            successMessage: 'Pembuka perkenalanmu tepat.',
          },
          {
            cueSignId: 'maaf',
            prompt: 'Pesan belum jelas. Minta lawan bicara mengulang.',
            options: ['lagi', 'malam', 'teman'],
            answer: 'lagi',
            successMessage: 'Kamu berhasil memulihkan percakapan.',
          },
          {
            cueSignId: 'teman',
            prompt: 'Tutup perkenalan dengan respons sopan.',
            options: ['terima-kasih', 'siapa', 'pagi'],
            answer: 'terima-kasih',
            successMessage: 'Simulasi kenalan selesai.',
          },
        ],
      ),
    ],
  },
  {
    id: 'chapter-2',
    number: '02',
    eyebrow: 'Kebutuhan sehari-hari',
    title: 'Makan & beraktivitas',
    description: 'Berlatih menyampaikan kebutuhan dan rencana dasar.',
    status: 'locked',
    progress: 0,
    missions: [
      mission({
        id: 'makan-dan-minum',
        number: '01',
        title: 'Makan dan minum',
        description: 'Sampaikan kebutuhan sederhana saat berada di kafe.',
        duration: 7,
        xp: 45,
        type: 'lesson',
        signIds: ['makan', 'air'],
        contextTitle: 'Memesan kebutuhan dasar',
        contextChallenges: [
          {
            cueSignId: 'makan',
            prompt:
              'Kamu ingin menyampaikan kebutuhan setelah melihat menu. Pilih tanda yang sesuai.',
            options: ['makan', 'air', 'belajar'],
            answer: 'makan',
            successMessage: 'Kebutuhanmu tersampaikan.',
          },
          {
            cueSignId: 'air',
            prompt: 'Kamu haus. Pilih tanda kebutuhan yang tepat.',
            options: ['air', 'makan', 'hari'],
            answer: 'air',
            successMessage: 'Kamu memilih kebutuhan minum dengan tepat.',
          },
        ],
      }),
      mission({
        id: 'belajar-dan-mengingat',
        number: '02',
        title: 'Belajar dan mengingat',
        description: 'Bicarakan aktivitas belajar dan hal yang diingat.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['belajar', 'ingat', 'hari'],
        contextTitle: 'Membicarakan kegiatan',
        contextChallenges: [
          {
            cueSignId: 'belajar',
            prompt:
              'Teman menanyakan kegiatanmu hari ini. Pilih kegiatan yang sesuai.',
            options: ['belajar', 'ingat', 'hari'],
            answer: 'belajar',
            successMessage: 'Kegiatanmu tersampaikan.',
          },
          {
            cueSignId: 'ingat',
            prompt:
              'Kamu ingin memastikan teman tidak melupakan rencana. Pilih tanda kuncinya.',
            options: ['ingat', 'hari', 'belajar'],
            answer: 'ingat',
            successMessage: 'Pesan pengingatmu jelas.',
          },
        ],
      }),
      mission({
        id: 'rencana-hari-ini',
        number: '03',
        title: 'Rencana hari ini',
        description: 'Tanyakan kegiatan dan waktunya.',
        duration: 8,
        xp: 55,
        type: 'lesson',
        signIds: ['hari', 'kapan', 'apa'],
        contextTitle: 'Menyusun rencana',
        contextChallenges: [
          {
            cueSignId: 'kapan',
            prompt:
              'Kamu ingin mengetahui waktu kegiatan. Pilih kata tanya yang tepat.',
            options: ['kapan', 'apa', 'hari'],
            answer: 'kapan',
            successMessage: 'Kamu menanyakan waktu secara tepat.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Kamu ingin mengetahui jenis kegiatannya. Pilih tanda pertanyaan.',
            options: ['apa', 'kapan', 'hari'],
            answer: 'apa',
            successMessage:
              'Pertanyaanmu sesuai dengan informasi yang dibutuhkan.',
          },
        ],
      }),
      mission({
        id: 'datang-dan-berangkat',
        number: '04',
        title: 'Datang dan berangkat',
        description: 'Jelaskan arah perpindahan dalam percakapan singkat.',
        duration: 7,
        xp: 50,
        type: 'lesson',
        signIds: ['datang', 'berangkat'],
        contextTitle: 'Memberi kabar perjalanan',
        contextChallenges: [
          {
            cueSignId: 'datang',
            prompt:
              'Kamu bergerak menuju lokasi teman. Pilih tanda yang menyatakan tiba.',
            options: ['datang', 'berangkat', 'hari'],
            answer: 'datang',
            successMessage: 'Arah perpindahanmu jelas.',
          },
          {
            cueSignId: 'berangkat',
            prompt: 'Kamu hendak meninggalkan lokasi. Pilih tanda yang sesuai.',
            options: ['berangkat', 'datang', 'makan'],
            answer: 'berangkat',
            successMessage: 'Kamu menyatakan keberangkatan dengan tepat.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-aktivitas',
        '05',
        'Checkpoint kebutuhan & aktivitas',
        'Selesaikan skenario kebutuhan dan rencana tanpa petunjuk.',
        [
          'makan',
          'air',
          'belajar',
          'ingat',
          'hari',
          'kapan',
          'apa',
          'datang',
          'berangkat',
        ],
        'Rencana bertemu di kafe',
        [
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan waktu bertemu. Pilih unsur waktu yang tepat.',
            options: ['hari', 'makan', 'ingat'],
            answer: 'hari',
            successMessage: 'Kamu memberi konteks waktu.',
          },
          {
            cueSignId: 'makan',
            prompt: 'Pilih kebutuhan minum untuk melengkapi pesanan.',
            options: ['air', 'belajar', 'datang'],
            answer: 'air',
            successMessage: 'Pesananmu lengkap.',
          },
          {
            cueSignId: 'berangkat',
            prompt: 'Teman sudah pergi menuju lokasi. Pilih tanda kedatangan.',
            options: ['datang', 'ingat', 'apa'],
            answer: 'datang',
            successMessage: 'Skenario aktivitas selesai.',
          },
        ],
      ),
    ],
  },
  {
    id: 'chapter-3',
    number: '03',
    eyebrow: 'Bergerak bersama',
    title: 'Arah & transportasi',
    description: 'Gunakan BISINDO saat mencari tempat dan bepergian.',
    status: 'locked',
    progress: 0,
    missions: [
      mission({
        id: 'mencari-tempat',
        number: '01',
        title: 'Mencari tempat',
        description: 'Tanyakan lokasi dan cari tujuan perjalanan.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['di-mana', 'cari', 'rumah'],
        contextTitle: 'Mencari tujuan',
        contextChallenges: [
          {
            cueSignId: 'di-mana',
            prompt:
              'Kamu belum mengetahui lokasi tujuan. Pilih tindakan yang sesuai.',
            options: ['cari', 'rumah', 'di-mana'],
            answer: 'cari',
            successMessage: 'Kamu mulai mencari tujuan.',
          },
          {
            cueSignId: 'rumah',
            prompt:
              'Tujuan yang dimaksud adalah tempat tinggal. Pilih tandanya.',
            options: ['rumah', 'cari', 'di-mana'],
            answer: 'rumah',
            successMessage: 'Tujuanmu sudah jelas.',
          },
        ],
      }),
      mission({
        id: 'bertanya-arah',
        number: '02',
        title: 'Bertanya arah',
        description: 'Gunakan pertanyaan dasar dalam konteks perjalanan.',
        duration: 8,
        xp: 55,
        type: 'lesson',
        signIds: ['di-mana', 'bagaimana', 'mengapa'],
        contextTitle: 'Meminta petunjuk',
        contextChallenges: [
          {
            cueSignId: 'di-mana',
            prompt:
              'Kamu tahu tujuan tetapi belum tahu cara mencapainya. Pilih kata tanya.',
            options: ['bagaimana', 'mengapa', 'di-mana'],
            answer: 'bagaimana',
            successMessage: 'Kamu meminta cara menuju lokasi.',
          },
          {
            cueSignId: 'mengapa',
            prompt:
              'Rute berubah dan kamu ingin mengetahui alasannya. Pilih kata tanya.',
            options: ['mengapa', 'bagaimana', 'di-mana'],
            answer: 'mengapa',
            successMessage: 'Kamu menanyakan alasan dengan tepat.',
          },
        ],
      }),
      mission({
        id: 'waktu-perjalanan',
        number: '03',
        title: 'Waktu perjalanan',
        description: 'Bicarakan waktu kedatangan dan keberangkatan.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['kapan', 'datang', 'berangkat'],
        contextTitle: 'Mengatur perjalanan',
        contextChallenges: [
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan waktu kamu tiba. Pilih tanda gerak yang melengkapi pertanyaan.',
            options: ['datang', 'berangkat', 'kapan'],
            answer: 'datang',
            successMessage: 'Pertanyaan kedatangan tersusun dengan tepat.',
          },
          {
            cueSignId: 'berangkat',
            prompt: 'Kamu ingin menanyakan waktu pergi. Pilih kata tanya.',
            options: ['kapan', 'datang', 'berangkat'],
            answer: 'kapan',
            successMessage: 'Kamu menanyakan jadwal keberangkatan.',
          },
        ],
      }),
      mission({
        id: 'naik-motor',
        number: '04',
        title: 'Pergi dengan motor',
        description: 'Bicarakan moda, tujuan, dan teman perjalanan.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['motor', 'rumah', 'teman'],
        contextTitle: 'Memilih moda perjalanan',
        contextChallenges: [
          {
            cueSignId: 'rumah',
            prompt:
              'Kamu akan pergi ke rumah menggunakan kendaraan roda dua. Pilih modanya.',
            options: ['motor', 'teman', 'rumah'],
            answer: 'motor',
            successMessage: 'Moda perjalananmu jelas.',
          },
          {
            cueSignId: 'teman',
            prompt: 'Seseorang akan menemanimu. Pilih hubungan orang tersebut.',
            options: ['teman', 'rumah', 'motor'],
            answer: 'teman',
            successMessage: 'Teman perjalananmu sudah disebutkan.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-perjalanan',
        '05',
        'Checkpoint arah & perjalanan',
        'Selesaikan skenario bertanya arah tanpa petunjuk.',
        [
          'di-mana',
          'cari',
          'rumah',
          'bagaimana',
          'mengapa',
          'kapan',
          'datang',
          'berangkat',
          'motor',
          'teman',
        ],
        'Perjalanan dari awal sampai tiba',
        [
          {
            cueSignId: 'di-mana',
            prompt: 'Pilih tujuan tempat tinggal.',
            options: ['rumah', 'motor', 'teman'],
            answer: 'rumah',
            successMessage: 'Tujuan ditemukan.',
          },
          {
            cueSignId: 'bagaimana',
            prompt: 'Pilih moda yang tersedia untuk perjalanan.',
            options: ['motor', 'cari', 'mengapa'],
            answer: 'motor',
            successMessage: 'Moda perjalanan dipilih.',
          },
          {
            cueSignId: 'kapan',
            prompt: 'Pilih tanda yang menyatakan tiba.',
            options: ['datang', 'berangkat', 'di-mana'],
            answer: 'datang',
            successMessage: 'Simulasi perjalanan selesai.',
          },
        ],
        120,
      ),
    ],
  },
  {
    id: 'chapter-4',
    number: '04',
    eyebrow: 'Memperluas percakapan',
    title: 'Keluarga, warna & identitas',
    description:
      'Lengkapi kosakata untuk membicarakan rumah, warna, dan cara berkomunikasi.',
    status: 'locked',
    progress: 0,
    missions: [
      mission({
        id: 'keluarga-dan-rumah',
        number: '01',
        title: 'Keluarga dan rumah',
        description: 'Bicarakan orang terdekat dan tempat tinggal.',
        duration: 8,
        xp: 55,
        type: 'lesson',
        signIds: ['keluarga', 'rumah', 'teman'],
        contextTitle: 'Bercerita tentang orang terdekat',
        contextChallenges: [
          {
            cueSignId: 'rumah',
            prompt:
              'Siapa yang tinggal bersamamu? Pilih kelompok orang terdekat.',
            options: ['keluarga', 'teman', 'rumah'],
            answer: 'keluarga',
            successMessage: 'Kamu menyebut keluarga dengan tepat.',
          },
          {
            cueSignId: 'teman',
            prompt:
              'Orang yang datang bukan anggota keluarga. Pilih hubungannya.',
            options: ['teman', 'keluarga', 'rumah'],
            answer: 'teman',
            successMessage: 'Hubungan orang dalam cerita sudah jelas.',
          },
        ],
      }),
      mission({
        id: 'warna-dasar',
        number: '02',
        title: 'Empat warna dasar',
        description: 'Kenali dan bedakan merah, kuning, hijau, dan hitam.',
        duration: 10,
        xp: 60,
        type: 'lesson',
        signIds: ['merah', 'kuning', 'hijau', 'hitam'],
        contextTitle: 'Mendeskripsikan benda',
        contextChallenges: [
          {
            cueSignId: 'merah',
            prompt: 'Pilih warna yang sama dengan tanda pada video.',
            options: ['merah', 'kuning', 'hitam'],
            answer: 'merah',
            successMessage: 'Warna pertama dikenali.',
          },
          {
            cueSignId: 'hijau',
            prompt: 'Pilih warna yang sama dengan tanda pada video.',
            options: ['hijau', 'hitam', 'kuning'],
            answer: 'hijau',
            successMessage: 'Kamu membedakan warna dengan tepat.',
          },
        ],
      }),
      mission({
        id: 'dengar-dan-tuli',
        number: '03',
        title: 'Dengar dan Tuli',
        description: 'Kenali kosakata identitas dan cara menerima informasi.',
        duration: 8,
        xp: 60,
        type: 'lesson',
        signIds: ['dengar', 'tuli', 'bagaimana'],
        contextTitle: 'Menghormati cara berkomunikasi',
        contextChallenges: [
          {
            cueSignId: 'tuli',
            prompt:
              'Seseorang memperkenalkan identitasnya. Pilih tanda identitas yang sama.',
            options: ['tuli', 'dengar', 'bagaimana'],
            answer: 'tuli',
            successMessage: 'Kamu mengenali identitas yang disampaikan.',
          },
          {
            cueSignId: 'bagaimana',
            prompt:
              'Kamu ingin menanyakan cara komunikasi yang nyaman. Pilih kata tanya.',
            options: ['bagaimana', 'dengar', 'tuli'],
            answer: 'bagaimana',
            successMessage:
              'Pertanyaanmu berpusat pada kebutuhan lawan bicara.',
          },
        ],
      }),
      mission({
        id: 'deskripsi-sekitar',
        number: '04',
        title: 'Mendeskripsikan sekitar',
        description: 'Gabungkan orang, tempat, warna, dan pertanyaan.',
        duration: 9,
        xp: 60,
        type: 'lesson',
        signIds: ['apa', 'rumah', 'keluarga', 'merah', 'hitam'],
        contextTitle: 'Menyusun deskripsi sederhana',
        contextChallenges: [
          {
            cueSignId: 'apa',
            prompt:
              'Benda yang ditanyakan berada di tempat tinggal. Pilih tandanya.',
            options: ['rumah', 'keluarga', 'merah'],
            answer: 'rumah',
            successMessage: 'Konteks tempat sudah tepat.',
          },
          {
            cueSignId: 'hitam',
            prompt: 'Pilih warna pembanding yang tersedia dalam misi.',
            options: ['merah', 'keluarga', 'rumah'],
            answer: 'merah',
            successMessage: 'Kamu dapat membandingkan dua warna.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-komunikasi',
        '05',
        'Checkpoint komunikasi lengkap',
        'Uji keseluruhan 32 tanda melalui pengenalan terpilih dan skenario campuran.',
        [...allSignIds],
        'Percakapan di rumah',
        [
          {
            cueSignId: 'rumah',
            prompt: 'Pilih orang terdekat yang tinggal bersama.',
            options: ['keluarga', 'teman', 'dengar'],
            answer: 'keluarga',
            successMessage: 'Hubungan dan tempat sudah sesuai.',
          },
          {
            cueSignId: 'apa',
            prompt: 'Pilih salah satu warna yang dipelajari.',
            options: ['kuning', 'tuli', 'rumah'],
            answer: 'kuning',
            successMessage: 'Deskripsi warna berhasil.',
          },
          {
            cueSignId: 'tuli',
            prompt:
              'Pilih kata tanya untuk mengetahui cara komunikasi yang nyaman.',
            options: ['bagaimana', 'hitam', 'teman'],
            answer: 'bagaimana',
            successMessage:
              'Kamu menyelesaikan kurikulum dasar dengan konteks yang menghormati lawan bicara.',
          },
        ],
        150,
      ),
    ],
  },
];

export const allMissions = chapters.flatMap((chapter) => chapter.missions);
export const missionIds = allMissions.map((item) => item.id);

export function getMission(missionId?: string) {
  return allMissions.find((item) => item.id === missionId) ?? allMissions[0];
}

export function getChapterForMission(missionId: string) {
  return (
    chapters.find((chapter) =>
      chapter.missions.some((item) => item.id === missionId),
    ) ?? chapters[0]
  );
}

export function getMissionPosition(missionId: string) {
  return allMissions.findIndex((item) => item.id === missionId);
}

export const activeMission = getMission('berkenalan');
