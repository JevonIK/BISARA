export type TranslationQuestion = {
  id: string;
  videoSrc: string;
  answer: string;
  options: string[];
};

export type ConversationTurn = {
  id: string;
  speaker: string;
  videoSrc: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  successMessage: string;
  retryMessage: string;
};

const mediaRoot = '/media/wl-bisindo';
const videoSrc = (fileName: string) =>
  `${mediaRoot}/${fileName}?v=20260909-h264`;

export const translationQuestions: TranslationQuestion[] = [
  {
    id: 'translate-01',
    videoSrc: videoSrc('signer0_label9_sample3.mp4'),
    answer: 'Saya',
    options: ['Saya', 'Teman', 'Maaf'],
  },
  {
    id: 'translate-02',
    videoSrc: videoSrc('signer1_label25_sample3.mp4'),
    answer: 'Teman',
    options: ['Terima kasih', 'Teman', 'Siapa'],
  },
  {
    id: 'translate-03',
    videoSrc: videoSrc('signer0_label10_sample3.mp4'),
    answer: 'Terima kasih',
    options: ['Maaf', 'Terima kasih', 'Saya'],
  },
  {
    id: 'translate-04',
    videoSrc: videoSrc('signer0_label6_sample3.mp4'),
    answer: 'Maaf',
    options: ['Teman', 'Maaf', 'Siapa'],
  },
  {
    id: 'translate-05',
    videoSrc: videoSrc('signer1_label13_sample3.mp4'),
    answer: 'Siapa',
    options: ['Siapa', 'Saya', 'Terima kasih'],
  },
];

export const conversationTurns: ConversationTurn[] = [
  {
    id: 'conversation-01',
    speaker: 'Teman baru',
    videoSrc: videoSrc('signer1_label13_sample3.mp4'),
    prompt: 'Teman baru membuka percakapan. Pilih respons yang paling sesuai.',
    options: ['Saya', 'Maaf', 'Terima kasih'],
    correctAnswer: 'Saya',
    successMessage:
      'Teman baru memahami bahwa kamu sedang memperkenalkan diri.',
    retryMessage:
      'Respons itu belum sesuai dengan pertanyaan. Perhatikan kembali tanda yang ditampilkan.',
  },
  {
    id: 'conversation-02',
    speaker: 'Teman baru',
    videoSrc: videoSrc('signer1_label25_sample3.mp4'),
    prompt:
      'Percakapan berlanjut. Pilih balasan yang menjaga interaksi tetap ramah.',
    options: ['Terima kasih', 'Siapa', 'Maaf'],
    correctAnswer: 'Terima kasih',
    successMessage: 'Percakapan berlanjut dengan respons yang ramah.',
    retryMessage:
      'Pilihan itu membuat alur percakapan kurang tepat. Coba respons lain.',
  },
  {
    id: 'conversation-03',
    speaker: 'Teman baru',
    videoSrc: videoSrc('signer0_label6_sample3.mp4'),
    prompt:
      'Teman baru meminta maaf. Pilih tindakan yang membantu memperjelas pesan.',
    options: ['Lagi', 'Saya', 'Teman'],
    correctAnswer: 'Lagi',
    successMessage: 'Kamu berhasil menyelesaikan percakapan perkenalan.',
    retryMessage:
      'Respons itu belum menyelesaikan kebingungan. Pilih tindakan yang meminta pengulangan.',
  },
];
