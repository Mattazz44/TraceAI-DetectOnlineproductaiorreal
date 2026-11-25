# TraceAI

TraceAI adalah aplikasi web forensik citra untuk memeriksa apakah foto produk pada katalog, ulasan, atau materi iklan berasal dari tangkapan kamera asli atau hasil generator gambar sintetis. Aplikasi ini menggabungkan klasifikasi berbasis Swin Transformer, pemetaan area aktivasi Grad-CAM, dan pembacaan metadata EXIF ke dalam antarmuka pemeriksaan yang mudah dipahami pengguna umum maupun tim penguji kualitas.

---

## Arsitektur dan Spesifikasi Teknis

Proyek ini terbagi menjadi dua layanan yang berjalan terpisah:

1. Layanan Backend berbasis Python dan FastAPI yang menangani validasi biner gambar, prapemrosesan citra, inferensi model, ekstraksi atribut kamera EXIF, serta pembuatan peta panas (heatmap) Grad-CAM.
2. Aplikasi Frontend berbasis React 18, Vite 6, dan Tailwind CSS v4 yang menyediakan alur pratinjau berkas, visualisasi skor terkalibrasi, inspeksi detail hingga perbesaran 300%, dan penyimpanan riwayat lokal di peramban.

| Komponen | Spesifikasi Aktif |
| :--- | :--- |
| Arsitektur model utama | `SwinForImageClassification` (fine-tuned dari `Organika/sdxl-detector`) |
| Versi bobot | `v6_product_matched_antiforgetting_fp16` (`model.safetensors`) |
| Kelas keluaran | `0: NON_AI`, `1: AI_GENERATED` |
| Prapemrosesan input | `224 x 224 px` dengan metode `center_crop_fit` (interpolasi Bicubic) |
| Test-Time Augmentation (TTA) | Aktif (rata-rata probabilitas citra asli dan cerminan horizontal) |
| Ambang keputusan AI | `0.65` (`65.0%`) |
| Lokalisasi visual | Grad-CAM pada stage terakhir Swin (`7 x 7`) yang diproyeksikan ke rasio asli |
| Model cadangan otomatis | `EfficientNet-B0` (`.pth`) jika `model.safetensors` tidak ditemukan |
| Batas unggahan berkas | Format `JPG`, `PNG`, dan `WebP`, ukuran maksimal `10 MB` |

---

## Struktur Direktori

```text
Project viskom trace ai/
├── Backend/
│   ├── models/
│   │   ├── model.safetensors          # Bobot utama Swin Transformer v6
│   │   ├── config.json                # Konfigurasi arsitektur dan pemetaan label
│   │   ├── preprocessor_config.json   # Parameter normalisasi dan ukuran citra
│   │   └── traceai_config_final.json  # Konfigurasi ambang 0.65, TTA, dan prapemrosesan
│   ├── main.py                        # Server FastAPI, inferensi, Grad-CAM, dan EXIF
│   ├── requirements.txt               # Daftar paket Python
│   ├── ai_pipeline.md                 # Dokumentasi alur inferensi model
│   ├── backend_rules.md               # Aturan validasi dan kontrak respons API
│   └── DEPLOYMENT_AND_ENV.md          # Catatan konfigurasi lingkungan server
├── Front_end/
│   └── traceai-web/
│       ├── public/
│       │   └── logo/logo.jpeg         # Aset logo resmi dan ikon tab peramban
│       ├── src/
│       │   ├── components/            # Komponen layar, Dropzone, Lightbox, dan navigasi
│       │   ├── hooks/                 # Hook tema Terang/Gelap dan penyimpanan riwayat
│       │   ├── lib/                   # Klien API, normalisasi skor, dan utilitas citra
│       │   ├── App.jsx                # Pengatur alur layar dan pintasan papan klip
│       │   └── index.css              # Token warna tema dan aturan tipografi Tailwind v4
│       ├── index.html                 # Dokumen utama dan inisialisasi tema bebas kedip
│       └── package.json               # Konfigurasi skrip dan paket Node.js
├── logo/
│   └── logo.jpeg                      # Sumber aset logo proyek
├── PRD.md                             # Dokumen kebutuhan produk
└── README.md                          # Dokumentasi instalasi dan penggunaan aplikasi
```

---

## Menjalankan Proyek Secara Lokal

### Prasyarat

- Python versi 3.10 atau lebih baru
- Node.js versi 18 atau lebih baru beserta `npm`
- Berkas model (`model.safetensors`, `config.json`, `preprocessor_config.json`, dan `traceai_config_final.json`) tersedia di dalam folder `Backend/models/`

### 1. Menjalankan Server Backend (Terminal 1)

Masuk ke direktori `Backend`, buat dan aktifkan lingkungan virtual Python, pasang dependensi, lalu nyalakan server FastAPI pada port `8000`:

```powershell
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Untuk pengguna macOS atau Linux, aktifkan lingkungan virtual dengan perintah `source venv/bin/activate`.

Setelah proses pemuatan bobot selesai:
- Endpoint status server dapat diperiksa di `http://127.0.0.1:8000/`
- Dokumentasi skema OpenAPI tersedia di `http://127.0.0.1:8000/docs`

### 2. Menjalankan Aplikasi Frontend (Terminal 2)

Buka jendela terminal baru, masuk ke direktori `Front_end/traceai-web`, pasang paket Node.js, dan jalankan server pengembangan Vite:

```powershell
cd "Front_end\traceai-web"
npm install
npm run dev
```

Secara bawaan aplikasi terhubung ke `http://localhost:8000/api/v1` dengan batas unggahan `10 MB`. Jika alamat server Backend diubah, buat berkas `.env` di dalam `Front_end/traceai-web`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MAX_UPLOAD_MB=10
```

Buka `http://localhost:5173` (atau `http://127.0.0.1:5173`) pada peramban untuk menggunakan aplikasi. Untuk membuat bundel produksi statis, jalankan `npm run build`.

---

## Ringkasan Endpoint API

| Metode | Jalur | Fungsi |
| :--- | :--- | :--- |
| `GET` | `/` | Mengembalikan status server, arsitektur model aktif, metode prapemrosesan, status TTA, dan nilai ambang deteksi. |
| `POST` | `/api/v1/scan` | Menerima berkas gambar melalui `multipart/form-data` (field `image`) dan mengembalikan skor probabilitas, status keaslian, koordinat area anomali, peta panas base64, rincian empat indikator, serta metadata berkas dan kamera. |

Kode respons HTTP pada `/api/v1/scan`:
- `200 OK`: Pemeriksaan berhasil dijalankan.
- `400 Bad Request`: Berkas kosong atau struktur biner gambar rusak.
- `413 Content Too Large`: Ukuran berkas melampaui batas 10 MB.
- `415 Unsupported Media Type`: Format berkas di luar `image/jpeg`, `image/png`, atau `image/webp`.
- `500 Internal Server Error`: Gangguan internal saat menjalankan inferensi model.

---

## Panduan Penggunaan Aplikasi

### 1. Memilih dan Meninjau Pratinjau Gambar

Pada halaman `Pemeriksaan`, masukkan foto produk melalui salah satu cara berikut:
- Tarik dan lepaskan berkas gambar ke dalam bingkai unggah.
- Tekan tombol `Pilih File dari Galeri` untuk memilih berkas dari perangkat.
- Tekan tombol `Ambil Foto Kamera` pada perangkat seluler untuk memotret produk secara langsung.
- Salin gambar dari sumber lain lalu tekan `Ctrl+V` di halaman aplikasi.

Sebelum gambar dikirim ke server, aplikasi menampilkan pratinjau utuh beserta format berkas, ukuran byte, dimensi piksel asli, dan peringatan jika resolusi berada di bawah `256 x 256 px`. Tekan `Mulai Analisis Forensik` untuk memulai pemeriksaan atau `Ganti Gambar` untuk memilih berkas lain.

### 2. Membaca Ringkasan Hasil Pemeriksaan

Setelah inferensi selesai, halaman hasil menyajikan:
- Kesimpulan utama dalam bahasa yang jelas (`Kemungkinan Besar Gambar Asli`, `Kemungkinan Gambar Asli`, `Terindikasi Buatan AI atau Manipulasi`, atau `Terdeteksi Kuat Buatan AI`).
- Perbandingan berdampingan antara `Skor Indikasi Buatan AI` dan `Skor Keaslian Foto`, dilengkapi bilah pengukur dengan penanda `Ambang AI: 65%`. Gambar dengan skor di bawah 65% diklasifikasikan sebagai foto asli, sedangkan skor 65% ke atas ditandai sebagai indikasi sintetis.
- Indikator `Keyakinan Keputusan Model` (`50%` sampai `100%`) yang dihitung berdasarkan jarak skor terhadap ambang 65%.
- Kartu `Ringkasan Teknis File & Mesin` yang memuat resolusi piksel, format dan ukuran berkas, ringkasan ketersediaan EXIF, serta konfigurasi mesin inferensi.
- Fitur klik gambar atau tombol `Perbesar` untuk membuka jendela inspeksi penuh (`100%` hingga `300%`) guna memeriksa detail permukaan produk.

### 3. Memeriksa Bukti Visual dan Metadata

Tekan tombol `Buka Bukti & Metadata` untuk meninjau dasar keputusan model secara rinci:
- Panel visual di sisi kiri menampilkan foto produk secara utuh bersama sakelar `Peta Panas` (area fokus aktivasi model) dan `Kotak Area` (sorotan titik anomali tertinggi). Kedua lapisan tersebut tetap tersedia saat gambar diperbesar ke layar penuh.
- Tab `Indikator Visual` merinci empat aspek pemeriksaan: tekstur permukaan, teks dan detail logo, cahaya dan bayangan, serta metadata perangkat (EXIF). Setiap kartu dapat dibuka untuk membaca panduan pemeriksaan mata telanjang dan terhubung langsung dengan kotak sorotan pada gambar.
- Tab `Metadata & Parameter` menampilkan tabel atribut berkas asli (dimensi, ukuran, merek/model kamera, perangkat lunak penyunting, waktu pengambilan) serta parameter model yang digunakan pada sesi tersebut.
- Tombol `Salin & Bagikan Laporan` membuka lembar berbagi bawaan pada ponsel atau menyalin ringkasan teks laporan ke papan klip pada komputer.

### 4. Mengelola Riwayat dan Preferensi Tampilan

- Seluruh hasil pemeriksaan disimpan secara lokal pada `localStorage` peramban (hingga 50 laporan terbaru) tanpa basis data eksternal.
- Buka menu `Riwayat` pada bilah atas untuk mencari nama berkas, menyaring daftar berdasarkan status (`Semua`, `Terdeteksi AI`, `Gambar Asli`), atau mengganti tata letak antara tampilan daftar dan kartu grid.
- Gunakan ikon tempat sampah pada baris item untuk menghapus satu riwayat tertentu, atau gunakan tombol `Hapus Semua` untuk mengosongkan seluruh daftar setelah konfirmasi.
- Gunakan tombol ikon matahari/bulan di kanan atas untuk berpindah antara mode Terang dan mode Gelap, serta tombol jeda di sudut kanan bawah halaman jika ingin menghentikan gerak latar belakang.

---

## Catatan Batasan Pemeriksaan

- Aplikasi pesan instan (seperti WhatsApp dan Telegram) serta sebagian besar platform lokapasar mengompresi ulang gambar dan menghapus tag EXIF saat foto diunggah. Ketiadaan metadata kamera pada berkas semacam itu wajar terjadi dan bukan bukti tunggal bahwa gambar dibuat oleh AI.
- Tangkapan layar (screenshot), kolase berbingkai teks, atau foto beresolusi sangat rendah memiliki detail tekstur sensor yang terbatas sehingga akurasi pemisahan kelas dapat menurun dibanding berkas foto asli dari perangkat kamera.
