# TraceAi — Environment Variables & Deployment Guide

Dokumen ini berisi panduan konfigurasi variabel lingkungan (`.env`), cara menginstal dependensi model Machine Learning (`PyTorch` & `TorchVision`), serta cara menjalankan keseluruhan sistem secara lokal (*full-stack*).

---

## 1. Konfigurasi Environment Variables (`.env`)

Jangan pernah mengunggah file `.env` asli ke GitHub. Gunakan template di bawah ini untuk membuat file `.env` di masing-masing folder.

### A. Front-End (`Front_end/traceai-web/.env`)
```env
# URL endpoint utama Backend API
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Batas maksimal ukuran upload di sisi client (dalam MB)
VITE_MAX_UPLOAD_MB=10
```

### B. Back-End (`Backend/.env` — Opsional)
Secara default, `Backend/main.py` otomatis memuat model dari `Backend/models/traceai_model_bundle.pth` dan memilih perangkat `cuda` (jika tersedia) atau `cpu`.
```env
# Konfigurasi Server
APP_ENV=development
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173

# Konfigurasi Model & Keamanan
MODEL_BUNDLE_PATH=./models/traceai_model_bundle.pth
MODEL_CONFIG_PATH=./models/traceai_config.json
MAX_FILE_SIZE_MB=10
```

---

## 2. Cara Menjalankan Lokal (Full-Stack Quick Start)

Pastikan kamu membuka **2 terminal terpisah** untuk menjalankan Back-End dan Front-End secara bersamaan:

### Terminal 1: Menjalankan Back-End (FastAPI + Model PyTorch)
```powershell
cd Backend
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*API Swagger UI dapat diakses di: `http://localhost:8000/docs`*

### Terminal 2: Menjalankan Front-End (React + Vite)
```powershell
cd "Front_end\traceai-web"
npm install
npm run dev
```
*Aplikasi Web dapat diakses di: `http://localhost:5173`*

---

## 3. Rekomendasi Hosting & Spesifikasi Server

Karena sistem ini menjalankan inferensi model *Computer Vision* (`efficientnet_b0`), pemisahan hosting antara Front-End dan Back-End sangat disarankan:

* **Front-End Hosting:** **Vercel** atau **Netlify** (Gratis, otomatis terhubung ke GitHub, CDN cepat).
* **Back-End & AI Hosting:** **Hugging Face Spaces**, **Railway**, **Render**, atau VPS Cloud (AWS EC2 / GCP).
* **Spesifikasi Minimum Server Back-End:**
  * **CPU:** Minimal 2 vCPU.
  * **RAM:** Minimal **2 GB – 4 GB RAM** (untuk memuat bobot model PyTorch `efficientnet_b0` dan memproses gambar tanpa *Out of Memory*).
  * **Storage:** Minimal 5 GB SSD.
