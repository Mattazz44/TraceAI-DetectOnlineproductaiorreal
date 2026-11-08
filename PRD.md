# Product Requirements Document (PRD) — TraceAi

| Informasi Dokumen | Detail |
| :--- | :--- |
| **Nama Produk** | **TraceAi** — AI vs. Authentic Product Image Detector |
| **Versi Dokumen** | 1.0.0 |
| **Status** | MVP Ready (Front-End & Back-End Terintegrasi) |
| **Platform** | Mobile-First Web Application (Responsive PWA-Ready) |

---

## 1. Ringkasan Eksekutif (Executive Summary)

**TraceAi** adalah aplikasi web berbasis *Computer Vision* dan forensik digital yang membantu konsumen, pelaku UMKM, serta kurator *e-commerce* memverifikasi apakah sebuah foto produk (katalog, iklan, atau ulasan) merupakan **foto kamera asli** atau **hasil rekayasa generator AI** (seperti Midjourney, DALL-E, Flux, atau Stable Diffusion).

Melalui antarmuka *mobile-first* yang intuitif, pengguna cukup mengambil foto atau mengunggah gambar produk untuk mendapatkan **persentase kemungkinan buatan AI**, **tingkat keyakinan model**, serta **bukti temuan visual (Explainable AI)** berupa penandaan area janggal dan analisis 4 parameter forensik.

---

## 2. Latar Belakang & Rumusan Masalah (Problem Statement)

1. **Maraknya Penipuan Katalog Produk Berbasis AI:** Banyak penjual tidak bertanggung jawab di *marketplace* dan media sosial menggunakan gambar produk hasil generator AI yang tampak hiper-realistis namun barang aslinya jauh berbeda atau fiktif.
2. **Sulitnya Membedakan Gambar AI secara Kasat Mata:** Generator gambar modern menghasilkan pencahayaan yang tampak meyakinkan, sehingga konsumen awam kesulitan mendeteksi anomali tekstur atau distorsi mikro pada kemasan.
3. **Kurangnya Alat Deteksi yang Transparan (Explainable):** Sebagian besar detektor AI hanya menampilkan angka persentase tanpa menjelaskan *mengapa* gambar tersebut dicurigai sebagai buatan AI.

---

## 3. Tujuan Produk & Metrik Keberhasilan (Goals & Success Metrics)

### Tujuan Utama (Objectives)
* Menyediakan alat verifikasi keaslian foto produk yang cepat (< 3 detik per pemindaian) dan mudah diakses dari browser smartphone.
* Memberikan penjelasan bukti forensik yang mudah dipahami oleh pengguna non-teknis (*Explainable AI*).
* Memudahkan pengguna membagikan hasil temuan ke aplikasi pesan instan (WhatsApp, Telegram, media sosial) untuk mengedukasi pembeli lain.

### Indikator Keberhasilan (Key Performance Indicators)
* **Waktu Pemindaian (End-to-End Latency):** $\le 3$ detik untuk gambar berukuran hingga 10 MB.
* **Akurasi Model (F1-Score):** Target $\ge 88\%$ pada dataset gabungan foto produk komersial asli vs. sintetis.
* **Kemudahan Penggunaan (Mobile UX):** Seluruh alur utama dapat diselesaikan maksimal dalam 3 ketukan (*taps*).

---

## 4. Target Pengguna (Target Audience & Personas)

1. **Pembeli Online (Konsumen E-Commerce):** Ingin memastikan foto barang (pakaian, tas, elektronik, kuliner, furnitur) di katalog toko online adalah foto barang fisik asli sebelum membeli.
2. **Kurator & Moderator Marketplace:** Memeriksa laporan produk palsu atau iklan menyesatkan secara cepat.
3. **Pelaku UMKM & Kreator Konten:** Memverifikasi aset visual dari pemasok (*supplier*) agar menjaga kredibilitas toko mereka.

---

## 5. Spesifikasi Fitur & Kebutuhan Fungsional (Functional Requirements)

### 5.1. Halaman Utama / Pemindaian (`HomeScreen`)
* **Smart Dropzone:** Area unggah interaktif yang mendukung *drag-and-drop*, klik pilih file, serta tempel langsung dari *clipboard* (`Ctrl+V`).
* **Aksi Cepat Mobile:**
  * Tombol **"Ambil foto"**: Membuka kamera belakang smartphone secara langsung (`capture="environment"`).
  * Tombol **"Pilih dari galeri"**: Membuka pemilih file gambar (`JPG`, `PNG`, `WebP` hingga 10 MB).
* **Pratinjau Riwayat Terakhir ("Terakhir di-scan"):** Menampilkan hingga 3 hasil pemindaian terbaru di halaman utama beserta pintasan menuju halaman riwayat penuh.

### 5.2. Halaman Proses & Hasil Analisis (`AnalysisScreen`)
* **Animasi Pemindaian Aktif (*Scanning State*):** Menampilkan pratinjau gambar dengan garis laser hijau neon yang bergerak vertikal di atas grid pemindaian serta indikator status *"Menganalisis gambar…"*.
* **Kartu Kesimpulan Utama (*AI Verdict Card*):**
  * Menampilkan persentase **`0% – 100%` Kemungkinan Buatan AI** dengan animasi angka (*count-up*) dan progress bar berwarna sesuai ambang batas risiko.
  * Menampilkan kalimat kesimpulan tegas (contoh: *"Gambar ini sangat mungkin hasil generator AI."*).
* **Kartu Keyakinan Model (*Model Confidence Card*):** Menampilkan tingkat keyakinan detektor (`Rendah`, `Sedang`, `Tinggi`) beserta catatan edukasi mengenai pengaruh kompresi gambar.

### 5.3. Halaman Bukti Temuan Forensik (`EvidenceScreen`)
* **Visualisasi Area Janggal (*Annotated Image*):** Menampilkan kotak pembatas (*bounding box*) berwarna oranye di atas bagian gambar yang terdeteksi mencurigakan (hasil ekstraksi *Grad-CAM* / detektor anomali).
* **4 Kartu Metrik Forensik Interaktif (*Accordion Cards*):**
  1. **Tekstur Permukaan:** Mengevaluasi kehalusan kulit/permukaan dan pola *noise* sensor kamera (`Janggal` / `Wajar`).
  2. **Teks dan Logo:** Mengevaluasi kejelasan dan konsistensi karakter huruf pada label/kemasan produk (`Janggal` / `Wajar` / `Kosong`).
  3. **Cahaya dan Bayangan:** Mengevaluasi konsistensi arah jatuh bayangan terhadap sumber cahaya (`Wajar` / `Janggal`).
  4. **Metadata:** Menampilkan hasil pemeriksaan data EXIF kamera fisik (merek/model perangkat) dan tanda kriptografi C2PA (`Wajar` / `Kosong` / `Janggal`).
* **Interaksi Dua Arah:** Mengetuk kotak oranye pada gambar akan menyorot dan membuka kartu penjelasan terkait; membuka kartu penjelasan akan menyorot kotak terkait pada gambar.
* **Fitur Bagikan Hasil (*Native Share & Clipboard Fallback*):**
  * Pada perangkat *mobile*: Memicu *Native Web Share Sheet* (`navigator.share`) untuk membagikan ringkasan hasil langsung ke WhatsApp, Telegram, X, atau Instagram.
  * Pada perangkat *desktop*: Menyalin ringkasan hasil dan tautan secara otomatis ke *clipboard* disertai notifikasi *toast*.

### 5.4. Halaman Riwayat Pemindaian (`HistoryScreen`)
* **Pencarian & Filter Cepat:** Mencari riwayat berdasarkan nama file serta memfilter berdasarkan kategori (`Semua`, `AI tinggi` $\ge 50\%$, `AI rendah` $< 50\%$).
* **Pengelompokan Waktu Otomatis:** Mengelompokkan riwayat berdasarkan hari (*Hari ini*, *Kemarin*, atau nama hari & tanggal) lengkap dengan pratinjau gambar (*thumbnail*) beresolusi tajam di `localStorage`.

---

## 6. Logika Penilaian & Pipeline AI (Scoring & Detection Rules)

Skor akhir `ai_probability` dihitung menggunakan pendekatan **Hybrid Scoring**:

1. **Pemeriksaan C2PA / Content Credentials (Prioritas Mutlak):** Jika ditemukan metadata kriptografi generator AI resmi, skor dikunci pada **`99%` (`AI tinggi`)**.
2. **Inferensi Model Computer Vision (Bobot 85%):** Probabilitas *softmax* dari model pengklasifikasi citra (*Vision Transformer / ConvNeXt / ResNet*).
3. **Heuristik Metadata EXIF & Frekuensi (Bobot 15%):** Pemeriksaan keberadaan tag kamera fisik (`Image Make`, `Image Model`, parameter lensa) dan varians tekstur.

### Tabel Ambang Batas Klasifikasi (Thresholds)

| Rentang Skor (`ai_probability`) | Klasifikasi | Warna Indikator UI | Keyakinan Model | Kesimpulan Utama (`verdict_text`) |
| :--- | :--- | :--- | :--- | :--- |
| **`75% – 100%`** | `AI tinggi` | Oranye (`#FFAD1F`) | `Sedang` / `Tinggi` | *"Gambar ini sangat mungkin hasil generator AI."* |
| **`40% – 74%`** | `AI sedang` | Kuning (`#FFE066`) | `Rendah` / `Sedang` | *"Belum bisa dipastikan. Cek bukti sebelum mengambil keputusan."* |
| **`0% – 39%`** | `AI rendah` | Hijau Neon (`#CDF03C`) | `Tinggi` | *"Gambar ini kemungkinan besar foto produk asli."* |

---

## 7. Arsitektur Teknis & Tech Stack

### Front-End (`Front_end/traceai-web`)
* **Framework:** React 18 + Vite 6
* **Styling:** Tailwind CSS v4 (Custom Theme Palette & Smooth Keyframe Animations)
* **Ikonografi:** Lucide React
* **Penyimpanan Lokal:** Browser `localStorage` dengan kompresi *canvas thumbnail* (`max 800px`, JPEG `0.85`).

### Back-End (`Backend/`)
* **Framework API:** FastAPI (Python) + Uvicorn ASGI Server
* **Pemrosesan Citra & Forensik:** `Pillow` (validasi integritas gambar), `ExifRead` (ekstraksi metadata EXIF kamera)
* **Endpoint Utama:**
  * `GET /` — Health check status server.
  * `POST /api/v1/scan` — Menerima `multipart/form-data` (`image`), menjalankan validasi, ekstraksi EXIF, serta inferensi skor AI dan anomali.

---

## 8. Kebutuhan Non-Fungsional (Keamanan & Privasi)

1. **Validasi Ketat Unggahan File:**
   * Hanya menerima tipe MIME `image/jpeg`, `image/png`, dan `image/webp`.
   * Batas ukuran maksimal **10 MB** (`413 Payload Too Large`).
   * Verifikasi integritas biner gambar menggunakan `Pillow.Image.verify()` untuk menolak file rusak atau berbahaya (`400 Bad Request`).
   * Sanitasi nama file menggunakan `os.path.basename()`.
2. **Privasi Tanpa Penyimpanan Permanen (*Zero-Retention*):** File gambar yang diunggah pengguna diproses langsung di memori (`io.BytesIO`) dan tidak disimpan secara permanen di disk server.

---

## 9. Peta Jalan Pengembangan (Future Roadmap)

* **Fase 1 (Selesai — MVP Saat Ini):** Antarmuka lengkap 4 layar responsif, ekstraksi EXIF kamera asli, kontrak REST API FastAPI, riwayat lokal, dan fitur berbagi hasil.
* **Fase 2 (Integrasi Model Deep Learning):** Menghubungkan bobot model *Vision Transformer (ViT)* / *ConvNeXt* beserta ekstraksi *heatmap* **Grad-CAM** nyata ke dalam endpoint `POST /api/v1/scan`.
* **Fase 3 (Deteksi C2PA & OCR Kemasan):** Menambahkan pembacaan manifest `c2pa-python` serta modul OCR ringan untuk mendeteksi distorsi teks pada kemasan secara otomatis.
* **Fase 4 (Tautan Publik Berbagi Hasil):** Menyimpan laporan hasil scan secara opsional ke database cloud agar pengguna dapat membagikan tautan publik unik (misal `traceai.app/s/scn_89210`).

