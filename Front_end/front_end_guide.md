# 🛡️ AI vs. Authentic Product Detection System - Front-End Specification

Dokumentasi ini berisi panduan arsitektur, kebutuhan antarmuka (UI/UX), alur kerja (user flow), serta integrasi API untuk pengembangan sisi **Front-End** dari sistem deteksi produk (Gambar/Teks/Metadata Asli vs. Buatan AI).

---

## 🚀 1. Tech Stack Rekomendasi
Untuk membangun front-end yang responsif, cepat, dan interaktif, berikut adalah rekomendasi *stack*:
*   **Framework:** React.js (Next.js jika butuh SEO/SSR) atau Vue.js (Nuxt.js).
*   **Styling:** Tailwind CSS / Shadcn UI (untuk komponen siap pakai yang modern).
*   **State Management:** Zustand atau Redux Toolkit (jika aplikasi semakin kompleks).
*   **HTTP Client:** Axios atau Fetch API untuk komunikasi dengan Backend AI.
*   **File Upload Handler:** React Dropzone (untuk mempermudah *drag-and-drop* file gambar produk).

---

## 🎨 2. Kebutuhan Halaman & UI/UX (Pages & Components)

### A. Dashboard / Main Landing Page
Halaman utama tempat pengguna melakukan pemindaian/analisis produk.
*   **Hero Section:** Kalimat pengantar yang jelas tentang fungsi alat penapis ini.
*   **Upload Area (Dropzone):** Kotak interaktif untuk *drag & drop* gambar produk atau memasukkan URL gambar produk.
*   **Text Input Field (Optional):** Kolom untuk memasukkan deskripsi atau review produk jika sistem juga mendeteksi teks buatan AI.
*   **Analyze Button:** Tombol CTA (Call to Action) yang memicu proses pengiriman data ke API backend.

### B. Result Page / Modal (Halaman Hasil Analisis)
Menampilkan output dari model AI setelah proses analisis selesai.
*   **Confidence Score Gauge:** Visualisasi lingkaran (radial progress bar) atau bar yang menunjukkan persentase probabilitas (Contoh: `85% Kemungkinan Buatan AI` / `92% Produk Asli`).
*   **Status Badge:** Label warna yang tegas:
    *   🔴 **AI-Generated / FAKE** (Merah)
    *   🟢 **Authentic / REAL** (Hijau)
    *   🟡 **Suspicious / Low Confidence** (Kuning)
*   **Heatmap / Explanability Visual (Optional):** Jika backend mendukung Grad-CAM, tampilkan area gambar mana yang terindikasi hasil manipulasi AI.
*   **Detail Analisis:** Breakdown poin-poin alasan mengapa terdeteksi AI (misal: noise janggal pada tekstur, pencahayaan tidak konsisten, teks pada gambar rusak).

### C. History Page (Riwayat Pemindaian)
Halaman opsional (jika pengguna memiliki akun/login) untuk melihat produk apa saja yang sudah diperiksa sebelumnya.

---

## 🔄 3. Alur Pengguna (User Flow)

1. **Upload:** User masuk ke web -> Unggah gambar produk (PNG/JPG).
2. **Loading State:** Front-end menampilkan animasi *skeleton* atau *spinner loader* yang menarik selagi menunggu respon API.
3. **Processing:** Front-end mengirimkan file *form-data* ke backend AI.
4. **Display:** Hasil diterima -> Front-end me-render visualisasi skor dan detail deteksi ke layar.

---

## 🔌 4. Kontrak Integrasi API (Contoh Endpoint)

Front-end akan berinteraksi dengan Backend AI menggunakan format data berikut:

### POST `/api/v1/detect-product`
**Headers:** `Content-Type: multipart/form-data`

**Request Body (FormData):**
```javascript
{
  "image": File // File gambar produk yang diunggah
}
```

**Response Success (200 OK):**
```json
{
  "status": "success",
  "data": {
    "is_ai_generated": true,
    "confidence_score": 0.894, // 89.4%
    "analysis_timestamp": "2026-11-03T08:21:00Z",
    "details": {
      "texture_anomaly": "high",
      "lighting_consistency": "poor",
      "metadata_check": "no_camera_data"
    }
  }
}
```

---

## 💡 5. Fitur Tambahan & Best Practices (Tips Front-End)
*   **Image Compression:** Kompres gambar di sisi *client* sebelum diunggah agar menghemat bandwidth dan mempercepat respon backend (bisa pakai library `browser-image-compression`).
*   **Error Handling:** Buat UI khusus jika server *timeout*, format file salah (misal upload PDF padahal harus gambar), atau ukuran file terlalu besar (>5MB).
*   **Mobile Friendly:** Pastikan area *upload* mudah ditekan via smartphone karena banyak user yang akan langsung memotret produk menggunakan kamera HP mereka.
