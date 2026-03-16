# Face Recognition Service

Backend FastAPI untuk registrasi, verifikasi, dan identifikasi wajah dengan penyimpanan metadata di MySQL, proteksi API key, serta preview sample untuk frontend.

## Endpoint

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/register` | POST | Registrasi wajah baru dengan minimal 5 foto |
| `/api/verify` | POST | Verifikasi wajah terhadap username tertentu |
| `/api/identify` | POST | Cari user paling cocok dari semua sample |
| `/api/users/{username}/photos` | PUT | Tambah sample foto ke user yang sudah ada |
| `/api/users` | GET | Daftar user + jumlah sample |
| `/api/users/{username}` | GET | Detail user + metadata sample |
| `/api/users/{username}/samples/{sample_id}/photo` | GET | Ambil file foto sample untuk preview |
| `/api/users/{username}` | DELETE | Hapus user |
| `/api/logs` | GET | Riwayat verifikasi dan identifikasi |
| `/api/logs/export` | GET | Export log ke CSV |
| `/api/stats` | GET | Ringkasan statistik |
| `/api/health` | GET | Cek status service |

Semua endpoint `/api/*` memerlukan header `x-api-key`.

## Yang Dioptimalkan

- Metadata user, sample, dan log request disimpan di MySQL.
- Sample encoding disimpan di database, foto asli tetap disimpan di volume `data/photos`.
- Ada quality score agar foto blur atau framing buruk tidak ikut jadi sample.
- Ada log verifikasi dan identifikasi untuk audit sederhana.
- Ada endpoint export CSV untuk arsip operasional.
- Ada endpoint preview foto sample untuk frontend admin.
- Cache encoding tetap dipakai di memory supaya pencocokan cepat.

## Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://root:@host.docker.internal:3306/face_recognition` | Koneksi MySQL eksternal |
| `FACE_API_KEY` | `face-dev-key-2026` | API key untuk semua endpoint |
| `FACE_DATA_DIR` | `data` | Folder penyimpanan foto sample |
| `FACE_TOLERANCE` | `0.42` | Threshold matching |
| `FACE_MIN_PHOTOS` | `5` | Minimal foto registrasi |
| `FACE_MAX_PHOTO_MB` | `10` | Maks ukuran upload |
| `FACE_MIN_QUALITY_SCORE` | `35` | Nilai minimal kualitas foto |

## Menjalankan Lokal

1. Pastikan MySQL tersedia. Saat memakai MySQL dan user punya permission yang cukup, backend akan membuat database `face_recognition` otomatis jika belum ada.
2. Install dependency:

```bash
pip install -r requirements.txt
```

3. Set environment variable sesuai kebutuhan.
4. Jalankan backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger tersedia di `http://localhost:8000/docs`.

## Frontend

Frontend statis di folder `FE/` sekarang mendukung:

- Simpan API key di browser.
- Registrasi via upload file.
- Registrasi via kamera browser dengan capture beberapa frame.
- Preview sample foto per user.
- Export log CSV.

## Catatan Implementasi

- Library ini tetap memakai `face_recognition` dan `dlib`, jadi build image backend akan lebih berat dibanding service Python biasa.
- Kalau target Anda benar-benar produksi skala besar, opsi lebih bagus biasanya migrasi engine embedding ke InsightFace atau FaceNet, bukan `dlib`.
