# TraceAi — AI Detection Pipeline & Scoring Rules

Dokumen ini menjelaskan arsitektur model *Computer Vision* (`efficientnet_b0`) versi revisi yang telah dilatih, tahapan *preprocessing* tensor sesuai `traceai_config_revised.json`, aturan ambang batas (*threshold*), serta struktur bukti temuan untuk sistem deteksi gambar produk **TraceAi**.

---

## 1. Spesifikasi Model & Preprocessing Input (`_revised`)

Model Machine Learning dimuat satu kali saat *startup* server menggunakan `map_location="cpu"` (kemudian dipindahkan ke `cuda` jika tersedia) dalam mode `.eval()`:

* **Konfigurasi Utama:** `Backend/models/traceai_config_revised.json` (`best_epoch: 15`, `seed: 42`)
* **Bobot Model Utama:** `Backend/models/traceai_efficientnet_b0_cifake_revised.pth`
* **Bobot Model Fallback:** `Backend/models/traceai_best_model_revised.pth`
* **Arsitektur Model Utama:** `efficientnet_b0` (`torchvision.models.efficientnet_b0`) dengan layer klasifikasi akhir (`classifier[1]`) disesuaikan untuk 2 kelas.
* **Kelas Target (`class_names`):**
  * Index `0`: `"NON_AI"` (Foto produk asli)
  * Index `1`: `"AI_GENERATED"` (Gambar hasil generator AI)
* **Tahapan Preprocessing Gambar (Identik dengan Pipeline Evaluasi Colab):**
  1. Perbaiki orientasi gambar dari tag EXIF menggunakan **`ImageOps.exif_transpose`** lalu konversi mode warna ke **`RGB`** (`PIL.Image.convert("RGB")`).
  2. *Resize* ukuran gambar ke **`224 × 224` piksel** (`image_size: 224`) melalui `torchvision.transforms.Resize((224, 224))`.
  3. Konversi ke tensor `float32` dalam rentang `[0.0, 1.0]` menggunakan `torchvision.transforms.ToTensor()`.
  4. Normalisasi kanal warna menggunakan parameter dari `traceai_config_revised.json` melalui `torchvision.transforms.Normalize`:
     * `normalization_mean`: `[0.485, 0.456, 0.406]`
     * `normalization_std`: `[0.229, 0.224, 0.225]`

---

## 2. Logika Inferensi & Perhitungan Skor (`ai_probability`)

1. **Forward Pass (Tanpa Gradien):**
   * Model dijalankan dalam mode evaluasi (`model.eval()`) di dalam blok `torch.no_grad()`.
2. **Probabilitas Softmax Dinamis:**
   * Output *logits* dari model dikonversi menjadi distribusi probabilitas menggunakan `torch.softmax(logits, dim=1)`.
   * Indeks kelas `"AI_GENERATED"` dicari secara dinamis dari `class_names` (`class_names.index("AI_GENERATED")`), dikalikan `100.0`, lalu dikonversi ke tipe `float` standar Python (`0.0` – `100.0`) untuk mengisi field `ai_probability`.
3. **Ekstraksi Metadata Forensik Pendamping (EXIF):**
   * Menggunakan `exifread` untuk memeriksa keberadaan metadata perangkat kamera fisik (`Image Make`, `Image Model`) sebagai bukti tambahan pada bagian `breakdown.metadata`.

---

## 3. Ambang Batas Klasifikasi (Threshold Rules)

Nilai `ai_probability` (`0.0 – 100.0`) diterjemahkan ke dalam status UI Front-End menggunakan aturan berikut:

| Rentang Skor (`ai_probability`) | Label Klasifikasi (`classification`) | Warna Badge UI | Keyakinan Model (`model_confidence`) | Teks Kesimpulan (`verdict_text`) |
| :--- | :--- | :--- | :--- | :--- |
| **`75.0% – 100.0%`** | `AI tinggi` | 🟠 Oranye | `Tinggi` ($\ge 85\%$) / `Sedang` | *"Gambar ini sangat mungkin hasil generator AI."* |
| **`40.0% – 74.9%`** | `AI sedang` | 🟡 Kuning | `Rendah` / `Sedang` | *"Gambar terindikasi manipulasi atau terkompresi berat."* |
| **`0.0% – 39.9%`** | `AI rendah` | 🟢 Hijau Neon | `Tinggi` ($\le 15\%$) / `Sedang` | *"Gambar ini kemungkinan besar foto produk asli."* |

---

## 4. Struktur "Bukti Temuan" (`anomalies` & `breakdown`)

Karena model `efficientnet_b0` melakukan klasifikasi tingkat gambar utuh (*whole-image classification*):
1. **`anomalies`:** Dikembalikan sebagai list kosong `[]`. Komponen Front-End (`EvidenceScreen.jsx`) secara otomatis menampilkan label *"Tidak ada area janggal"* ketika `anomalies` bernilai `[]`.
2. **`breakdown`:** Tetap menyediakan 4 metrik pemeriksaan (`texture`, `text_logo`, `lighting`, dan `metadata`) yang disesuaikan dengan hasil inferensi model dan pemeriksaan EXIF agar tampilan kartu di halaman **Bukti Temuan** tetap informatif dan konsisten.
