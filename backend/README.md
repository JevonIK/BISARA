# BISARA API

Backend BISARA menangani **akun, sesi, dan sinkronisasi progres** dengan FastAPI, SQLAlchemy async, Alembic, dan PostgreSQL. Penilaian gerakan berlangsung di browser; API menyimpan hasil yang dikirim klien.

## Deployment dan lingkungan lokal

| Komponen | Produksi | Pengembangan lokal |
| --- | --- | --- |
| Frontend | Vercel | `pnpm dev` pada port 3000 |
| FastAPI | Railway | Docker Compose atau Uvicorn pada port 8000 |
| PostgreSQL | Neon | Docker Compose (PostgreSQL 16) |

Browser memanggil `/api/v1` pada origin frontend. [Rewrite Vercel](../vercel.json) meneruskan rute produksi itu ke Railway; FastAPI terhubung ke Neon melalui `DATABASE_URL` milik lingkungan Railway. Kredensial dan `SECRET_KEY` tidak disimpan di repositori.

**Perhatikan proxy lokal:** [`vite.config.ts`](../vite.config.ts) saat ini mengarah ke Railway secara default, bukan ke API Docker lokal. Saat menguji akun pada database lokal, arahkan proxy `/api/v1` ke API lokal. Konfigurasi [`next.config.ts`](../next.config.ts) untuk build Next memakai format tujuan rewrite yang berbeda dari target proxy Vite; jangan menganggap satu nilai `BACKEND_URL` cocok untuk keduanya.

## Menjalankan API dan database lokal

Dari root repositori, dengan Docker Desktop aktif:

```bash
python3 backend/scripts/setup_local.py
docker compose up -d --build
```

Script setup hanya membuat `backend/.env` bila belum ada, dengan secret acak tanpa mencetak nilainya. Compose menjalankan migrasi Alembic sebelum API dimulai. Buka [dokumentasi API](http://localhost:8000/docs) atau [health check](http://localhost:8000/health); health check juga menguji koneksi database. `docker compose stop` menghentikan layanan tanpa menghapus volume PostgreSQL.

Untuk menjalankan FastAPI langsung dan hanya memakai PostgreSQL dari Docker:

```bash
python3 backend/scripts/setup_local.py
docker compose up -d database
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Jangan menjalankan container API dan Uvicorn lokal pada port 8000 bersamaan. Database lokal terpisah dari Neon. Frontend lokal sebaiknya dibuka melalui `http://localhost:3000`; origin itu juga merupakan nilai bawaan `FRONTEND_ORIGINS` untuk API lokal.

## Konfigurasi

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL untuk driver `asyncpg`; di produksi menunjuk ke Neon |
| `SECRET_KEY` | Kunci penandatanganan sesi, minimal 32 karakter dan bukan placeholder |
| `FRONTEND_ORIGINS` | Daftar origin frontend yang diizinkan, dipisah koma, tanpa wildcard atau path |
| `COOKIE_SECURE` | Set `true` untuk cookie pada deployment HTTPS |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Masa berlaku sesi; opsional |

Contoh nilai lokal ada di [`.env.example`](.env.example). Simpan nilai produksi di pengaturan lingkungan Railway; jangan menyalin kredensial Neon atau secret produksi ke file yang dilacak Git. Migrasi dijalankan dengan `alembic upgrade head` dari folder `backend/`; Dockerfile API juga menjalankannya saat start.

## Kontrak API

| Metode | Rute | Fungsi |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Membuat akun dan sesi |
| `POST` | `/api/v1/auth/login` | Masuk dan membuat sesi |
| `GET` | `/api/v1/auth/me` | Mengambil identitas sesi aktif |
| `POST` | `/api/v1/auth/logout` | Mencabut sesi aktif |
| `GET` | `/api/v1/progress` | Membaca progres dan revisinya |
| `PUT` | `/api/v1/progress` | Menyimpan progres bila `expectedRevision` masih cocok |
| `GET` | `/health` | Memeriksa API dan koneksi PostgreSQL |

Payload JSON memakai **camelCase**. Registrasi memerlukan email valid, `displayName` 2–80 karakter, dan password 8–128 karakter. Login memerlukan email dan password. Tanggal progres memakai `YYYY-MM-DD` atau `null`. Detail field berada di [`app/schemas.py`](app/schemas.py).

Progres akun disimpan terpisah dari progres tamu. Tamu menyimpan progres di browser; impor progres tamu ke akun baru hanya terjadi lewat pilihan pengguna. Frontend menyimpan cache per akun dan memakai revisi untuk mencegah penimpaan diam-diam dari perangkat lain. Jika revisi server berubah, `PUT /progress` ditolak dengan `409` dan pengguna dapat memilih versi yang dipertahankan.

### Batas sinkronisasi yang masih ada

Skema API saat ini hanya menerima **20 ID misi kosakata** pada `completedMissionIds` dan membatasi daftar itu sampai 20 item. Lima ID misi alfabet belum tercantum di [`app/schemas.py`](app/schemas.py). Karena frontend mengirim seluruh progres akun, penyelesaian misi alfabet dapat ditolak saat sinkronisasi; cache lokal tetap menyimpan perubahan tetapi **progres alfabet akun belum dapat dianggap tersinkron ke Neon**. Batas ini memerlukan perubahan skema API dan pengujian tersendiri.

## Keamanan dan batas produk

- Password di-hash dengan Argon2. Sesi memakai cookie autentikasi `HttpOnly`, `SameSite=Lax`, serta catatan sesi database yang dapat dicabut saat logout.
- Request yang mengubah data memerlukan `Origin` yang diizinkan; write terautentikasi juga memerlukan token CSRF. Request progres membawa `X-Progress-Owner` yang harus cocok dengan pengguna aktif.
- Login dan registrasi dibatasi hingga 10 percobaan per IP per menit **per proses API**. Ini bukan rate limiter terdistribusi.
- API memvalidasi bentuk data dan kepemilikan, tetapi belum memverifikasi kebenaran skor, XP, atau gerakan yang dikirim browser. Hasilnya bukan sertifikasi kemampuan BISINDO atau leaderboard yang otoritatif.
- Verifikasi email, reset password, dan MFA belum tersedia.

## Pengujian

Dengan PostgreSQL lokal aktif dan migrasi terpasang:

```bash
cd backend
.venv/bin/python -m pytest tests -q
.venv/bin/alembic check
```

Tes API memakai PostgreSQL nyata dan membatalkan transaksi setelah tiap kasus. Dari root repositori, `pnpm test:sync` memeriksa perilaku sinkronisasi frontend. Smoke test UI didokumentasikan di [pengujian otomatis](../docs/automated_testing.md).
