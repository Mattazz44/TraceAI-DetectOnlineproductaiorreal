# TraceAi — Panduan Instalasi & Cara Pakai Aplikasi

**TraceAi** adalah aplikasi web deteksi keaslian gambar produk yang membantu pengguna memeriksa apakah foto produk (katalog, iklan, atau ulasan) merupakan **foto asli kamera** atau **buatan generator AI**.

Dokumen ini berisi panduan lengkap **cara menjalankan proyek (Developer Guide)** serta **cara menggunakan fitur-fitur di dalam aplikasi (User Guide)**.

---

## Struktur Folder Proyek

```text
Project viskom trace ai/
├── Backend/                  # Server API FastAPI (Python) & ekstraksi EXIF
│   ├── main.py               # Entry point endpoint /api/v1/scan
│   ├── requirements.txt      # Daftar dependensi Python
│   ├── ai_pipeline.md        # Dokumentasi arsitektur & aturan skor AI
│   ├── backend_rules.md      # Aturan keamanan & kontrak API
│   └── DEPLOYMENT_AND_ENV.md # Panduan environment & deployment
├── Front_end/
│   ├── front_end_guide.md    # Spesifikasi awal antarmuka Front-End
│   └── traceai-web/          # Aplikasi Web React + Vite + Tailwind CSS v4
│       ├── src/              # Komponen halaman (Home, Analysis, Evidence, History)
│       ├── .env.example      # Contoh konfigurasi environment variabel
│       └── package.json      # Konfigurasi dependensi Node.js
├── PRD.md                    # Product Requirements Document (PRD) lengkap
└── README.md                 # Panduan instalasi & cara pakai aplikasi (file ini)
```

---

## Bagian 1: Cara Menjalankan Aplikasi di Komputer (Lokal)

### Prasyarat (Prerequisites)
* **Node.js** (versi 18 atau lebih baru) & `npm`
* **Python** (versi 3.10 atau lebih baru)

---

### Langkah 1 — Menyalakan Server Back-End (Terminal 1)

1. Buka terminal dan masuk ke folder `Backend`:
   ```powershell
   cd Backend
   ```
2. Buat dan aktifkan *virtual environment* Python (jika belum ada):
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
   *(Untuk pengguna Mac/Linux gunakan: `source venv/bin/activate`)*
3. Instal seluruh library Python yang dibutuhkan:
   ```powershell
   pip install -r requirements.txt
   ```
4. Jalankan server FastAPI di port `8000`:
   ```powershell
   uvicorn main:app --reload --port 8000
   ```
   * Server Back-End aktif di: **`http://localhost:8000`**
   * Dokumentasi interaktif (Swagger UI) dapat dibuka di: **`http://localhost:8000/docs`**

---

### Langkah 2 — Menyalakan Aplikasi Front-End (Terminal 2)

1. Buka **terminal baru** (biarkan Terminal 1 tetap menyala), lalu masuk ke folder `Front_end/traceai-web`:
   ```powershell
   cd "Front_end\traceai-web"
   ```
2. Instal paket dependensi Front-End:
   ```powershell
   npm install
   ```
3. Pastikan file `.env` sudah ada di dalam folder `Front_end/traceai-web` (atau salin dari `.env.example`):
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_MAX_UPLOAD_MB=10
   ```
4. Jalankan server pengembangan Vite:
   ```powershell
   npm run dev
   ```
5. Buka browser dan akses alamat yang muncul: **`http://localhost:5173`**

---

## Bagian 2: Cara Menggunakan Aplikasi (Panduan Pengguna)

### 1. Mengunggah atau Memotret Gambar Produk (Halaman Utama)
Saat pertama kali membuka aplikasi, Anda berada di **Halaman Utama**:
* **Drag & Drop / Klik Kotak Putus-Putus:** Tarik file gambar produk (`JPG`, `PNG`, atau `WebP`, maks. 10 MB) langsung ke dalam kotak **"Taruh gambar di sini"**.
* **Tombol "Ambil foto":** Jika dibuka dari HP, tombol hijau neon ini akan langsung membuka kamera belakang HP untuk memotret produk secara langsung.
* **Tombol "Pilih dari galeri":** Membuka galeri foto atau File Explorer untuk memilih gambar.
* **Paste Cepat (`Ctrl + V`):** Di laptop/PC, Anda juga bisa menyalin gambar (*Copy Image*) lalu langsung menekan `Ctrl + V` di halaman utama.

> **Tips Akurasi:** Gunakan file gambar ukuran asli. Hindari menggunakan hasil *screenshot* atau gambar yang sudah dikompres berulang kali lewat aplikasi chat karena metadata kamera aslinya bisa hilang.

---

### 2. Membaca Hasil Analisis (Halaman Hasil Scan)
Begitu gambar dipilih, aplikasi akan menampilkan animasi pemindaian laser hijau (**"Menganalisis gambar…"**), lalu menampilkan hasil:
* **Skor Kemungkinan Buatan AI (`0% – 100%`):**
  * 🟠 **`75% – 100%` (AI Tinggi):** Gambar sangat mungkin dihasilkan oleh generator AI.
  * 🟡 **`40% – 74%` (Belum Pasti):** Gambar memiliki indikasi manipulasi atau terkompresi berat.
  * 🟢 **`0% – 39%` (AI Rendah):** Gambar kemungkinan besar merupakan foto produk asli.
* **Keyakinan Model (`Rendah` / `Sedang` / `Tinggi`):** Menunjukkan seberapa yakin detektor terhadap kesimpulan tersebut.
* Di bagian bawah layar terdapat dua tombol:
  * **"Scan lagi"**: Kembali ke halaman utama untuk memeriksa gambar lain.
  * **"Lihat bukti"**: Membuka rincian bukti forensik pada gambar.

---

### 3. Memeriksa Rincian Forensik & Membagikan Hasil (Halaman Bukti Temuan)
Saat Anda menekan tombol **"Lihat bukti"**, Anda akan melihat:
* **Gambar dengan Penanda "Area janggal":** Kotak berwarna oranye menandai area visual pada gambar yang memiliki anomali tekstur atau teks.
* **4 Kartu Pemeriksaan Forensik:**
  1. **Tekstur permukaan** — Apakah permukaan objek terlalu mulus/halus khas AI atau memiliki *noise* kamera alami.
  2. **Teks dan logo** — Apakah tulisan pada kemasan terbaca jelas atau terdistorsi.
  3. **Cahaya dan bayangan** — Apakah arah bayangan konsisten dengan sumber cahaya.
  4. **Metadata** — Apakah ditemukan data kamera fisik (EXIF seperti merek/tipe kamera) atau tanda kriptografi C2PA.
* **Tips Interaktif:** Ketuk salah satu kartu pemeriksaan (atau ketuk kotak oranye pada gambar) untuk membuka tips cara mengecek kejanggalan tersebut secara manual beserta sorotan area terkait.
* **Tombol "Bagikan hasil":**
  * **Di HP:** Membuka menu *Share* bawaan HP untuk mengirim hasil langsung ke WhatsApp, Telegram, X, atau Instagram.
  * **Di Laptop/PC:** Menyalin teks ringkasan hasil & tautan secara otomatis ke *clipboard* (tinggal `Ctrl + V` di aplikasi chat).
* **Tombol "Kembali ke layar utama":** Langsung kembali ke halaman awal untuk melakukan scan baru.

---

### 4. Melihat & Mencari Riwayat Pemindaian (Halaman Riwayat Scan)
* Klik **ikon Jam (`🕒`)** di pojok kanan atas halaman utama (atau tombol **"Lihat semua"** pada bagian *Terakhir di-scan*).
* **Kotak Pencarian:** Ketik nama file atau produk untuk mencari riwayat tertentu.
* **Tombol Filter (`Semua` | `AI tinggi` | `AI rendah`):** Saring daftar riwayat berdasarkan hasil deteksinya.
* **Buka Ulang Hasil:** Ketuk salah satu baris riwayat untuk melihat kembali skor, gambar pratinjau, dan bukti temuannya tanpa perlu mengunggah ulang file.
* **Tombol "Scan produk baru":** Kembali ke halaman utama untuk memindai produk baru.

