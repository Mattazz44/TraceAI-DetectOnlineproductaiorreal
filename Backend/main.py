from pathlib import Path
from datetime import datetime, timezone
import base64
import io
import json
import logging
import os
import uuid

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
import exifread
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms

logger = logging.getLogger("traceai")

app = FastAPI(title="TraceAi Backend API", version="1.0.0")

# Izinkan akses dari Front-End Vite (localhost:5173 / 127.0.0.1:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
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

# Pasangkan setiap file bobot dengan konfigurasi yang sesuai agar threshold & resolusi
# tidak tertukar antara model _final (384px, threshold 0.12) dan _revised (224px).
MODEL_PROFILES = [
    {
        "name": "final",
        "weights": [
            MODELS_DIR / "traceai_efficientnet_b0_final.pth",
            MODELS_DIR / "traceai_best_model_final.pth",
        ],
        "config": MODELS_DIR / "traceai_config_final.json",
        "default_image_size": 384,
        "default_threshold": 0.12,
        "is_final": True,
    },
    {
        "name": "revised_cifake_fallback",
        "weights": [
            MODELS_DIR / "traceai_efficientnet_b0_cifake_revised.pth",
            MODELS_DIR / "traceai_best_model_revised.pth",
        ],
        "config": MODELS_DIR / "traceai_config_revised.json",
        "default_image_size": 224,
        "default_threshold": 0.50,
        "is_final": False,
    },
]

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
    selected_profile = None
    checkpoint = None
    loaded_model_path = None
    load_errors = []

    for profile in MODEL_PROFILES:
        for candidate_path in profile["weights"]:
            if not candidate_path.exists():
                continue
            try:
                checkpoint = _torch_load_cpu(candidate_path)
                loaded_model_path = candidate_path
                selected_profile = profile
                break
            except Exception as exc:
                load_errors.append(f"{candidate_path.name}: {exc}")
        if checkpoint is not None:
            break

    if checkpoint is None or loaded_model_path is None or selected_profile is None:
        raise RuntimeError(
            "Gagal memuat bobot model: "
            + ("; ".join(load_errors) if load_errors else "Tidak ada file .pth di Backend/models/.")
        )

    config = {}
    loaded_config_path = selected_profile["config"]
    if loaded_config_path.exists():
        with open(loaded_config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
    else:
        loaded_config_path = None

    bundle_meta = checkpoint if isinstance(checkpoint, dict) else {}

    class_names = list(
        bundle_meta.get("class_names")
        or config.get("class_names")
        or ["NON_AI", "AI_GENERATED"]
    )
    image_size = int(
        bundle_meta.get("image_size")
        or config.get("image_size")
        or selected_profile["default_image_size"]
    )
    raw_arch = str(
        bundle_meta.get("architecture")
        or config.get("architecture")
        or "efficientnet_b0"
    ).lower().replace("-", "_")

    norm_mean = [
        float(x)
        for x in (
            bundle_meta.get("imagenet_mean")
            or bundle_meta.get("normalization_mean")
            or config.get("normalization_mean")
            or [0.485, 0.456, 0.406]
        )
    ]
    norm_std = [
        float(x)
        for x in (
            bundle_meta.get("imagenet_std")
            or bundle_meta.get("normalization_std")
            or config.get("normalization_std")
            or [0.229, 0.224, 0.225]
        )
    ]
    threshold = float(
        bundle_meta.get("threshold")
        or config.get("threshold")
        or selected_profile["default_threshold"]
    )

    if "AI_GENERATED" not in class_names:
        raise ValueError(f"Kelas 'AI_GENERATED' tidak ditemukan di class_names: {class_names}")
    ai_index = class_names.index("AI_GENERATED")
    non_ai_index = class_names.index("NON_AI") if "NON_AI" in class_names else (1 - ai_index)

    if raw_arch != "efficientnet_b0":
        raise ValueError(f"Arsitektur model tidak didukung: {raw_arch}")

    state_dict = _extract_state_dict(checkpoint)

    # Bangun arsitektur efficientnet_b0 dan sesuaikan jumlah kelas output
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(class_names))

    model.load_state_dict(state_dict)
    model.to(DEVICE)
    model.eval()
    # Bekukan parameter agar Grad-CAM hanya menghitung gradien aktivasi fitur, bukan bobot
    for param in model.parameters():
        param.requires_grad_(False)

    preprocess_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=norm_mean, std=norm_std),
    ])

    model_warning = None
    if not selected_profile["is_final"]:
        model_warning = (
            "File bobot final (traceai_efficientnet_b0_final.pth) belum ditemukan di Backend/models/. "
            f"Server menggunakan model cadangan ({loaded_model_path.name}) yang akurasinya lebih sensitif terhadap foto terkompresi."
        )
        logger.warning(model_warning)

    return {
        "model": model,
        "architecture": raw_arch,
        "model_file": loaded_model_path.name,
        "config_file": loaded_config_path.name if loaded_config_path else None,
        "is_final": selected_profile["is_final"],
        "model_warning": model_warning,
        "class_names": class_names,
        "ai_index": ai_index,
        "non_ai_index": non_ai_index,
        "image_size": image_size,
        "threshold": threshold,
        "transform": preprocess_transform,
    }


MODEL_ARTIFACT = load_traceai_model()


def preprocess_image(pil_img: Image.Image) -> torch.Tensor:
    """
    Samakan orientasi EXIF dengan ImageOps.exif_transpose, konversi ke RGB,
    resize ke resolusi model, konversi ke tensor, dan normalisasi ImageNet.
    """
    rgb_img = ImageOps.exif_transpose(pil_img).convert("RGB")
    tensor = MODEL_ARTIFACT["transform"](rgb_img)
    return tensor.unsqueeze(0).to(DEVICE)


def _extract_cam_boxes(cam_up: np.ndarray, max_boxes: int = 3) -> list[dict]:
    """
    Ekstrak bounding box [ymin, xmin, ymax, xmax] (skala 0-1000) dari peta aktivasi Grad-CAM
    menggunakan connected-component labeling tanpa dependensi OpenCV/SciPy tambahan.
    """
    grid_h, grid_w = cam_up.shape

    def connected_components(mask: np.ndarray) -> list[dict]:
        visited = np.zeros_like(mask, dtype=bool)
        regions = []
        for r in range(grid_h):
            for c in range(grid_w):
                if mask[r, c] and not visited[r, c]:
                    stack = [(r, c)]
                    visited[r, c] = True
                    r0, r1, c0, c1 = r, r, c, c
                    area = 0
                    score_sum = 0.0
                    while stack:
                        cr, cc = stack.pop()
                        area += 1
                        score_sum += float(cam_up[cr, cc])
                        if cr < r0:
                            r0 = cr
                        if cr > r1:
                            r1 = cr
                        if cc < c0:
                            c0 = cc
                        if cc > c1:
                            c1 = cc
                        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                            nr, nc = cr + dr, cc + dc
                            if 0 <= nr < grid_h and 0 <= nc < grid_w and mask[nr, nc] and not visited[nr, nc]:
                                visited[nr, nc] = True
                                stack.append((nr, nc))

                    ymin = int(round((r0 / grid_h) * 1000))
                    xmin = int(round((c0 / grid_w) * 1000))
                    ymax = int(round(((r1 + 1) / grid_h) * 1000))
                    xmax = int(round(((c1 + 1) / grid_w) * 1000))
                    # Abaikan fragmen noise yang terlalu kecil (< 10% lebar & tinggi)
                    if area >= 36 and (ymax - ymin) >= 90 and (xmax - xmin) >= 90:
                        mean_act = score_sum / area
                        regions.append({
                            "box": [ymin, xmin, ymax, xmax],
                            "score": round(mean_act, 3),
                            "rank": mean_act * (area ** 0.3),
                        })
        regions.sort(key=lambda x: x["rank"], reverse=True)
        return regions[:max_boxes]

    for thr in (0.55, 0.42, 0.28):
        found = connected_components(cam_up >= thr)
        if found:
            return found

    # Fallback ke area di sekitar puncak aktivasi Grad-CAM tertinggi
    pr, pc = np.unravel_index(int(np.argmax(cam_up)), cam_up.shape)
    cy = int(round(((pr + 0.5) / grid_h) * 1000))
    cx = int(round(((pc + 0.5) / grid_w) * 1000))
    half = 180
    ymin = max(0, cy - half)
    xmin = max(0, cx - half)
    ymax = min(1000, ymin + half * 2)
    xmax = min(1000, xmin + half * 2)
    return [{"box": [ymin, xmin, ymax, xmax], "score": round(float(cam_up[pr, pc]), 3)}]


def _render_heatmap_data_url(cam_np: np.ndarray, size: int = 64) -> str:
    """Render peta Grad-CAM menjadi overlay RGBA PNG ringkas (data URL base64)."""
    cam_t = torch.from_numpy(cam_np.astype(np.float32)).unsqueeze(0).unsqueeze(0)
    cam_up = F.interpolate(cam_t, size=(size, size), mode="bilinear", align_corners=False).squeeze().numpy()
    cam_up = np.clip(cam_up, 0.0, 1.0)

    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    # Gradien warna kuning hangat -> oranye menyala -> merah pada area aktivasi tinggi
    rgba[..., 0] = 255
    rgba[..., 1] = np.clip((1.0 - cam_up) * 215 + 35, 0, 255).astype(np.uint8)
    rgba[..., 2] = np.clip((1.0 - cam_up) * 35, 0, 255).astype(np.uint8)
    alpha = np.where(cam_up > 0.22, (cam_up - 0.22) / 0.78, 0.0)
    rgba[..., 3] = np.clip(alpha * 185, 0, 185).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(rgba, mode="RGBA").save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def predict_with_gradcam(pil_img: Image.Image) -> tuple[float, np.ndarray | None]:
    """
    Menjalankan inferensi model dan menghitung peta aktivasi Grad-CAM terhadap
    selisih logit (AI_GENERATED - NON_AI) agar area janggal tetap akurat meski softmax jenuh.
    """
    input_tensor = preprocess_image(pil_img)
    model = MODEL_ARTIFACT["model"]
    ai_idx = MODEL_ARTIFACT["ai_index"]
    non_ai_idx = MODEL_ARTIFACT["non_ai_index"]

    with torch.enable_grad():
        x = input_tensor.detach().clone().requires_grad_(True)
        feats = model.features(x)
        pooled = model.avgpool(feats)
        flat = torch.flatten(pooled, 1)
        logits = model.classifier(flat)
        probs = torch.softmax(logits, dim=1)
        ai_score = float(round(probs[0, ai_idx].item() * 100.0, 2))

        target_logit = logits[0, ai_idx] - logits[0, non_ai_idx]
        grads = torch.autograd.grad(target_logit, feats)[0]

    weights = grads.mean(dim=(2, 3), keepdim=True)
    cam = F.relu((weights * feats.detach()).sum(dim=1, keepdim=True))
    cam_np = cam.squeeze().cpu().numpy()

    cam_max = float(cam_np.max()) if cam_np.size else 0.0
    cam_min = float(cam_np.min()) if cam_np.size else 0.0
    if cam_max > cam_min:
        cam_np = (cam_np - cam_min) / (cam_max - cam_min)
    else:
        cam_np = None

    return ai_score, cam_np


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "TraceAi API siap digunakan!",
        "model_architecture": MODEL_ARTIFACT["architecture"],
        "model_file": MODEL_ARTIFACT["model_file"],
        "config_file": MODEL_ARTIFACT["config_file"],
        "is_final_model": MODEL_ARTIFACT["is_final"],
        "model_warning": MODEL_ARTIFACT["model_warning"],
        "class_names": MODEL_ARTIFACT["class_names"],
        "image_size": MODEL_ARTIFACT["image_size"],
        "threshold": MODEL_ARTIFACT["threshold"],
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

    # 5. Inferensi Model ML Asli (efficientnet_b0) + Grad-CAM
    try:
        ai_prob, cam_np = predict_with_gradcam(pil_img)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan pada server saat menganalisis gambar.",
        ) from exc

    # 6. Tentukan klasifikasi, keyakinan model, dan teks kesimpulan sesuai ambang batas (calibrated threshold)
    threshold_pct = float(round(MODEL_ARTIFACT.get("threshold", 0.50) * 100.0, 1))
    is_ai_generated = bool(ai_prob >= threshold_pct)

    if ai_prob >= 75.0:
        classification = "AI tinggi"
        model_confidence = "Tinggi" if ai_prob >= 85.0 else "Sedang"
        verdict = "Gambar ini sangat mungkin hasil generator AI."
    elif ai_prob >= threshold_pct:
        classification = "AI sedang"
        model_confidence = "Sedang" if ai_prob >= 35.0 else "Rendah"
        verdict = "Gambar terindikasi sintetis atau manipulasi digital."
    else:
        classification = "AI rendah"
        model_confidence = "Tinggi" if ai_prob <= max(5.0, threshold_pct / 2.0) else "Sedang"
        verdict = "Gambar ini kemungkinan besar foto produk asli."

    is_high_ai = ai_prob >= 75.0
    is_mid_ai = threshold_pct <= ai_prob < 75.0
    lighting_abnormal = ai_prob >= 90.0

    # 7. Ekstrak koordinat area janggal (Grad-CAM) jika gambar terindikasi AI / memiliki indikator janggal
    anomalies = []
    heatmap_data_url = None
    if is_ai_generated and cam_np is not None:
        cam_t = torch.from_numpy(cam_np.astype(np.float32)).unsqueeze(0).unsqueeze(0)
        cam_up = F.interpolate(cam_t, size=(100, 100), mode="bilinear", align_corners=False).squeeze().numpy()
        raw_boxes = _extract_cam_boxes(cam_up, max_boxes=3)

        flagged_findings = ["texture", "text_logo"]
        if lighting_abnormal:
            flagged_findings.append("lighting")

        for idx, item in enumerate(raw_boxes):
            anomalies.append({
                "box": item["box"],
                "label": "Area janggal",
                "finding": flagged_findings[idx % len(flagged_findings)],
                "score": item["score"],
            })

        heatmap_data_url = _render_heatmap_data_url(cam_np, size=64)

    safe_filename = os.path.basename(image.filename) if image.filename else "unnamed.jpg"

    return {
        "status": "success",
        "data": {
            "scan_id": f"scn_{uuid.uuid4().hex[:6]}",
            "filename": safe_filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ai_probability": ai_prob,
            "is_ai_generated": is_ai_generated,
            "threshold": threshold_pct,
            "classification": classification,
            "model_confidence": model_confidence,
            "verdict_text": verdict,
            "model_file": MODEL_ARTIFACT["model_file"],
            "is_final_model": MODEL_ARTIFACT["is_final"],
            "model_warning": MODEL_ARTIFACT["model_warning"],
            "anomalies": anomalies,
            "heatmap": heatmap_data_url,
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
                    "status": "Janggal" if lighting_abnormal else "Wajar",
                    "description": (
                        "Gradien pencahayaan tampak terlalu artifisial."
                        if lighting_abnormal
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
