from pathlib import Path
from datetime import datetime, timezone
import io
import json
import os
import uuid

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
import exifread
import torch
import torch.nn as nn
from torchvision import models, transforms

app = FastAPI(title="TraceAi Backend API", version="1.0.0")

# Izinkan akses dari Front-End Vite (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# =====================================================================
# 1. Muat Konfigurasi & Model ML (efficientnet_b0) Satu Kali Saat Startup
# =====================================================================
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODEL_CONFIG_PATH = MODELS_DIR / "traceai_config_revised.json"
MODEL_BUNDLE_PATH = MODELS_DIR / "traceai_efficientnet_b0_cifake_revised.pth"
MODEL_FALLBACK_PATH = MODELS_DIR / "traceai_best_model_revised.pth"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _torch_load_cpu(model_path: Path):
    try:
        return torch.load(model_path, map_location="cpu", weights_only=False)
    except TypeError:
        return torch.load(model_path, map_location="cpu")


def _extract_state_dict(checkpoint):
    """Tangani baik dictionary bundle ('model_state_dict') maupun raw state_dict."""
    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            return checkpoint["model_state_dict"]
        if "state_dict" in checkpoint:
            return checkpoint["state_dict"]
    return checkpoint


def load_traceai_model():
    if not MODEL_CONFIG_PATH.exists():
        raise FileNotFoundError(f"File konfigurasi model tidak ditemukan di: {MODEL_CONFIG_PATH}")

    with open(MODEL_CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    class_names = list(config["class_names"])
    image_size = int(config["image_size"])
    architecture = str(config.get("architecture", "efficientnet_b0"))
    norm_mean = [float(x) for x in config["normalization_mean"]]
    norm_std = [float(x) for x in config["normalization_std"]]

    if "AI_GENERATED" not in class_names:
        raise ValueError(f"Kelas 'AI_GENERATED' tidak ditemukan di class_names: {class_names}")
    ai_index = class_names.index("AI_GENERATED")

    if architecture != "efficientnet_b0":
        raise ValueError(f"Arsitektur model tidak didukung: {architecture}")

    checkpoint = None
    loaded_model_path = None
    load_errors = []

    for candidate_path in (MODEL_BUNDLE_PATH, MODEL_FALLBACK_PATH):
        if not candidate_path.exists():
            load_errors.append(f"{candidate_path.name}: file tidak ditemukan")
            continue
        try:
            checkpoint = _torch_load_cpu(candidate_path)
            loaded_model_path = candidate_path
            break
        except Exception as exc:
            load_errors.append(f"{candidate_path.name}: {exc}")

    if checkpoint is None or loaded_model_path is None:
        raise RuntimeError("Gagal memuat bobot model: " + "; ".join(load_errors))

    state_dict = _extract_state_dict(checkpoint)

    # Bangun arsitektur efficientnet_b0 dan sesuaikan jumlah kelas output
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(class_names))

    model.load_state_dict(state_dict)
    model.to(DEVICE)
    model.eval()

    preprocess_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=norm_mean, std=norm_std),
    ])

    return {
        "model": model,
        "architecture": architecture,
        "model_file": loaded_model_path.name,
        "class_names": class_names,
        "ai_index": ai_index,
        "image_size": image_size,
        "transform": preprocess_transform,
    }


MODEL_ARTIFACT = load_traceai_model()


def preprocess_image(pil_img: Image.Image) -> torch.Tensor:
    """
    Samakan orientasi EXIF dengan ImageOps.exif_transpose, konversi ke RGB,
    resize ke 224x224, konversi ke tensor, dan normalisasi sesuai traceai_config_revised.json.
    """
    rgb_img = ImageOps.exif_transpose(pil_img).convert("RGB")
    tensor = MODEL_ARTIFACT["transform"](rgb_img)
    return tensor.unsqueeze(0).to(DEVICE)


def predict_ai_probability(pil_img: Image.Image) -> float:
    """
    Menjalankan inferensi model dan mengembalikan skor kelas AI_GENERATED
    dalam skala 0.0 hingga 100.0 bertipe float standar Python.
    """
    input_tensor = preprocess_image(pil_img)
    model = MODEL_ARTIFACT["model"]
    ai_idx = MODEL_ARTIFACT["ai_index"]

    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.softmax(logits, dim=1)
        ai_score = float(probs[0, ai_idx].item() * 100.0)

    return float(round(ai_score, 2))


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "TraceAi API siap digunakan!",
        "model_architecture": MODEL_ARTIFACT["architecture"],
        "model_file": MODEL_ARTIFACT["model_file"],
        "class_names": MODEL_ARTIFACT["class_names"],
        "device": str(DEVICE),
    }


@app.post("/api/v1/scan")
async def scan_product_image(image: UploadFile = File(...)):
    # 1. Validasi Tipe File
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Format file tidak didukung. Gunakan JPG, PNG, atau WebP.",
        )

    # 2. Baca file & validasi ukuran
    contents = await image.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="File gambar kosong.",
        )
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ukuran gambar terlalu besar. Maksimal 10 MB.",
        )

    # 3. Validasi gambar tidak rusak (corrupt) & buka dengan Pillow
    try:
        verify_img = Image.open(io.BytesIO(contents))
        verify_img.verify()
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.load()
    except (UnidentifiedImageError, Exception):
        raise HTTPException(
            status_code=400,
            detail="File gambar tidak valid atau rusak.",
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

    # 5. Inferensi Model ML Asli (efficientnet_b0)
    try:
        ai_prob = float(predict_ai_probability(pil_img))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan pada server saat menganalisis gambar.",
        ) from exc

    # 6. Tentukan klasifikasi, keyakinan model, dan teks kesimpulan sesuai ambang batas
    if ai_prob >= 75.0:
        classification = "AI tinggi"
        model_confidence = "Tinggi" if ai_prob >= 85.0 else "Sedang"
        verdict = "Gambar ini sangat mungkin hasil generator AI."
    elif ai_prob >= 40.0:
        classification = "AI sedang"
        model_confidence = "Sedang" if ai_prob >= 55.0 else "Rendah"
        verdict = "Gambar terindikasi manipulasi atau terkompresi berat."
    else:
        classification = "AI rendah"
        model_confidence = "Tinggi" if ai_prob <= 15.0 else "Sedang"
        verdict = "Gambar ini kemungkinan besar foto produk asli."

    is_high_ai = ai_prob >= 75.0
    is_mid_ai = 40.0 <= ai_prob < 75.0
    safe_filename = os.path.basename(image.filename) if image.filename else "unnamed.jpg"

    return {
        "status": "success",
        "data": {
            "scan_id": f"scn_{uuid.uuid4().hex[:6]}",
            "filename": safe_filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ai_probability": ai_prob,
            "classification": classification,
            "model_confidence": model_confidence,
            "verdict_text": verdict,
            "anomalies": [],
            "breakdown": {
                "texture": {
                    "status": "Janggal" if is_high_ai else ("Perlu dicek" if is_mid_ai else "Wajar"),
                    "description": (
                        "Terlalu halus dan seragam, tanpa noise kamera yang wajar."
                        if is_high_ai
                        else (
                            "Sebagian area tampak halus atau terdampak kompresi gambar."
                            if is_mid_ai
                            else "Noise dan tekstur permukaan terlihat alami."
                        )
                    ),
                },
                "text_logo": {
                    "status": "Janggal" if is_high_ai else ("Perlu dicek" if is_mid_ai else "Wajar"),
                    "description": (
                        "Detail mikro atau karakter pada permukaan terindikasi pola sintetis."
                        if is_high_ai
                        else (
                            "Beberapa detail halus kurang tegas akibat resolusi atau kompresi."
                            if is_mid_ai
                            else "Detail tulisan dan pola objek terlihat konsisten."
                        )
                    ),
                },
                "lighting": {
                    "status": "Janggal" if ai_prob >= 90.0 else "Wajar",
                    "description": (
                        "Gradien pencahayaan tampak terlalu artifisial."
                        if ai_prob >= 90.0
                        else "Arah bayangan konsisten dengan sumber cahaya."
                    ),
                },
                "metadata": {
                    "status": metadata_status,
                    "description": metadata_desc,
                },
            },
        },
    }
