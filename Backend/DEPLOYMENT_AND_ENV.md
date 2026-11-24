# TraceAi — Environment Variables & Deployment Guide

Dokumen ini berisi panduan konfigurasi variabel lingkungan (`.env`), cara menginstal dependensi model Machine Learning (`PyTorch`, `Transformers`, & `SafeTensors`), serta cara menjalankan keseluruhan sistem secara lokal (*full-stack*).

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
Secara default, `Backend/main.py` otomatis memuat model **Swin Transformer** lokal (`model.safetensors`, `config.json`, `preprocessor_config.json`, dan `traceai_config_final.json`) dari folder `Backend/models/` dan memilih perangkat `cuda` (jika tersedia) atau `cpu`.
```env
# Konfigurasi Server
APP_ENV=development
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173

# Konfigurasi Model & Keamanan
MODELS_DIR=./models
MAX_FILE_SIZE_MB=10
```

---

## 2. Cara Menjalankan Lokal (Full-Stack Quick Start)

Pastikan kamu membuka **2 terminal terpisah** untuk menjalankan Back-End dan Front-End secara bersamaan:

### Terminal 1: Menjalankan Back-End (FastAPI + Swin Transformer)
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

Karena sistem ini menjalankan inferensi model *Computer Vision* (`SwinForImageClassification` ~347 MB `model.safetensors`), pemisahan hosting antara Front-End dan Back-End sangat disarankan:

* **Front-End Hosting:** **Vercel** atau **Netlify** (Gratis, otomatis terhubung ke GitHub, CDN cepat).
* **Back-End & AI Hosting:** **Hugging Face Spaces**, **Railway**, **Render**, atau VPS Cloud (AWS EC2 / GCP).
* **Spesifikasi Minimum Server Back-End:**
  * **CPU:** Minimal 2 vCPU.
  * **RAM:** Minimal **2 GB – 4 GB RAM** (untuk memuat bobot `model.safetensors` dan memproses inferensi tanpa *Out of Memory*).
  * **Storage:** Minimal 5 GB SSD.
