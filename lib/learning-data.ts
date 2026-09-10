import {
  getSigns,
  signIds as allSignIds,
  type SignId,
} from '@/lib/curriculum-data';

export type MissionStatus = 'completed' | 'current' | 'locked';

export type ContextChallenge = {
  id: string;
  cueSignId: SignId;
  questionTitle?: string;
  prompt: string;
  options: SignId[];
  optionDescriptions?: Partial<Record<SignId, string>>;
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

export type RecognitionQuestion = {
  signId: SignId;
  options: SignId[];
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
    title: 'Perkenalan & waktu',
    description:
      'Bangun kosakata dasar untuk memperkenalkan diri, bertanya, dan menyebut waktu.',
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
            cueSignId: 'saya',
            prompt:
              'Lawan bicara menunjuk dirinya, tetapi topiknya belum jelas. Pilih tanda untuk menanyakan halnya.',
            options: ['apa', 'saya', 'siapa'],
            answer: 'apa',
            successMessage: 'Pertanyaanmu sesuai dengan konteks.',
          },
        ],
      }),
      mission({
        id: 'sapaan-waktu',
        number: '02',
        title: 'Waktu dalam sehari',
        description:
          'Bedakan tanda pagi, siang, sore, dan malam dalam situasi harian.',
        duration: 9,
        xp: 45,
        type: 'lesson',
        signIds: ['pagi', 'siang', 'sore', 'malam'],
        contextTitle: 'Memilih waktu yang tepat',
        contextChallenges: [
          {
            cueSignId: 'apa',
            prompt:
              'Lawan bicara menanyakan waktu ketika matahari baru terbit. Pilih jawaban satu tanda.',
            options: ['pagi', 'sore', 'malam'],
            answer: 'pagi',
            successMessage: 'Pagi adalah jawaban yang sesuai untuk awal hari.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Lawan bicara menanyakan waktu setelah matahari terbenam. Pilih jawaban satu tanda.',
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
              'Lawan bicara menyadari isyaratnya terlalu cepat dan meminta maaf. Tanda apa yang kamu gunakan untuk memintanya mengulang sekali lagi?',
            options: ['lagi', 'bagaimana', 'maaf'],
            optionDescriptions: {
              lagi: 'Minta lawan bicara mengulang isyarat',
              bagaimana: 'Tanyakan cara melakukannya',
              maaf: 'Sampaikan permintaan maaf kembali',
            },
            answer: 'lagi',
            successMessage:
              'Tepat! Kamu merespons dengan isyarat "Lagi" untuk meminta lawan bicara mengulang dengan sopan.',
          },
          {
            cueSignId: 'apa',
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
        'Checkpoint perkenalan & waktu',
        'Ambil kembali kosakata bab dari ingatan dan terapkan pada situasi singkat.',
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
        'Penerapan perkenalan singkat',
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
            cueSignId: 'apa',
            prompt:
              'Petugas kafe menanyakan kebutuhanmu. Kamu sedang lapar; pilih jawaban satu tanda.',
            options: ['makan', 'air', 'belajar'],
            answer: 'makan',
            successMessage: 'Kebutuhanmu tersampaikan.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Petugas kafe menanyakan kebutuhanmu. Kamu sedang haus; pilih jawaban satu tanda.',
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
            cueSignId: 'apa',
            prompt:
              'Teman menanyakan kegiatanmu. Kamu sedang mempelajari materi; pilih jawaban intinya.',
            options: ['belajar', 'ingat', 'hari'],
            answer: 'belajar',
            successMessage: 'Kegiatanmu tersampaikan.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Kamu ingin mengingatkan teman agar rencana tidak terlupakan. Pilih tanda intinya.',
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
            cueSignId: 'hari',
            prompt:
              'Teman baru menyebut ada kegiatan pada suatu hari, tetapi waktunya belum jelas. Pilih kata tanya.',
            options: ['kapan', 'apa', 'hari'],
            answer: 'kapan',
            successMessage: 'Kamu menanyakan waktu secara tepat.',
          },
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menyebut waktu, tetapi belum menyebut jenis kegiatannya. Pilih kata tanya.',
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
        description: 'Bedakan arah gerak pada tanda Datang dan Berangkat.',
        duration: 7,
        xp: 50,
        type: 'lesson',
        signIds: ['datang', 'berangkat'],
        contextTitle: 'Memberi kabar perjalanan',
        contextChallenges: [
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan kapan kamu bergerak menuju lokasinya. Pilih arah gerak yang sesuai.',
            options: ['datang', 'berangkat', 'hari'],
            answer: 'datang',
            successMessage: 'Arah perpindahanmu jelas.',
          },
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan kapan kamu meninggalkan lokasi asal. Pilih arah gerak yang sesuai.',
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
        'Ambil kembali sampel kosakata bab dan terapkan pada kebutuhan serta rencana.',
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
    description: 'Latih kosakata BISINDO untuk mencari tempat dan bepergian.',
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
            cueSignId: 'rumah',
            prompt:
              'Kamu perlu menemukan alamat rumah yang ditunjukkan lawan bicara. Pilih tindakan intinya.',
            options: ['cari', 'rumah', 'di-mana'],
            answer: 'cari',
            successMessage: 'Kamu mulai mencari tujuan.',
          },
          {
            cueSignId: 'di-mana',
            prompt:
              'Lawan bicara menanyakan lokasi tujuanmu. Tujuanmu adalah tempat tinggal; pilih jawaban.',
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
            cueSignId: 'rumah',
            prompt:
              'Tujuannya rumah, tetapi kamu belum tahu cara mencapainya. Pilih kata tanya.',
            options: ['bagaimana', 'mengapa', 'di-mana'],
            answer: 'bagaimana',
            successMessage: 'Kamu meminta cara menuju lokasi.',
          },
          {
            cueSignId: 'berangkat',
            prompt:
              'Teman mengubah rute setelah berangkat dan kamu ingin tahu alasannya. Pilih kata tanya.',
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
            cueSignId: 'bagaimana',
            prompt:
              'Teman menanyakan cara kamu pergi ke rumah. Kamu memakai kendaraan roda dua; pilih jawaban.',
            options: ['motor', 'teman', 'rumah'],
            answer: 'motor',
            successMessage: 'Moda perjalananmu jelas.',
          },
          {
            cueSignId: 'siapa',
            prompt:
              'Lawan bicara menanyakan siapa yang menemanimu. Orang itu bukan keluarga; pilih jawabannya.',
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
        'Ambil kembali sampel kosakata bab dan terapkan pada urutan perjalanan.',
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
    title: 'Keluarga, warna & komunikasi',
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
            cueSignId: 'siapa',
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
            cueSignId: 'apa',
            prompt:
              'Lawan bicara menanyakan warna tanda berhenti pada lampu lalu lintas. Pilih jawaban satu tanda.',
            options: ['merah', 'kuning', 'hitam'],
            answer: 'merah',
            successMessage: 'Warna pertama dikenali.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Lawan bicara menanyakan warna isyarat boleh berjalan pada lampu lalu lintas. Pilih jawaban satu tanda.',
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
        description:
          'Kenali tanda Dengar dan Tuli, lalu gunakan Bagaimana untuk membahas cara komunikasi.',
        duration: 8,
        xp: 60,
        type: 'lesson',
        signIds: ['dengar', 'tuli', 'bagaimana'],
        contextTitle: 'Menghormati cara berkomunikasi',
        contextChallenges: [
          {
            cueSignId: 'tuli',
            prompt:
              'Setelah seseorang menyampaikan identitasnya, pilih kata tanya untuk membahas cara komunikasi yang nyaman.',
            options: ['bagaimana', 'dengar', 'tuli'],
            answer: 'bagaimana',
            successMessage:
              'Bagaimana membuka ruang untuk menanyakan preferensi komunikasi.',
          },
          {
            cueSignId: 'bagaimana',
            prompt:
              'Lawan bicara menanyakan aktivitas menerima bunyi. Pilih jawaban satu tanda.',
            options: ['dengar', 'tuli', 'bagaimana'],
            answer: 'dengar',
            successMessage:
              'Dengar adalah kosakata yang sesuai untuk aktivitas menerima bunyi.',
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
              'Lawan bicara menunjuk bangunan tempat tinggal dan menanyakan bendanya. Pilih jawaban.',
            options: ['rumah', 'keluarga', 'merah'],
            answer: 'rumah',
            successMessage: 'Konteks tempat sudah tepat.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Lawan bicara menanyakan warna rambut yang gelap. Pilih jawaban satu tanda.',
            options: ['hitam', 'merah', 'rumah'],
            answer: 'hitam',
            successMessage: 'Hitam sesuai dengan ciri benda dalam situasi.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-komunikasi',
        '05',
        'Checkpoint komunikasi lengkap',
        'Uji sampel seimbang dari 32 tanda dan terapkan kosakata lintas bab.',
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
            prompt:
              'Lawan bicara menanyakan warna yang umum dipakai untuk menggambarkan matahari cerah. Pilih jawaban.',
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

const recognitionGroups: readonly (readonly SignId[])[] = [
  ['apa', 'siapa', 'kapan', 'di-mana', 'mengapa', 'bagaimana'],
  ['hari', 'pagi', 'siang', 'sore', 'malam'],
  ['air', 'makan', 'belajar', 'ingat', 'lagi'],
  ['cari', 'motor', 'berangkat', 'datang', 'rumah'],
  ['saya', 'teman', 'keluarga', 'terima-kasih', 'maaf', 'tuli', 'dengar'],
  ['merah', 'kuning', 'hijau', 'hitam'],
] as const;

export function buildRecognitionQuestions(
  mission: Mission,
  attempt = 0,
): RecognitionQuestion[] {
  const missionIndex = Math.max(0, getMissionPosition(mission.id));
  const introducedSignIds = uniqueSignIds(
    allMissions
      .slice(0, missionIndex + 1)
      .flatMap((introducedMission) => introducedMission.signIds),
  );
  const questionLimit =
    mission.type === 'checkpoint'
      ? mission.id === 'checkpoint-komunikasi'
        ? 8
        : 6
      : mission.signIds.length;
  const questionIds =
    mission.type === 'checkpoint'
      ? balancedCheckpointSigns(mission.signIds, questionLimit, attempt)
      : seededOrder(mission.signIds, `${mission.id}:${attempt}:questions`);

  return questionIds.map((signId, index) => {
    const semanticGroup =
      recognitionGroups.find((group) => group.includes(signId)) ?? allSignIds;
    const preferredDistractors = seededOrder(
      semanticGroup.filter(
        (id) => id !== signId && introducedSignIds.includes(id),
      ),
      `${mission.id}:${attempt}:${signId}:semantic-distractors`,
    );
    const currentMissionDistractors = seededOrder(
      mission.signIds.filter(
        (id) => id !== signId && !preferredDistractors.includes(id),
      ),
      `${mission.id}:${attempt}:${signId}:mission-distractors`,
    );
    const introducedDistractors = seededOrder(
      introducedSignIds.filter(
        (id) =>
          id !== signId &&
          !preferredDistractors.includes(id) &&
          !currentMissionDistractors.includes(id),
      ),
      `${mission.id}:${attempt}:${signId}:introduced-distractors`,
    );
    const unseenFallback = seededOrder(
      allSignIds.filter(
        (id) =>
          id !== signId &&
          !preferredDistractors.includes(id) &&
          !currentMissionDistractors.includes(id) &&
          !introducedDistractors.includes(id),
      ),
      `${mission.id}:${attempt}:${signId}:unseen-fallback`,
    );
    const distractors = [
      ...preferredDistractors,
      ...currentMissionDistractors,
      ...introducedDistractors,
      ...unseenFallback,
    ].slice(0, 2);
    return {
      signId,
      options: seededOrder(
        [signId, ...distractors],
        `${mission.id}:${attempt}:${index}:options`,
      ),
    };
  });
}

function balancedCheckpointSigns(
  missionSignIds: readonly SignId[],
  limit: number,
  attempt: number,
) {
  const selected: SignId[] = [];
  const orderedGroups = seededOrder(
    recognitionGroups,
    `checkpoint-groups:${attempt}`,
  );
  let round = 0;

  while (selected.length < Math.min(limit, missionSignIds.length)) {
    let added = false;
    for (const group of orderedGroups) {
      const bucket = seededOrder(
        group.filter((id) => missionSignIds.includes(id)),
        `checkpoint:${attempt}:${round}:${group.join('-')}`,
      ).filter((id) => !selected.includes(id));
      if (bucket[0]) {
        selected.push(bucket[0]);
        added = true;
      }
      if (selected.length === Math.min(limit, missionSignIds.length)) break;
    }
    if (!added) break;
    round += 1;
  }

  return seededOrder(selected, `checkpoint-result:${attempt}`);
}

function uniqueSignIds(ids: readonly SignId[]) {
  return [...new Set(ids)];
}

function seededOrder<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  let state = hashString(seed) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const activeMission = getMission('berkenalan');
