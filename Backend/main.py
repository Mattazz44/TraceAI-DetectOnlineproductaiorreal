from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import exifread
import io
import os
import uuid
from datetime import datetime, timezone

app = FastAPI(title="TraceAi Backend API", version="1.0.0")

# Izinkan akses dari Front-End Vite (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.get("/")
def read_root():
    return {"status": "online", "message": "TraceAi API siap digunakan!"}


@app.post("/api/v1/scan")
async def scan_product_image(image: UploadFile = File(...)):
    # 1. Validasi Tipe File
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Format file tidak didukung. Gunakan JPG, PNG, atau WebP."
        )

    # 2. Baca file & validasi ukuran
    contents = await image.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="File gambar kosong."
        )
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ukuran gambar terlalu besar. Maksimal 10 MB."
        )

    # 3. Validasi gambar tidak rusak (corrupt)
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="File gambar tidak valid atau rusak."
        )

    # 4. Ekstraksi Metadata EXIF asli
    try:
        tags = exifread.process_file(io.BytesIO(contents), details=False)
    except Exception:
        tags = {}

    has_camera_data = "Image Make" in tags or "Image Model" in tags
    camera_name = f"{tags.get('Image Make', '')} {tags.get('Image Model', '')}".strip()
    metadata_status = "Wajar" if has_camera_data else "Kosong"
    metadata_desc = (
        f"Ditemukan data kamera ({camera_name})."
        if has_camera_data
        else "Tidak ada data kamera maupun tanda C2PA."
    )

    # 5. Simulasi Skor AI (Nanti diganti dengan model AI beneran)
    ai_prob = 86 if not has_camera_data else 15
    classification = "AI tinggi" if ai_prob >= 75 else "AI rendah"
    verdict = (
        "Gambar ini sangat mungkin hasil generator AI."
        if ai_prob >= 75
        else "Gambar ini kemungkinan besar foto produk asli."
    )

    safe_filename = os.path.basename(image.filename) if image.filename else "unnamed.jpg"

    return {
        "status": "success",
        "data": {
            "scan_id": f"scn_{uuid.uuid4().hex[:6]}",
            "filename": safe_filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ai_probability": ai_prob,
            "classification": classification,
            "model_confidence": "Sedang",
            "verdict_text": verdict,
            "anomalies": [
                {"box": [180, 100, 560, 420], "label": "Area janggal", "finding": "texture"},
                {"box": [550, 600, 880, 890], "label": "Area janggal", "finding": "text_logo"},
            ] if ai_prob >= 75 else [],
            "breakdown": {
                "texture": {
                    "status": "Janggal" if ai_prob >= 75 else "Wajar",
                    "description": (
                        "Terlalu halus dan seragam, tanpa noise kamera yang wajar."
                        if ai_prob >= 75
                        else "Noise dan tekstur permukaan terlihat alami."
                    ),
                },
                "text_logo": {
                    "status": "Janggal" if ai_prob >= 75 else "Wajar",
                    "description": (
                        "Huruf pada kemasan terdistorsi dan tidak terbaca."
                        if ai_prob >= 75
                        else "Detail tulisan dan logo terlihat tajam dan konsisten."
                    ),
                },
                "lighting": {
                    "status": "Wajar",
                    "description": "Arah bayangan konsisten dengan sumber cahaya.",
                },
                "metadata": {
                    "status": metadata_status,
                    "description": metadata_desc,
                },
            },
        },
    }
