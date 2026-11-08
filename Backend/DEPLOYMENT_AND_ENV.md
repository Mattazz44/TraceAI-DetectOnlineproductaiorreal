# TraceAi — Environment Variables & Deployment Guide

Dokumen ini berisi panduan konfigurasi variabel lingkungan (`.env`), cara menjalankan keseluruhan sistem secara lokal (*full-stack*), serta spesifikasi server untuk kebutuhan produksi.

---

## 1. Konfigurasi Environment Variables (`.env`)

Jangan pernah mengunggah file `.env` asli ke GitHub. Gunakan template di bawah ini untuk membuat file `.env` di masing-masing folder.

### A. Front-End (`frontend/.env`)
```env
# URL endpoint utama Backend API
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Batas maksimal ukuran upload di sisi client (dalam MB)
VITE_MAX_UPLOAD_MB=10
```

### B. Back-End (`backend/.env`)
```env
# Konfigurasi Server
APP_ENV=development
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173

# Konfigurasi Model & Keamanan
MODEL_WEIGHTS_PATH=./weights/traceai_vit_v1.pth
DEVICE=cuda  # Ubah ke 'cpu' jika server tidak memiliki GPU NVIDIA
MAX_FILE_SIZE_MB=10
RATE_LIMIT_PER_MINUTE=10
```

---

## 2. Cara Menjalankan Lokal (Full-Stack Quick Start)

Pastikan kamu membuka **2 terminal terpisah** untuk menjalankan Front-End dan Back-End secara bersamaan:

### Terminal 1: Menjalankan Back-End (FastAPI)
```bash
cd backend
python -m venv venv
# Aktivasi virtual environment (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*API Swagger UI dapat diakses di: `http://localhost:8000/docs`*

### Terminal 2: Menjalankan Front-End (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Aplikasi Web dapat diakses di: `http://localhost:5173`*

---

## 3. Rekomendasi Hosting & Spesifikasi Server

Karena sistem ini menjalankan inferensi model *Computer Vision*, pemisahan hosting antara Front-End dan Back-End sangat disarankan:

*   **Front-End Hosting:** **Vercel** atau **Netlify** (Gratis, otomatis terhubung ke GitHub, CDN cepat).
*   **Back-End & AI Hosting:** **Hugging Face Spaces**, **Railway**, **Render**, atau VPS Cloud (AWS EC2 / GCP).
*   **Spesifikasi Minimum Server Back-End:**
    *   **CPU:** Minimal 2 vCPU (4 vCPU direkomendasikan jika tanpa GPU).
    *   **RAM:** Minimal **4 GB RAM** (untuk memuat bobot model PyTorch dan memproses gambar resolusi tinggi tanpa *Out of Memory*).
    *   **Storage:** Minimal 10 GB SSD (karena gambar user langsung dihapus otomatis setelah diproses).
