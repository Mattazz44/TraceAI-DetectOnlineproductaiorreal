# TraceAi — AI Detection Pipeline & Scoring Rules

Dokumen ini menjelaskan arsitektur model *Computer Vision*, aturan pembobotan skor (*hybrid scoring*), pembagian ambang batas (*threshold*), serta logika ekstraksi bukti visual (*Grad-CAM*) untuk sistem deteksi gambar produk.

---

## 1. Arsitektur & Preprocessing Input

Sebelum gambar dievaluasi oleh model AI, gambar wajib melewati tahapan standarisasi berikut agar hasil prediksi konsisten:

*   **Arsitektur Model Utama:** Vision Transformer (ViT) / ConvNeXt / ResNet-50 (*Binary Classifier: Real vs. AI-Generated*).
*   **Dataset Acuan:** Kombinasi dataset foto produk komersial asli dan gambar sintetis (seperti **CIFAKE**, **Artifact**, serta generator modern Midjourney/Flux/DALL-E).
*   **Input Tensor:** Gambar di-resize ke resolusi standar model (misal `224x224` atau `384x384` piksel) dengan normalisasi *mean* dan *std* ImageNet.
*   **Catatan Kompresi:** Hindari kompresi ulang yang ekstrem sebelum inferensi karena artefak frekuensi tinggi (*high-frequency noise*) adalah indikator utama gambar AI.

---

## 2. Hybrid Scoring Logic (Penggabungan Forensik & AI)

Skor akhir (`ai_probability`) tidak hanya bergantung pada tebakan neural network, tetapi digabungkan dengan pemeriksaan metadata forensik:

1.  **C2PA / Content Credentials Check (Prioritas Tertinggi):**
    *   Jika file memiliki tanda kriptografi **C2PA** yang berasal dari generator AI (misal: *Adobe Firefly*, *DALL-E 3*), skor langsung dikunci ke **`99%`** (`AI tinggi`) tanpa perlu ragu.
2.  **Neural Network Inference (Bobot 85%):**
    *   Mengambil nilai probabilitas *softmax* dari kelas `AI-Generated`.
3.  **EXIF & Artifact Heuristics (Bobot 15%):**
    *   Mengecek keberadaan metadata kamera fisik (ISO, Aperture, Focal Length) serta pola *frequency domain* (FFT) untuk mendeteksi kehalusan tekstur yang tidak wajar.

---

## 3. Ambang Batas Klasifikasi (Threshold Rules)

Hasil persentase (`0% - 100%`) diterjemahkan ke dalam status UI Front-End menggunakan aturan berikut:

| Rentang Skor | Label Klasifikasi | Warna Badge UI | Keyakinan Model (`model_confidence`) | Teks Kesimpulan (`verdict_text`) |
| :--- | :--- | :--- | :--- | :--- |
| **`75% - 100%`** | `AI tinggi` | 🟠 Oranye / Merah | `Tinggi` / `Sedang` | *"Gambar ini sangat mungkin hasil generator AI."* |
| **`40% - 74%`** | `AI sedang` | 🟡 Kuning | `Rendah` / `Sedang` | *"Gambar terindikasi manipulasi atau terkompresi berat."* |
| **`0% - 39%`** | `AI rendah` | 🟢 Hijau Neon | `Tinggi` | *"Gambar ini kemungkinan besar foto produk asli."* |

---

## 4. Logika Ekstraksi "Bukti Temuan" (Explainable AI)

Untuk mengisi halaman **Bukti Temuan** di Front-End, pipeline AI melakukan 4 analisis terpisah:

1.  **Area Janggal (Visual Bounding Box):**
    *   Menggunakan **Grad-CAM** (*Gradient-weighted Class Activation Mapping*) pada layer terakhir model untuk mencari area dengan aktivasi gradien tertinggi.
    *   Area dengan intensitas panas di atas ambang batas dikonversi menjadi koordinat normalisasi `[ymin, xmin, ymax, xmax]` (skala `0 - 1000`) untuk digambar sebagai kotak oranye di UI.
2.  **Tekstur Permukaan:** Mengukur varians *noise* lokal. Jika terlalu seragam/halus $\rightarrow$ status `Janggal`.
3.  **Teks dan Logo:** Menggunakan deteksi teks (OCR ringan) untuk mengecek distorsi karakter pada kemasan produk $\rightarrow$ status `Janggal` jika skor kepercayaan OCR rendah pada area teks.
4.  **Cahaya dan Bayangan:** Mengevaluasi konsistensi arah gradien pencahayaan objek $\rightarrow$ status `Wajar` atau `Janggal`.
