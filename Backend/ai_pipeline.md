# TraceAI: AI Detection Pipeline & Scoring Rules

Dokumen ini menjelaskan arsitektur model Computer Vision (`SwinForImageClassification`, versi `v6_product_matched_antiforgetting_fp16`), tahapan preprocessing `center_crop_fit` 224x224 beserta Test-Time Augmentation (`tta: true`), ambang batas terkalibrasi (`threshold: 0.65`), dan ekstraksi peta aktivasi Grad-CAM.

---

## 1. Spesifikasi Model & Preprocessing Input (`huggingface_swin`)

Model dimuat satu kali saat startup server dari folder lokal `Backend/models/` (`local_files_only=True`) dan dikonversi ke `float32` dalam mode `.eval()` agar inferensi CPU/GPU dan perhitungan gradien Grad-CAM stabil:

* **Konfigurasi Aplikasi:** `Backend/models/traceai_config_final.json` (`version: "v6_product_matched_antiforgetting_fp16"`, `best_epoch: 3`, `best_val_loss: 0.1919`, `threshold: 0.65`, `tta: true`)
* **Konfigurasi HuggingFace:** `Backend/models/config.json` & `Backend/models/preprocessor_config.json`
* **Bobot Model:** `Backend/models/model.safetensors` (FP16 safetensors ~173.5 MB)
* **Arsitektur & Base Model:** `swin_transformer` (`SwinForImageClassification`, fine-tuned dari `Organika/sdxl-detector`, `embed_dim: 128`, `depths: [2, 2, 18, 2]`, `window_size: 7`)
* **Validasi Pemetaan Kelas (`id2label` & `label2id`):**
  * Index `0`: `"NON_AI"` (Gambar produk asli)
  * Index `1`: `"AI_GENERATED"` (Gambar buatan AI)
  * Saat startup, `main.py` memvalidasi silang `id2label`, `label2id`, dan `class_names` agar urutan label tidak pernah tertukar.
* **Tahapan Preprocessing (`center_crop_fit`):**
  1. Menormalkan orientasi gambar berdasarkan tag EXIF menggunakan `ImageOps.exif_transpose` lalu mengonversi ke `RGB`.
  2. Menerapkan `ImageOps.fit(..., (224, 224), method=Image.Resampling.BICUBIC)` sesuai `image_size: 224` dan `resample: 3` di `preprocessor_config.json`.
  3. Mengonversi piksel ke tensor `[0.0, 1.0]` dan menormalisasi dengan mean `[0.485, 0.456, 0.406]` serta std `[0.229, 0.224, 0.225]`.

---

## 2. Inferensi TTA & Ambang Batas Terkalibrasi

1. **Test-Time Augmentation (`tta: true`):**
   * Saat `tta` bernilai `true` di `traceai_config_final.json`, backend mengevaluasi gambar asli dan cerminan horizontalnya (`torch.flip`), kemudian merata-ratakan probabilitas softmax kedua tampilan tersebut.
2. **Skor Probabilitas & Keyakinan:**
   * `ai_probability`: skor kelas `AI_GENERATED` dalam skala `0.0 - 100.0`.
   * `non_ai_probability`: skor kelas `NON_AI` dalam skala `0.0 - 100.0`.
   * `confidence_percent`: tingkat keyakinan terkalibrasi (`50.0% - 100.0%`) berdasarkan jarak skor terhadap ambang batas operasi (`65.0%`).
3. **Ambang Batas Operasi (`threshold: 0.65`):**
   * Gambar ditandai `is_ai_generated = true` apabila `ai_probability >= 65.0%`.

---

## 3. Aturan Klasifikasi Output

| Rentang Skor (`ai_probability`) | Status `is_ai_generated` | Klasifikasi | Kesimpulan (`verdict_text`) |
| :--- | :--- | :--- | :--- |
| **`80.0% - 100.0%`** | `true` | `AI tinggi` | *"Terdeteksi kuat sebagai gambar buatan AI."* |
| **`65.0% - 79.9%`** | `true` | `AI sedang` | *"Terindikasi buatan AI atau mengalami manipulasi digital."* |
| **`32.6% - 64.9%`** | `false` | `AI rendah` | *"Kemungkinan gambar asli, dengan sedikit artefak kompresi."* |
| **`0.0% - 32.5%`** | `false` | `AI rendah` | *"Kemungkinan besar gambar produk asli."* |

---

## 4. Struktur Bukti Forensik (`anomalies`, `heatmap`, `image_meta`, `breakdown`)

* **`anomalies` & `heatmap`:** Dihitung dari Grad-CAM stage terakhir `model.swin` (`last_hidden_state` 7x7) terhadap selisih logit `AI_GENERATED - NON_AI`, lalu diproyeksikan kembali ke koordinat gambar penuh sebelum crop. Dikirim hanya ketika `is_ai_generated == true`.
* **`image_meta` & `model_info`:** Menyertakan resolusi piksel asli, format biner, ukuran byte, perangkat kamera EXIF, tag software, serta parameter model aktif agar dapat ditampilkan secara transparan di Frontend.
