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
    title: 'Perkenalan & relasi',
    description:
      'Membantu pengguna memulai interaksi dasar, memperkenalkan diri, mengenali orang lain, dan memahami ekspresi sosial sederhana.',
    status: 'active',
    progress: 0,
    missions: [
      mission({
        id: 'berkenalan',
        number: '01',
        title: 'Berkenalan',
        description: 'Memulai interaksi sederhana dengan orang yang baru dikenal.',
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
              'Teman baru menyambutmu dengan ramah. Pilih respons yang menjaga interaksi tetap sopan.',
            options: ['terima-kasih', 'siapa', 'maaf'],
            answer: 'terima-kasih',
            successMessage: 'Percakapan berlanjut dengan ramah.',
          },
          {
            cueSignId: 'saya',
            prompt:
              'Kamu tidak sengaja keliru menyebut nama teman barumu. Pilih respons sopan yang sesuai.',
            options: ['maaf', 'terima-kasih', 'teman'],
            answer: 'maaf',
            successMessage:
              'Permintaan maafmu menjaga hubungan pertemanan tetap baik.',
          },
        ],
      }),
      mission({
        id: 'orang-terdekat',
        number: '02',
        title: 'Orang Terdekat',
        description:
          'Mengenali dan membicarakan hubungan sederhana dengan orang di sekitar.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['keluarga', 'saya', 'siapa', 'teman'],
        contextTitle: 'Mengenali hubungan terdekat',
        contextChallenges: [
          {
            cueSignId: 'siapa',
            prompt:
              'Seseorang menanyakan siapa yang tinggal bersamamu di rumah. Pilih kelompok orang terdekat.',
            options: ['keluarga', 'teman', 'saya'],
            answer: 'keluarga',
            successMessage: 'Kamu mengenali sebutan anggota keluarga.',
          },
          {
            cueSignId: 'keluarga',
            prompt:
              'Orang yang datang berkunjung bukan anggota keluarga, melainkan rekan sebayamu. Pilih hubungannya.',
            options: ['teman', 'keluarga', 'saya'],
            answer: 'teman',
            successMessage:
              'Kamu membedakan teman dari anggota keluarga secara tepat.',
          },
        ],
      }),
      mission({
        id: 'tuli-dan-dengar',
        number: '03',
        title: 'Tuli & Dengar',
        description:
          'Mengenali vocabulary dasar terkait identitas dan komunikasi Tuli-dengar secara respectful.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['tuli', 'dengar', 'saya', 'teman'],
        contextTitle: 'Mengenal identitas dan komunikasi',
        contextChallenges: [
          {
            cueSignId: 'teman',
            prompt:
              'Teman barumu berkomunikasi menggunakan bahasa isyarat sebagai identitas budayanya. Pilih tanda identitas yang tepat.',
            options: ['tuli', 'dengar', 'saya'],
            answer: 'tuli',
            successMessage:
              'Kamu mengenali identitas Tuli secara tepat dan penuh rasa hormat.',
          },
          {
            cueSignId: 'tuli',
            prompt:
              'Lawan bicara menanyakan kelompok yang menggunakan modalitas pendengaran suara dalam komunikasi harian. Pilih tanda yang sesuai.',
            options: ['dengar', 'tuli', 'teman'],
            answer: 'dengar',
            successMessage:
              'Kamu memahami perbedaan latar komunikasi teman dengar.',
          },
        ],
      }),
      mission({
        id: 'bersikap-sopan',
        number: '04',
        title: 'Bersikap Sopan',
        description:
          'Memilih respons sosial yang sesuai berdasarkan situasi.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['maaf', 'terima-kasih', 'teman', 'saya'],
        contextTitle: 'Respons sopan dalam interaksi',
        contextChallenges: [
          {
            cueSignId: 'teman',
            prompt:
              'Teman membantumu saat kamu mengalami kesulitan belajar isyarat. Pilih respons sosial yang sesuai.',
            options: ['terima-kasih', 'maaf', 'saya'],
            answer: 'terima-kasih',
            successMessage: 'Ungkapan terima kasihmu mempererat pertemanan.',
          },
          {
            cueSignId: 'saya',
            prompt:
              'Kamu tidak sengaja menjatuhkan barang milik teman. Pilih respons yang tepat.',
            options: ['maaf', 'terima-kasih', 'teman'],
            answer: 'maaf',
            successMessage: 'Kamu bersikap sopan dengan meminta maaf.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-kenalan',
        '05',
        'Tantangan: Kenalan Baru',
        'Menggabungkan kemampuan dari seluruh Bab 01 dalam satu rangkaian situasi perkenalan.',
        [
          'saya',
          'siapa',
          'teman',
          'keluarga',
          'tuli',
          'dengar',
          'terima-kasih',
          'maaf',
        ],
        'Simulasi kenalan baru',
        [
          {
            cueSignId: 'siapa',
            prompt:
              'Di sebuah acara kumpul komunitas, seseorang menyapamu dan menanyakan identitasmu. Pilih pembuka jawaban.',
            options: ['saya', 'teman', 'keluarga'],
            answer: 'saya',
            successMessage: 'Kamu mengawali perkenalan dengan jelas.',
          },
          {
            cueSignId: 'teman',
            prompt:
              'Teman baru memperkenalkan anggota yang hadir bersama dirinya di rumah. Pilih kelompok orang terdekat.',
            options: ['keluarga', 'dengar', 'saya'],
            answer: 'keluarga',
            successMessage: 'Kamu mengenali keluarga dalam interaksi.',
          },
          {
            cueSignId: 'tuli',
            prompt:
              'Teman Tuli tersebut membantumu mempraktikkan isyarat dengan sabar. Tutup percakapan dengan respons sopan.',
            options: ['terima-kasih', 'maaf', 'siapa'],
            answer: 'terima-kasih',
            successMessage:
              'Simulasi perkenalan bab pertama berhasil diselesaikan dengan baik.',
          },
        ],
        100,
      ),
    ],
  },
  {
    id: 'chapter-2',
    number: '02',
    eyebrow: 'Mulai bertanya',
    title: 'Bertanya & memahami',
    description:
      'Membantu pengguna meminta informasi, mencari sesuatu, dan mempertahankan komunikasi ketika belum memahami informasi.',
    status: 'locked',
    progress: 0,
    missions: [
      mission({
        id: 'bertanya-apa',
        number: '06',
        title: 'Bertanya Apa',
        description:
          'Mengenali kapan pengguna perlu meminta informasi dasar tentang sesuatu.',
        duration: 7,
        xp: 40,
        type: 'lesson',
        signIds: ['apa', 'siapa', 'saya'],
        contextTitle: 'Meminta informasi dasar',
        contextChallenges: [
          {
            cueSignId: 'saya',
            prompt:
              'Lawan bicara memegang benda baru dan menunjukkannya kepadamu. Pilih tanda untuk menanyakan bendanya.',
            options: ['apa', 'siapa', 'saya'],
            answer: 'apa',
            successMessage:
              'Kamu meminta informasi dasar tentang benda tersebut.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Lawan bicara balik menanyakan orang yang membawa benda tersebut. Pilih kata tanya orang.',
            options: ['siapa', 'apa', 'saya'],
            answer: 'siapa',
            successMessage:
              'Kamu menanyakan identitas orang yang bersangkutan.',
          },
        ],
      }),
      mission({
        id: 'waktu-dan-tempat',
        number: '07',
        title: 'Waktu & Tempat',
        description: 'Meminta informasi tentang waktu dan lokasi.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['kapan', 'di-mana', 'apa', 'siapa'],
        contextTitle: 'Menanyakan waktu dan lokasi',
        contextChallenges: [
          {
            cueSignId: 'apa',
            prompt:
              'Teman memberitahu ada janji kumpul, tetapi belum menyebut jadwalnya. Pilih kata tanya waktu.',
            options: ['kapan', 'di-mana', 'siapa'],
            answer: 'kapan',
            successMessage: 'Kamu menanyakan waktu pertemuan.',
          },
          {
            cueSignId: 'kapan',
            prompt:
              'Jadwal sudah disepakati, namun tempat pertemuan belum jelas. Pilih kata tanya lokasi.',
            options: ['di-mana', 'kapan', 'apa'],
            answer: 'di-mana',
            successMessage: 'Kamu menanyakan lokasi pertemuan secara tepat.',
          },
        ],
      }),
      mission({
        id: 'alasan-dan-cara',
        number: '08',
        title: 'Alasan & Cara',
        description:
          'Mengembangkan pertanyaan dari informasi sederhana menuju alasan dan cara.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['mengapa', 'bagaimana', 'apa', 'kapan', 'di-mana'],
        contextTitle: 'Mendalami alasan dan cara',
        contextChallenges: [
          {
            cueSignId: 'di-mana',
            prompt:
              'Teman tiba-tiba membatalkan janji pergi dan kamu ingin tahu penyebabnya. Pilih kata tanya alasan.',
            options: ['mengapa', 'bagaimana', 'kapan'],
            answer: 'mengapa',
            successMessage: 'Kamu menanyakan alasan pembatalan.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Teman menunjukkan contoh isyarat dan kamu ingin mengetahui langkah gerakannya. Pilih kata tanya cara.',
            options: ['bagaimana', 'mengapa', 'di-mana'],
            answer: 'bagaimana',
            successMessage: 'Kamu menanyakan langkah gerakannya.',
          },
        ],
      }),
      mission({
        id: 'cari-dan-pahami',
        number: '09',
        title: 'Cari & Pahami',
        description:
          'Mendukung situasi ketika pengguna perlu mencari informasi, mengingat sesuatu, atau meminta pengulangan.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['cari', 'ingat', 'lagi', 'apa', 'di-mana', 'bagaimana'],
        contextTitle: 'Memperjelas dan mengingat informasi',
        contextChallenges: [
          {
            cueSignId: 'di-mana',
            prompt:
              'Kamu belum menemukan barang yang kamu simpan. Pilih tanda tindakan aktif yang kamu lakukan.',
            options: ['cari', 'ingat', 'lagi'],
            answer: 'cari',
            successMessage: 'Kamu menyatakan sedang mencari barang tersebut.',
          },
          {
            cueSignId: 'bagaimana',
            prompt:
              'Lawan bicara memperagakan isyarat terlalu cepat. Pilih tanda untuk memintanya mengulang sekali lagi.',
            options: ['lagi', 'ingat', 'cari'],
            answer: 'lagi',
            successMessage: 'Kamu meminta pengulangan dengan sopan.',
          },
          {
            cueSignId: 'apa',
            prompt:
              'Teman berpesan agar kamu tidak lupa materi yang telah dipelajari. Pilih tanda konfirmasi bahwa kamu masih ingat.',
            options: ['ingat', 'lagi', 'cari'],
            answer: 'ingat',
            successMessage:
              'Kamu menegaskan bahwa kamu mengingat materi tersebut.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-informasi',
        '10',
        'Tantangan: Mencari Informasi',
        'Menyelesaikan rangkaian situasi ketika pengguna perlu mendapatkan atau memperjelas informasi.',
        [
          'apa',
          'kapan',
          'di-mana',
          'mengapa',
          'bagaimana',
          'cari',
          'ingat',
          'lagi',
        ],
        'Simulasi mencari informasi',
        [
          {
            cueSignId: 'apa',
            prompt:
              'Kamu tersesat di gedung pertemuan dan ingin menanyakan lokasi ruang utama. Pilih kata tanya tempat.',
            options: ['di-mana', 'kapan', 'mengapa'],
            answer: 'di-mana',
            successMessage: 'Kamu menanyakan letak ruang utama.',
          },
          {
            cueSignId: 'di-mana',
            prompt:
              'Petugas mengarahkan ke lorong sebelah kanan. Pilih tindakanmu untuk menemukan ruangannya.',
            options: ['cari', 'lagi', 'bagaimana'],
            answer: 'cari',
            successMessage: 'Kamu mulai mencari ke arah yang ditunjukkan.',
          },
          {
            cueSignId: 'bagaimana',
            prompt:
              'Petugas memberikan petunjuk rute yang rumit. Pilih tanda untuk meminta penjelasan diulang kembali.',
            options: ['lagi', 'ingat', 'kapan'],
            answer: 'lagi',
            successMessage:
              'Petugas mengulang penjelasannya dengan ramah.',
          },
        ],
        100,
      ),
    ],
  },
  {
    id: 'chapter-3',
    number: '03',
    eyebrow: 'Beraktivitas',
    title: 'Kegiatan sehari-hari',
    description:
      'Membantu pengguna berkomunikasi mengenai kebutuhan dan aktivitas sehari-hari.',
    status: 'locked',
    progress: 0,
    missions: [
      mission({
        id: 'makan-dan-minum',
        number: '11',
        title: 'Makan & Minum',
        description:
          'Mengenali kebutuhan sederhana terkait makan dan minum.',
        duration: 7,
        xp: 45,
        type: 'lesson',
        signIds: ['makan', 'air', 'apa'],
        contextTitle: 'Kebutuhan makan dan minum',
        contextChallenges: [
          {
            cueSignId: 'apa',
            prompt:
              'Pelayan menanyakan pesananmu saat perutmu lapar. Pilih jawaban kebutuhan makanan.',
            options: ['makan', 'air', 'apa'],
            answer: 'makan',
            successMessage: 'Kebutuhan makanmu tersampaikan.',
          },
          {
            cueSignId: 'makan',
            prompt:
              'Setelah makan, kamu merasa haus dan ingin memesan minuman. Pilih tanda minuman.',
            options: ['air', 'makan', 'apa'],
            answer: 'air',
            successMessage: 'Kamu memesan air minum dengan tepat.',
          },
        ],
      }),
      mission({
        id: 'belajar-di-rumah',
        number: '12',
        title: 'Belajar di Rumah',
        description: 'Membicarakan aktivitas belajar dan tempat.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['belajar', 'rumah', 'di-mana', 'apa'],
        contextTitle: 'Aktivitas belajar dan tempat',
        contextChallenges: [
          {
            cueSignId: 'apa',
            prompt:
              'Teman menanyakan kegiatan yang sedang kamu tekuni sore ini. Pilih tanda aktivitas.',
            options: ['belajar', 'rumah', 'di-mana'],
            answer: 'belajar',
            successMessage: 'Kegiatan belajarmu tersampaikan.',
          },
          {
            cueSignId: 'di-mana',
            prompt:
              'Teman menanyakan tempat kamu belajar hari ini. Pilih lokasi tempat tinggal.',
            options: ['rumah', 'belajar', 'apa'],
            answer: 'rumah',
            successMessage: 'Kamu menyampaikan bahwa kamu belajar di rumah.',
          },
        ],
      }),
      mission({
        id: 'pergi-beraktivitas',
        number: '13',
        title: 'Pergi Beraktivitas',
        description:
          'Mengenali konteks bepergian dan aktivitas sebelum pergi.',
        duration: 8,
        xp: 45,
        type: 'lesson',
        signIds: ['motor', 'berangkat', 'apa', 'di-mana'],
        contextTitle: 'Bepergian dan kendaraan',
        contextChallenges: [
          {
            cueSignId: 'apa',
            prompt:
              'Teman menanyakan kendaraan yang kamu bawa untuk bepergian. Pilih kendaraan roda dua.',
            options: ['motor', 'berangkat', 'di-mana'],
            answer: 'motor',
            successMessage: 'Moda transportasimu jelas.',
          },
          {
            cueSignId: 'motor',
            prompt:
              'Kunci motor sudah di tangan dan waktu sudah menunjukkan jadwal pergi. Pilih tanda gerak memulai perjalanan.',
            options: ['berangkat', 'motor', 'apa'],
            answer: 'berangkat',
            successMessage: 'Kamu menyatakan siap berangkat.',
          },
        ],
      }),
      mission({
        id: 'datang-hari-ini',
        number: '14',
        title: 'Datang Hari Ini',
        description:
          'Menghubungkan kedatangan seseorang dengan konteks waktu.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['datang', 'hari', 'kapan', 'siapa'],
        contextTitle: 'Kedatangan dan hari pertemuan',
        contextChallenges: [
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan kapan jadwal pertemuan kelompok diadakan. Pilih tanda penunjuk hari ini.',
            options: ['hari', 'datang', 'siapa'],
            answer: 'hari',
            successMessage: 'Kamu memberi kepastian hari.',
          },
          {
            cueSignId: 'hari',
            prompt:
              'Teman yang kamu tunggu akhirnya tiba di pintu. Pilih tanda gerakan tiba di tempat.',
            options: ['datang', 'hari', 'kapan'],
            answer: 'datang',
            successMessage: 'Kamu menyambut kedatangannya.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-aktivitas',
        '15',
        'Tantangan: Sehari Beraktivitas',
        'Menggabungkan aktivitas sehari-hari dalam beberapa situasi yang saling berhubungan.',
        [
          'rumah',
          'berangkat',
          'motor',
          'belajar',
          'makan',
          'air',
          'datang',
          'hari',
          'apa',
          'kapan',
          'di-mana',
        ],
        'Rangkaian kegiatan harian',
        [
          {
            cueSignId: 'di-mana',
            prompt:
              'Mengawali aktivitas hari ini, dari manakah kamu bersiap-siap? Pilih tempat tinggal.',
            options: ['rumah', 'motor', 'belajar'],
            answer: 'rumah',
            successMessage: 'Titik awal keberangkatan dari rumah.',
          },
          {
            cueSignId: 'berangkat',
            prompt:
              'Kamu memilih kendaraan roda dua untuk menempuh perjalanan. Pilih tanda kendaraannya.',
            options: ['motor', 'makan', 'air'],
            answer: 'motor',
            successMessage: 'Kamu mengendarai motor.',
          },
          {
            cueSignId: 'belajar',
            prompt:
              'Setelah seharian belajar, kamu berkumpul dengan teman untuk mengisi perut. Pilih kebutuhan pokok.',
            options: ['makan', 'datang', 'hari'],
            answer: 'makan',
            successMessage:
              'Rangkaian kegiatan sehari penuh berhasil diselesaikan!',
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
    title: 'Waktu & deskripsi',
    description:
      'Membantu pengguna memberikan informasi yang lebih spesifik tentang waktu dan karakteristik visual sederhana.',
    status: 'locked',
    progress: 0,
    missions: [
      mission({
        id: 'pagi-dan-siang',
        number: '16',
        title: 'Pagi & Siang',
        description: 'Memberikan informasi waktu yang lebih spesifik.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['pagi', 'siang', 'kapan', 'berangkat', 'datang'],
        contextTitle: 'Waktu pagi dan siang hari',
        contextChallenges: [
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan waktu keberangkatan ketika matahari baru saja menyingsing. Pilih tanda waktu awal hari.',
            options: ['pagi', 'siang', 'datang'],
            answer: 'pagi',
            successMessage: 'Kamu menentukan waktu pagi hari secara tepat.',
          },
          {
            cueSignId: 'berangkat',
            prompt:
              'Teman menanyakan kapan waktu makan istirahat saat matahari tepat di atas kepala. Pilih tanda waktu tengah hari.',
            options: ['siang', 'pagi', 'kapan'],
            answer: 'siang',
            successMessage: 'Kamu memilih waktu siang hari.',
          },
        ],
      }),
      mission({
        id: 'sore-dan-malam',
        number: '17',
        title: 'Sore & Malam',
        description:
          'Melanjutkan kemampuan menyampaikan waktu dalam konteks aktivitas.',
        duration: 8,
        xp: 50,
        type: 'lesson',
        signIds: ['sore', 'malam', 'kapan', 'datang', 'berangkat'],
        contextTitle: 'Waktu sore dan malam hari',
        contextChallenges: [
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan waktu kamu pulang saat matahari mulai tenggelam. Pilih tanda waktu.',
            options: ['sore', 'malam', 'datang'],
            answer: 'sore',
            successMessage: 'Kamu menentukan waktu sore hari.',
          },
          {
            cueSignId: 'datang',
            prompt:
              'Kamu tiba di tempat tinggal ketika langit sudah gelap gulita. Pilih tanda waktu.',
            options: ['malam', 'sore', 'berangkat'],
            answer: 'malam',
            successMessage: 'Kamu menyatakan waktu malam hari dengan tepat.',
          },
        ],
      }),
      mission({
        id: 'mengenal-warna',
        number: '18',
        title: 'Mengenal Warna',
        description:
          'Mengenali dan membedakan karakteristik visual dasar.',
        duration: 9,
        xp: 55,
        type: 'lesson',
        signIds: ['merah', 'kuning', 'hijau', 'hitam', 'apa', 'motor', 'rumah'],
        contextTitle: 'Mengenali empat warna dasar',
        contextChallenges: [
          {
            cueSignId: 'motor',
            prompt:
              'Teman menanyakan warna helm yang mirip warna daun atau lampu rambu jalan aman. Pilih tanda warna.',
            options: ['hijau', 'merah', 'hitam'],
            answer: 'hijau',
            successMessage: 'Kamu mengenali warna hijau.',
          },
          {
            cueSignId: 'rumah',
            prompt:
              'Teman menanyakan warna cat pagar yang menyala seperti rambu berhenti. Pilih tanda warna.',
            options: ['merah', 'kuning', 'hijau'],
            answer: 'merah',
            successMessage: 'Warna merah berhasil kamu tentukan.',
          },
        ],
      }),
      mission({
        id: 'mendeskripsikan-pilihan',
        number: '19',
        title: 'Mendeskripsikan Pilihan',
        description:
          'Menggunakan tanda warna bersama vocabulary sebelumnya dalam situasi pemilihan atau identifikasi.',
        duration: 9,
        xp: 55,
        type: 'lesson',
        signIds: [
          'merah',
          'kuning',
          'hijau',
          'hitam',
          'apa',
          'di-mana',
          'motor',
          'rumah',
        ],
        contextTitle: 'Identifikasi dan pilihan benda',
        contextChallenges: [
          {
            cueSignId: 'motor',
            prompt:
              'Di tempat parkir banyak motor berjejer. Motor milikmu berwarna gelap pekat tanpa corak. Pilih tanda warna motor.',
            options: ['hitam', 'kuning', 'merah'],
            answer: 'hitam',
            successMessage: 'Kamu mengidentifikasi motor hitam.',
          },
          {
            cueSignId: 'rumah',
            prompt:
              'Kamu mencari rumah teman yang dicat cerah mirip warna sinar matahari. Pilih tanda warna.',
            options: ['kuning', 'hijau', 'hitam'],
            answer: 'kuning',
            successMessage: 'Kamu mendeskripsikan rumah kuning dengan tepat.',
          },
        ],
      }),
      checkpoint(
        'checkpoint-percakapan',
        '20',
        'Tantangan Akhir: Percakapan',
        'Menggabungkan kemampuan dari keempat bab dalam beberapa situasi komunikasi sederhana.',
        [...allSignIds],
        'Percakapan akhir menyeluruh',
        [
          {
            cueSignId: 'siapa',
            prompt:
              'Seseorang menyapamu di pagi hari dan menanyakan siapa namamu. Pilih tanda pembuka perkenalan.',
            options: ['saya', 'teman', 'rumah'],
            answer: 'saya',
            successMessage: 'Kamu membuka percakapan dengan percaya diri.',
          },
          {
            cueSignId: 'kapan',
            prompt:
              'Teman menanyakan kapan waktu kita berangkat bersama menggunakan motor. Pilih waktu di awal hari.',
            options: ['pagi', 'malam', 'motor'],
            answer: 'pagi',
            successMessage: 'Waktu keberangkatan disepakati pagi hari.',
          },
          {
            cueSignId: 'teman',
            prompt:
              'Setelah berhasil menyelesaikan seluruh perjalanan belajar bersama, pilih ungkapan penghargaan sosial yang hangat.',
            options: ['terima-kasih', 'maaf', 'lagi'],
            answer: 'terima-kasih',
            successMessage:
              'Selamat! Kamu telah menyelesaikan seluruh 20 misi kurikulum BISARA!',
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
      ? mission.id === 'checkpoint-percakapan'
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
