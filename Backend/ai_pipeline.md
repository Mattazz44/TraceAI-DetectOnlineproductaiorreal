# TraceAi — AI Detection Pipeline & Scoring Rules

Dokumen ini menjelaskan arsitektur model *Computer Vision* (`efficientnet_b0`) versi final yang telah dilatih pada dataset produk terkurasi, tahapan *preprocessing* tensor resolusi 384×384 sesuai `traceai_config_final.json`, aturan ambang batas (*calibrated threshold* 0.12), serta struktur bukti temuan untuk sistem deteksi gambar produk **TraceAi**.

---

## 1. Spesifikasi Model & Preprocessing Input (`_final`)

Model Machine Learning dimuat satu kali saat *startup* server menggunakan `map_location="cpu"` (kemudian dipindahkan ke `cuda` jika tersedia) dalam mode `.eval()`:

* **Konfigurasi Utama:** `Backend/models/traceai_config_final.json` (`best_epoch: 9`, `seed: 42`, `threshold: 0.12`)
* **Bobot Model Utama:** `Backend/models/traceai_efficientnet_b0_final.pth`
* **Bobot Model Cadangan:** `Backend/models/traceai_best_model_final.pth`
* **Arsitektur Model Utama:** `efficientnet_b0` (`torchvision.models.efficientnet_b0`) dengan layer klasifikasi akhir (`classifier[1]`) disesuaikan untuk 2 kelas.
* **Dataset Training & Validasi:** Dataset produk e-commerce terkurasi (`V3_CURATED`, `PRODUCT_V1`, `V3_NORM`) mencakup foto produk asli dan gambar sintetis generator modern (Flux Schnell, Wuerstchen, SDXL, Stable Diffusion 1.5, Kandinsky 2.2, PixArt Sigma).
* **Kelas Target (`class_names`):**
  * Index `0`: `"NON_AI"` (Foto produk asli)
  * Index `1`: `"AI_GENERATED"` (Gambar hasil generator AI)
* **Ukuran Input Gambar:** **`384 × 384` piksel** (`image_size: 384`).
* **Tahapan Preprocessing Gambar:**
  1. Perbaiki orientasi gambar dari tag EXIF menggunakan **`ImageOps.exif_transpose`** lalu konversi mode warna ke **`RGB`** (`PIL.Image.convert("RGB")`).
  2. *Resize* ukuran gambar ke **`384 × 384` piksel** (`image_size: 384`) melalui `torchvision.transforms.Resize((384, 384))`.
  3. Konversi ke tensor `float32` dalam rentang `[0.0, 1.0]` menggunakan `torchvision.transforms.ToTensor()`.
  4. Normalisasi kanal warna ImageNet melalui `torchvision.transforms.Normalize`:
     * `normalization_mean`: `[0.485, 0.456, 0.406]`
     * `normalization_std`: `[0.229, 0.224, 0.225]`

---

## 2. Logika Inferensi & Perhitungan Skor (`ai_probability`)

1. **Forward Pass (Tanpa Gradien):**
   * Model dijalankan dalam mode evaluasi (`model.eval()`) di dalam blok `torch.no_grad()`.
2. **Probabilitas Softmax Dinamis:**
   * Output *logits* dari model dikonversi menjadi distribusi probabilitas menggunakan `torch.softmax(logits, dim=1)`.
   * Indeks kelas `"AI_GENERATED"` dicari secara dinamis dari `class_names` (`class_names.index("AI_GENERATED")`), dikalikan `100.0`, lalu dikonversi ke tipe `float` standar Python (`0.0` – `100.0`) untuk mengisi field `ai_probability`.
3. **Calibrated Operating Threshold (Ambang Batas Terkalibrasi):**
   * Model menggunakan ambang batas optimal hasil validasi F1: **`0.12` (12.0%)**.
   * Jika `ai_probability >= 12.0%`, status `is_ai_generated` bernilai `true`.
4. **Ekstraksi Metadata Forensik Pendamping (EXIF):**
   * Menggunakan `exifread` untuk memeriksa keberadaan metadata perangkat kamera fisik (`Image Make`, `Image Model`) sebagai bukti tambahan pada bagian `breakdown.metadata`.

---

## 3. Ambang Batas Klasifikasi (Threshold Rules)

Nilai `ai_probability` (`0.0 – 100.0`) diterjemahkan ke dalam status UI Front-End menggunakan aturan berikut:

| Rentang Skor (`ai_probability`) | Label Klasifikasi (`classification`) | Warna Badge UI | Keyakinan Model (`model_confidence`) | Teks Kesimpulan (`verdict_text`) |
| :--- | :--- | :--- | :--- | :--- |
| **`75.0% – 100.0%`** | `AI tinggi` | 🟠 Oranye | `Tinggi` ($\ge 85\%$) / `Sedang` | *"Gambar ini sangat mungkin hasil generator AI."* |
| **`12.0% – 74.9%`** | `AI sedang` | 🟡 Kuning | `Sedang` ($\ge 35\%$) / `Rendah` | *"Gambar terindikasi sintetis atau manipulasi digital."* |
| **`0.0% – 11.9%`** | `AI rendah` | 🟢 Hijau Neon | `Tinggi` ($\le 6\%$) / `Sedang` | *"Gambar ini kemungkinan besar foto produk asli."* |

---

## 4. Struktur "Bukti Temuan" (`anomalies`, `heatmap`, & `breakdown`)

Untuk mengisi halaman **Bukti Temuan** di Front-End secara akurat dan konsisten:
1. **`anomalies` (Grad-CAM Bounding Box):** Jika `is_ai_generated == true`, backend menghitung **Grad-CAM** pada layer konvolusi akhir (`model.features`) terhadap selisih logit `AI_GENERATED - NON_AI`, lalu mengekstrak 1–3 area aktivasi tertinggi menjadi koordinat `[ymin, xmin, ymax, xmax]` (skala `0 – 1000`) yang dipetakan ke indikator `texture`, `text_logo`, atau `lighting`. Jika `is_ai_generated == false` (`AI rendah`), `anomalies` dikembalikan sebagai `[]`.
2. **`heatmap` (Grad-CAM Overlay):** Peta panas RGBA PNG (64×64, base64 data URL) yang dapat ditumpuk langsung di atas pratinjau gambar pada `EvidenceScreen.jsx`.
3. **`breakdown`:** Menyediakan 4 metrik pemeriksaan (`texture`, `text_logo`, `lighting`, dan `metadata`) yang sinkron dengan hasil inferensi model dan pemeriksaan EXIF.
