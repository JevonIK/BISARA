export type StarRating = 0 | 1 | 2 | 3;

export function calculateScore(correctAnswers: number, totalQuestions: number) {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

export function calculateStars(score: number): StarRating {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
}

export function resultMessage(stars: StarRating) {
  if (stars === 3) {
    return 'Luar biasa. Kamu mengenali seluruh tanda dalam tes ini.';
  }
  if (stars === 2) {
    return 'Bagus. Ulangi satu tanda yang masih tertukar untuk mengejar hasil sempurna.';
  }
  if (stars === 1) {
    return 'Bab berikutnya terbuka. Kamu tetap disarankan mengulang tanda yang belum kuat.';
  }
  return 'Belum berhasil membuka bab berikutnya. Kembali berlatih lalu coba tes lagi.';
}
