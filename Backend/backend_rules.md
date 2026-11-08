#  TraceAi — Backend Rules & Architecture Specification

Dokumen ini berisi aturan teknis, standar keamanan, alur pemrosesan gambar (*image pipeline*), dan kontrak API untuk sisi **Backend** sistem deteksi produk asli vs. buatan AI.

---

##  1. Tech Stack & Struktur Proyek

Backend dibangun menggunakan ekosistem Python agar mudah diintegrasikan dengan model *Computer Vision* dan ekstraksi metadata forensik.

*   **Framework:** FastAPI (Python 3.10+) — Cepat, mendukung *async*, dan otomatis menghasilkan dokumentasi Swagger UI.
*   **Image & Forensics:** `Pillow` (validasi gambar), `ExifRead` (ekstraksi metadata kamera), `c2pa-python` (deteksi *Content Credentials* / watermark kriptografi AI).
*   **AI Inference:** PyTorch / HuggingFace `transformers` / OpenCV (atau integrasi API detektor eksternal).
*   **Database (Riwayat Scan):** SQLite (untuk development) / PostgreSQL (untuk produksi).

### Struktur Direktori Rekomendasi
```text
backend/
├── app/
│   ├── main.py              # Entry point FastAPI & konfigurasi CORS
│   ├── api/
│   │   └── v1/
│   │       └── scan.py      # Endpoint /scan & /history
│   ├── core/
│   │   ├── config.py        # Environment variables & batasan ukuran file
│   │   └── security.py      # Rate limiting & validasi magic bytes
│   ├── services/
│   │   ├── metadata.py      # Ekstraksi EXIF & C2PA
│   │   ├── detector.py      # Model AI inference & generator bounding box
│   │   └── cleanup.py       # Penghapusan otomatis file sementara
│   └── schemas/
│       └── scan_schema.py   # Pydantic models (Request & Response)
├── temp_uploads/            # Penyimpanan sementara (auto-delete)
├── requirements.txt
└── BACKEND_RULES.md
```

---

## 2. Aturan Validasi & Keamanan (Guardrails)

Setiap request yang masuk ke server wajib melewati filter berikut sebelum menyentuh model AI:

1.  **Validasi Tipe File (Strict MIME & Magic Bytes):**
    *   Hanya izinkan format: `image/jpeg`, `image/png`, dan `image/webp`.
    *   Wajib memeriksa *magic bytes* (header biner file), bukan hanya ekstensi nama file, untuk mencegah unggahan file berbahaya yang di-rename.
2.  **Batas Ukuran & Resolusi:**
    *   Maksimal ukuran file: **10 MB** (`413 Payload Too Large` jika melebihi).
    *   Minimal resolusi gambar: **256x256 piksel** (gambar terlalu kecil tidak akurat untuk analisis tekstur).
3.  **Sanitasi Nama File:**
    *   Jangan pernah menyimpan file dengan nama asli dari user. Ubah menjadi format UUID (contoh: `550e8400-e29b-41d4.jpg`) untuk mencegah serangan *Path Traversal*.
4.  **Rate Limiting & CORS:**
    *   Batasi maksimal **10 request per menit** per alamat IP untuk mencegah penyalahgunaan resource GPU/CPU.
    *   Konfigurasi CORS hanya mengizinkan origin front-end resmi (misal: `http://localhost:5173`).

---

## 3. Alur Pemrosesan Gambar (Image Pipeline)

Urutan eksekusi di dalam service backend **tidak boleh dibalik** agar data forensik tidak hilang:
---

## 4. Kontrak API (Endpoint Specification)

### A. Pemindaian Gambar (`POST /api/v1/scan`)
Menerima file gambar dan mengembalikan skor probabilitas beserta bukti temuan yang sesuai dengan UI Front-End.

*   **Headers:** `Content-Type: multipart/form-data`
*   **Body:** `image` (File)

**Response Success (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "scan_id": "scn_89210",
    "filename": "foto-lampu-01.jpg",
    "timestamp": "2026-11-07T22:13:00Z",
    "ai_probability": 86,
    "classification": "AI tinggi",
    "model_confidence": "Sedang",
    "verdict_text": "Gambar ini sangat mungkin hasil generator AI.",
    "anomalies": [
      {
        "box":,
        "label": "Area janggal"
      },
      {
        "box":,
        "label": "Area janggal"
      }
    ],
    "breakdown": {
      "texture": {
        "status": "Janggal",
        "description": "Terlalu halus dan seragam, tanpa noise kamera yang wajar."
      },
      "text_logo": {
        "status": "Janggal",
        "description": "Huruf pada kemasan terdistorsi dan tidak terbaca."
      },
      "lighting": {
        "status": "Wajar",
        "description": "Arah bayangan konsisten dengan sumber cahaya."
      },
      "metadata": {
        "status": "Kosong",
        "description": "Tidak ada data kamera maupun tanda C2PA."
      }
    }
  }
}
```

### B. Riwayat Pemindaian (`GET /api/v1/history`)
Mengambil daftar riwayat scan untuk ditampilkan di halaman **Riwayat Scan**.

*   **Query Params (Opsional):** `?search=lampu&filter=ai_tinggi`

---

## 5. Standar Penanganan Error (HTTP Status Codes)

Backend wajib mengembalikan format error JSON yang konsisten agar Front-End bisa menampilkan pesan notifikasi (*Toast/Alert*) yang jelas kepada user:

| Status Code | Kondisi | Pesan Error Rekomendasi |
| :--- | :--- | :--- |
| **`400 Bad Request`** | File rusak (*corrupt*) atau tidak terbaca. | `"File gambar tidak valid atau rusak."` |
| **`413 Payload Too Large`** | Ukuran gambar melebihi 10 MB. | `"Ukuran gambar terlalu besar. Maksimal 10 MB."` |
| **`415 Unsupported Media Type`** | Format bukan JPG, PNG, atau WebP. | `"Format file tidak didukung. Gunakan JPG, PNG, atau WebP."` |
| **`429 Too Many Requests`** | User melewati batas rate limit. | `"Terlalu banyak permintaan. Silakan tunggu 1 menit."` |
| **`500 Internal Server Error`** | Model AI gagal memproses gambar. | `"Terjadi kesalahan pada server saat menganalisis gambar."` |

---

## 6. Aturan Penyimpanan & Privasi (Data Retention)
*   **Zero-Retention untuk Gambar Mentah:** Gambar yang diunggah user **wajib langsung dihapus** dari folder `temp_uploads/` menggunakan `BackgroundTasks` FastAPI segera setelah response JSON dikirimkan.
*   **Thumbnail Riwayat:** Jika fitur riwayat membutuhkan gambar pratinjau (*thumbnail*), simpan versi resolusi rendah (misal lebar maksimal `150px`) atau simpan langsung di `localStorage` sisi browser user agar beban penyimpanan server tetap ringan.
