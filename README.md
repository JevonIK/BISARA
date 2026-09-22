# BISARA

**Belajar BISINDO lewat video, latihan kamera, dan progres yang bertahap.**

BISARA adalah prototipe pembelajaran BISINDO yang dimulai dari alfabet dan dilanjutkan dengan kosakata untuk komunikasi sehari-hari.

**Live Demo:** https://bisara-ebon.vercel.app

## Fitur Utama

- **5 bab dan 25 misi.** Bab 1 memuat alfabet A–Z dalam lima misi. Bab 2–5 memuat 32 kosakata dalam 20 misi, termasuk tes bab.
- **Pembelajaran bertahap.** Pengguna belajar melalui materi contoh, latihan kamera, pengenalan tanda, dan peragaan dari ingatan sesuai struktur misi.
- **Latihan kamera.** MediaPipe mendeteksi landmark tangan dan tubuh, kemudian checker BISARA membandingkan percobaan pengguna dengan data referensi.
- **Kamus BISINDO.** Huruf dan kosakata dapat dicari. Konten terbuka mengikuti progres belajar pengguna.
- **Progres & Review.** Progres tamu tersimpan di browser. Akun mendukung sinkronisasi progres kosakata, tetapi [skema API saat ini belum mendukung sinkronisasi misi alfabet secara penuh](backend/README.md#batas-sinkronisasi-yang-masih-ada).

## Struktur Pembelajaran

| Bab | Materi | Misi |
| --- | --- | ---: |
| 1 | Alfabet BISINDO | 5 |
| 2 | Perkenalan & Relasi | 5 |
| 3 | Bertanya & Memahami | 5 |
| 4 | Kegiatan Sehari-hari | 5 |
| 5 | Waktu & Deskripsi | 5 |

Konfigurasi chapter dan mission berada di [`lib/learning-data.ts`](lib/learning-data.ts).

Untuk misi kosakata, alur pembelajaran terdiri dari:

1. **Amati** — melihat video contoh tanda.
2. **Tirukan** — memperagakan tanda dengan bantuan kamera dan feedback.
3. **Uji Pengenalan** — mengenali tanda dari video.
4. **Uji Peragaan** — memperagakan tanda dari ingatan tanpa video contoh.

Tes bab digunakan untuk mengevaluasi materi yang telah dipelajari.

## Technology Stack

| Bagian | Teknologi | Tanggung Jawab |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Next.js-compatible structure, Vinext, Tailwind CSS 4 | UI, mission, Kamus, akun, dan progress |
| Gesture Processing | MediaPipe Tasks Vision + BISARA gesture checker | Hand/pose landmark extraction dan similarity scoring |
| Backend | FastAPI | Authentication dan progress synchronization |
| Database | PostgreSQL | Penyimpanan akun dan progres |
| Guest Storage | Browser localStorage | Progress tanpa akun |
| Frontend Hosting | Vercel | Production frontend |
| Backend Hosting | Railway | FastAPI deployment |
| Database Hosting | Neon | Cloud PostgreSQL |

## Menjalankan Secara Lokal

### Prasyarat

- Node.js ≥ 22.13
- pnpm
- Browser modern
- Camera permission untuk fitur checker

Install dependency dan jalankan frontend:

```bash
pnpm install
pnpm dev
```

Buka:

```text
http://localhost:3000
```

Mode guest dapat digunakan tanpa membuat akun.

Frontend mengakses backend melalui `/api/v1`. Konfigurasi backend terdapat pada `vite.config.ts` dan `next.config.ts`.

Untuk menjalankan FastAPI dan PostgreSQL secara lokal, lihat:

[`backend/README.md`](backend/README.md)

Jangan menyimpan API key, database credential, atau secret lain di repository.

## Deployment Architecture

Production BISARA menggunakan:

```text
Browser pengguna
    │
    ▼
Vercel (frontend dan rewrite /api/v1)
    │
    ▼
Railway (FastAPI)
    │
    ▼
Neon (PostgreSQL)
```

Pemrosesan kamera dan gesture dilakukan di browser pengguna. Frame kamera tidak digunakan sebagai payload progress ke backend; backend menangani akun dan sinkronisasi progress.

## Technical Documentation

Dokumentasi yang tersedia:

* [Backend, deployment, dan batas sinkronisasi](backend/README.md)
* [Pengujian UI otomatis](docs/automated_testing.md)
* [Dataset alfabet](docs/alphabet-dataset.md)
* [Audit kesiapan dataset referensi](docs/dataset-readiness-audit.md)

Struktur bab dan misi yang digunakan aplikasi berada di [`lib/learning-data.ts`](lib/learning-data.ts).

Struktur kode utama:

* [`app/`](app/) — pages dan routes
* [`components/`](components/) — UI dan learning components
* [`lib/`](lib/) — curriculum, gesture checker, progress, dan account logic
* [`backend/`](backend/) — FastAPI backend

## Testing

Quality checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test:sync
```

Automated UI testing menggunakan **Robot Framework + SeleniumLibrary**.

Dokumentasi automated testing:

[`docs/automated_testing.md`](docs/automated_testing.md)

Robot Framework dan SeleniumLibrary digunakan untuk menguji alur UI seperti:

* homepage loading
* navigation
* authentication form
* Kamus
* learning pages
* halaman belajar dan keberadaan tombol kamera Tirukan

Gestur BISINDO fisik dan akurasi checker kamera tetap membutuhkan pengujian manual menggunakan kamera dan pengguna.

Robot Framework menghasilkan output seperti:

* `report.html`
* `log.html`
* `output.xml`

## Sumber Media & Attribution

| Sumber                                                               | Digunakan untuk                   | Lisensi      |
| -------------------------------------------------------------------- | --------------------------------- | ------------ |
| WL-BISINDO — Kindy, Leonali, dan Lucky                               | 32 contoh kosakata                | CC BY-NC 4.0 |
| Indonesian Sign Language Dataset: Alphabet Video — Indah Siradjuddin | 26 contoh huruf                   | CC BY 4.0    |
| MediaPipe Tasks Vision                                               | Deteksi landmark tangan dan tubuh | Apache 2.0   |

### WL-BISINDO

Grace Oktaviani Kindy, Glenn Leonali, dan Henry Lucky.
*Word-Level BISINDO: A Novel Video Indonesian Sign Language Dataset and Baseline Methods.*

DOI:
[https://doi.org/10.1016/j.procs.2025.08.277](https://doi.org/10.1016/j.procs.2025.08.277)

Detail penggunaan aset:

[`public/media/wl-bisindo/README.md`](public/media/wl-bisindo/README.md)

License: **CC BY-NC 4.0**

BISARA menggunakan 32 video referensi kosakata dari dataset WL-BISINDO sebagai contoh pembelajaran dan referensi checker.

### Alphabet Dataset

Indah Siradjuddin.
*Indonesian Sign Language Dataset: Alphabet Video.*

DOI:
[https://doi.org/10.17632/p7j5jrsbbb.1](https://doi.org/10.17632/p7j5jrsbbb.1)

Detail penggunaan:

[`docs/alphabet-dataset.md`](docs/alphabet-dataset.md)

License: **CC BY 4.0**

BISARA menggunakan 26 video referensi alfabet, satu contoh untuk setiap huruf A–Z.

### MediaPipe

MediaPipe Tasks Vision digunakan untuk ekstraksi hand dan pose landmarks dari video referensi dan input kamera pengguna.

License: **Apache License 2.0**

## Batasan

BISARA masih merupakan prototipe pembelajaran.

Gesture checker bekerja sebagai **similarity checker terhadap contoh referensi**, bukan sebagai sistem yang telah divalidasi untuk menentukan kebenaran seluruh variasi BISINDO.

Hasil checker dipengaruhi oleh beberapa faktor seperti:

* posisi kamera
* pencahayaan
* visibilitas tangan
* sudut tangan
* variasi cara pengguna memperagakan tanda

Evaluasi lebih lanjut bersama pengguna dan komunitas Tuli tetap diperlukan untuk memastikan materi, pengalaman belajar, dan feedback sistem sesuai dengan kebutuhan pembelajaran BISINDO.

Aset WL-BISINDO menggunakan lisensi **CC BY-NC 4.0**, sehingga penggunaannya mengikuti ketentuan nonkomersial dari dataset tersebut.

Atribusi terhadap dataset atau teknologi pihak ketiga tidak berarti pembuat sumber tersebut mendukung atau berafiliasi dengan BISARA.
