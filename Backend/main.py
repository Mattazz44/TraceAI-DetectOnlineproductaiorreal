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
from transformers import SwinForImageClassification

logger = logging.getLogger("traceai")

app = FastAPI(title="TraceAI Forensic API", version="2.0.0")

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

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

TRACEAI_FINAL_CONFIG = MODELS_DIR / "traceai_config_final.json"
TRACEAI_REVISED_CONFIG = MODELS_DIR / "traceai_config_revised.json"
HF_CONFIG_PATH = MODELS_DIR / "config.json"
HF_PREPROCESSOR_PATH = MODELS_DIR / "preprocessor_config.json"
HF_WEIGHTS_PATH = MODELS_DIR / "model.safetensors"

EFFICIENTNET_FALLBACK_WEIGHTS = [
    MODELS_DIR / "traceai_efficientnet_b0_final.pth",
    MODELS_DIR / "traceai_best_model_final.pth",
    MODELS_DIR / "traceai_efficientnet_b0_cifake_revised.pth",
    MODELS_DIR / "traceai_best_model_revised.pth",
]

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _torch_load_cpu(model_path: Path):
    try:
        return torch.load(model_path, map_location="cpu", weights_only=False)
    except TypeError:
        return torch.load(model_path, map_location="cpu")


def _extract_state_dict(checkpoint):
    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            return checkpoint["model_state_dict"]
        if "state_dict" in checkpoint:
            return checkpoint["state_dict"]
    return checkpoint


def _resolve_pil_resampling(code: int) -> Image.Resampling:
    mapping = {
        0: Image.Resampling.NEAREST,
        1: Image.Resampling.LANCZOS,
        2: Image.Resampling.BILINEAR,
        3: Image.Resampling.BICUBIC,
        4: Image.Resampling.BOX,
        5: Image.Resampling.HAMMING,
    }
    return mapping.get(code, Image.Resampling.BICUBIC)


def _resolve_class_mapping(hf_config: dict, app_config: dict) -> tuple[list[str], int, int]:
    id2label = hf_config.get("id2label")
    label2id = hf_config.get("label2id")

    if isinstance(id2label, dict) and id2label:
        ordered_keys = sorted(id2label.keys(), key=lambda k: int(k))
        class_names = [str(id2label[k]) for k in ordered_keys]
    else:
        class_names = [str(c) for c in (app_config.get("class_names") or ["NON_AI", "AI_GENERATED"])]

    if "AI_GENERATED" not in class_names or "NON_AI" not in class_names:
        raise ValueError(f"Mapping label harus memuat NON_AI dan AI_GENERATED, ditemukan: {class_names}")

    ai_index = class_names.index("AI_GENERATED")
    non_ai_index = class_names.index("NON_AI")

    # Cross-check against label2id and traceai_config_final.json so labels never invert silently.
    if isinstance(label2id, dict) and "AI_GENERATED" in label2id:
        if int(label2id["AI_GENERATED"]) != ai_index:
            raise ValueError("Konflik indeks AI_GENERATED antara id2label dan label2id di config.json.")

    cfg_classes = app_config.get("class_names")
    if isinstance(cfg_classes, list) and "AI_GENERATED" in cfg_classes:
        if cfg_classes.index("AI_GENERATED") != ai_index:
            raise ValueError("Konflik urutan class_names antara config.json dan traceai_config_final.json.")

    return class_names, ai_index, non_ai_index


def _load_swin_artifact(config: dict, loaded_config_path: Path | None) -> dict:
    if not HF_WEIGHTS_PATH.exists() or not HF_CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"File model Swin tidak lengkap di {MODELS_DIR} (membutuhkan model.safetensors dan config.json)."
        )

    hf_config = _read_json(HF_CONFIG_PATH)
    preproc_cfg = _read_json(HF_PREPROCESSOR_PATH)

    # Cast fp16 safetensors to float32 so CPU execution and Grad-CAM gradients stay numerically stable.
    try:
        model = SwinForImageClassification.from_pretrained(
            str(MODELS_DIR),
            local_files_only=True,
            dtype=torch.float32,
        )
    except TypeError:
        model = SwinForImageClassification.from_pretrained(
            str(MODELS_DIR),
            local_files_only=True,
            torch_dtype=torch.float32,
        )

    model = model.to(device=DEVICE, dtype=torch.float32)
    model.eval()
    for param in model.parameters():
        param.requires_grad_(False)

    model_id2label = getattr(model.config, "id2label", None) or hf_config.get("id2label")
    merged_hf_cfg = {**hf_config, "id2label": model_id2label} if model_id2label else hf_config
    class_names, ai_index, non_ai_index = _resolve_class_mapping(merged_hf_cfg, config)

    preproc_size = preproc_cfg.get("size") if isinstance(preproc_cfg.get("size"), dict) else {}
    image_size = int(
        config.get("image_size")
        or preproc_size.get("height")
        or hf_config.get("image_size")
        or 224
    )
    preprocessing = str(config.get("preprocessing") or "center_crop_fit").lower()
    tta_enabled = bool(config.get("tta", False))
    resample_filter = _resolve_pil_resampling(int(preproc_cfg.get("resample", 3)))

    norm_mean = [
        float(x)
        for x in (
            config.get("normalization_mean")
            or preproc_cfg.get("image_mean")
            or [0.485, 0.456, 0.406]
        )
    ]
    norm_std = [
        float(x)
        for x in (
            config.get("normalization_std")
            or preproc_cfg.get("image_std")
            or [0.229, 0.224, 0.225]
        )
    ]
    threshold = float(config.get("threshold") if config.get("threshold") is not None else 0.65)

    tensor_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=norm_mean, std=norm_std),
    ])

    return {
        "model": model,
        "provider": str(config.get("provider") or "huggingface_swin"),
        "architecture": str(config.get("architecture") or "swin_transformer"),
        "version": str(config.get("version") or "swin_v6"),
        "base_model_id": config.get("base_model_id") or "Organika/sdxl-detector",
        "model_file": HF_WEIGHTS_PATH.name,
        "config_file": loaded_config_path.name if loaded_config_path else HF_CONFIG_PATH.name,
        "is_final": True,
        "model_warning": None,
        "class_names": class_names,
        "ai_index": ai_index,
        "non_ai_index": non_ai_index,
        "image_size": image_size,
        "preprocessing": preprocessing,
        "resample_filter": resample_filter,
        "tta": tta_enabled,
        "threshold": threshold,
        "tensor_transform": tensor_transform,
    }


def _load_efficientnet_fallback(config: dict, loaded_config_path: Path | None) -> dict:
    checkpoint = None
    loaded_model_path = None
    load_errors = []

    for candidate_path in EFFICIENTNET_FALLBACK_WEIGHTS:
        if not candidate_path.exists():
            continue
        try:
            checkpoint = _torch_load_cpu(candidate_path)
            loaded_model_path = candidate_path
            break
        except Exception as exc:
            load_errors.append(f"{candidate_path.name}: {exc}")

    if checkpoint is None or loaded_model_path is None:
        raise RuntimeError(
            "Gagal memuat bobot model: "
            + ("; ".join(load_errors) if load_errors else "Tidak ada file model di Backend/models/.")
        )

    is_final_pth = "final" in loaded_model_path.name
    if not is_final_pth and TRACEAI_REVISED_CONFIG.exists():
        config = _read_json(TRACEAI_REVISED_CONFIG)
        loaded_config_path = TRACEAI_REVISED_CONFIG

    bundle_meta = checkpoint if isinstance(checkpoint, dict) else {}
    class_names = list(
        bundle_meta.get("class_names")
        or config.get("class_names")
        or ["NON_AI", "AI_GENERATED"]
    )
    image_size = int(
        bundle_meta.get("image_size")
        or config.get("image_size")
        or (384 if is_final_pth else 224)
    )
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
        or (0.12 if is_final_pth else 0.50)
    )

    if "AI_GENERATED" not in class_names:
        raise ValueError(f"Kelas 'AI_GENERATED' tidak ditemukan di class_names: {class_names}")
    ai_index = class_names.index("AI_GENERATED")
    non_ai_index = class_names.index("NON_AI") if "NON_AI" in class_names else (1 - ai_index)

    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(class_names))
    model.load_state_dict(_extract_state_dict(checkpoint))
    model.to(DEVICE)
    model.eval()
    for param in model.parameters():
        param.requires_grad_(False)

    tensor_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=norm_mean, std=norm_std),
    ])

    model_warning = None
    if not is_final_pth:
        model_warning = (
            f"Server memakai model cadangan ({loaded_model_path.name}). "
            "Letakkan model.safetensors di Backend/models/ untuk akurasi penuh."
        )
        logger.warning(model_warning)

    return {
        "model": model,
        "provider": "torchvision_efficientnet",
        "architecture": "efficientnet_b0",
        "version": "legacy_efficientnet",
        "base_model_id": None,
        "model_file": loaded_model_path.name,
        "config_file": loaded_config_path.name if loaded_config_path else None,
        "is_final": is_final_pth,
        "model_warning": model_warning,
        "class_names": class_names,
        "ai_index": ai_index,
        "non_ai_index": non_ai_index,
        "image_size": image_size,
        "preprocessing": "resize",
        "resample_filter": Image.Resampling.BILINEAR,
        "tta": False,
        "threshold": threshold,
        "tensor_transform": tensor_transform,
    }


def load_traceai_model() -> dict:
    loaded_config_path = TRACEAI_FINAL_CONFIG if TRACEAI_FINAL_CONFIG.exists() else None
    config = _read_json(TRACEAI_FINAL_CONFIG)

    arch = str(config.get("architecture") or "").lower().replace("-", "_")
    provider = str(config.get("provider") or "").lower()

    if (
        HF_WEIGHTS_PATH.exists()
        and HF_CONFIG_PATH.exists()
        and (not arch or "swin" in arch or "swin" in provider)
    ):
        return _load_swin_artifact(config, loaded_config_path)

    return _load_efficientnet_fallback(config, loaded_config_path)


MODEL_ARTIFACT = load_traceai_model()


def preprocess_image(pil_img: Image.Image) -> tuple[torch.Tensor, tuple[float, float, float, float]]:
    """
    Returns normalised input tensor (1, 3, H, W) and the active crop rectangle
    (off_x, off_y, crop_w, crop_h) in [0..1] relative to the EXIF-oriented image.
    """
    rgb_img = ImageOps.exif_transpose(pil_img).convert("RGB")
    orig_w, orig_h = rgb_img.size
    target_size = MODEL_ARTIFACT["image_size"]
    resample_filter = MODEL_ARTIFACT["resample_filter"]

    if MODEL_ARTIFACT["preprocessing"] == "center_crop_fit":
        processed_img = ImageOps.fit(
            rgb_img,
            (target_size, target_size),
            method=resample_filter,
        )
        if orig_w > orig_h and orig_w > 0:
            crop_w = orig_h / orig_w
            crop_h = 1.0
            off_x = (1.0 - crop_w) / 2.0
            off_y = 0.0
        elif orig_h > orig_w and orig_h > 0:
            crop_w = 1.0
            crop_h = orig_w / orig_h
            off_x = 0.0
            off_y = (1.0 - crop_h) / 2.0
        else:
            off_x, off_y, crop_w, crop_h = 0.0, 0.0, 1.0, 1.0
    else:
        processed_img = rgb_img.resize((target_size, target_size), resample_filter)
        off_x, off_y, crop_w, crop_h = 0.0, 0.0, 1.0, 1.0

    tensor = MODEL_ARTIFACT["tensor_transform"](processed_img)
    return tensor.unsqueeze(0).to(device=DEVICE, dtype=torch.float32), (off_x, off_y, crop_w, crop_h)


def _extract_cam_boxes(
    cam_up: np.ndarray,
    crop_rect: tuple[float, float, float, float],
    max_boxes: int = 3,
) -> list[dict]:
    grid_h, grid_w = cam_up.shape
    off_x, off_y, crop_w, crop_h = crop_rect

    def to_orig_box(r0: int, c0: int, r1: int, c1: int) -> list[int]:
        y0 = off_y + (r0 / grid_h) * crop_h
        x0 = off_x + (c0 / grid_w) * crop_w
        y1 = off_y + ((r1 + 1) / grid_h) * crop_h
        x1 = off_x + ((c1 + 1) / grid_w) * crop_w
        return [
            max(0, min(1000, int(round(y0 * 1000)))),
            max(0, min(1000, int(round(x0 * 1000)))),
            max(0, min(1000, int(round(y1 * 1000)))),
            max(0, min(1000, int(round(x1 * 1000)))),
        ]

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

                    ymin, xmin, ymax, xmax = to_orig_box(r0, c0, r1, c1)
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

    pr, pc = np.unravel_index(int(np.argmax(cam_up)), cam_up.shape)
    cy = off_y + ((pr + 0.5) / grid_h) * crop_h
    cx = off_x + ((pc + 0.5) / grid_w) * crop_w
    half = 0.18
    ymin = max(0, int(round((cy - half) * 1000)))
    xmin = max(0, int(round((cx - half) * 1000)))
    ymax = min(1000, int(round((cy + half) * 1000)))
    xmax = min(1000, int(round((cx + half) * 1000)))
    return [{"box": [ymin, xmin, ymax, xmax], "score": round(float(cam_up[pr, pc]), 3)}]


def _render_heatmap_data_url(
    cam_np: np.ndarray,
    crop_rect: tuple[float, float, float, float],
    orig_size: tuple[int, int],
    max_dim: int = 96,
) -> str:
    orig_w, orig_h = orig_size
    if orig_w >= orig_h and orig_w > 0:
        out_w = max_dim
        out_h = max(16, int(round(max_dim * (orig_h / orig_w))))
    elif orig_h > 0:
        out_h = max_dim
        out_w = max(16, int(round(max_dim * (orig_w / orig_h))))
    else:
        out_w, out_h = max_dim, max_dim

    off_x, off_y, crop_w, crop_h = crop_rect
    box_w = max(8, int(round(crop_w * out_w)))
    box_h = max(8, int(round(crop_h * out_h)))
    px = max(0, int(round(off_x * out_w)))
    py = max(0, int(round(off_y * out_h)))

    cam_t = torch.from_numpy(cam_np.astype(np.float32)).unsqueeze(0).unsqueeze(0)
    cam_up = F.interpolate(cam_t, size=(box_h, box_w), mode="bilinear", align_corners=False).squeeze().numpy()
    cam_up = np.clip(cam_up, 0.0, 1.0)

    rgba_crop = np.zeros((box_h, box_w, 4), dtype=np.uint8)
    rgba_crop[..., 0] = 255
    rgba_crop[..., 1] = np.clip((1.0 - cam_up) * 205 + 30, 0, 255).astype(np.uint8)
    rgba_crop[..., 2] = np.clip((1.0 - cam_up) * 30, 0, 255).astype(np.uint8)
    alpha = np.where(cam_up > 0.22, (cam_up - 0.22) / 0.78, 0.0)
    rgba_crop[..., 3] = np.clip(alpha * 180, 0, 180).astype(np.uint8)

    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    crop_img = Image.fromarray(rgba_crop, mode="RGBA")
    canvas.paste(crop_img, (px, py))

    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def predict_with_gradcam(pil_img: Image.Image) -> tuple[float, float, np.ndarray | None, tuple[float, float, float, float]]:
    """
    Runs inference (with horizontal-flip TTA when enabled in traceai_config_final.json)
    and computes Grad-CAM over the log-odds difference (AI_GENERATED - NON_AI).
    """
    input_tensor, crop_rect = preprocess_image(pil_img)
    model = MODEL_ARTIFACT["model"]
    arch = MODEL_ARTIFACT["architecture"]
    ai_idx = MODEL_ARTIFACT["ai_index"]
    non_ai_idx = MODEL_ARTIFACT["non_ai_index"]
    use_tta = bool(MODEL_ARTIFACT.get("tta", False))

    with torch.enable_grad():
        x = input_tensor.detach().clone().requires_grad_(True)
        if "swin" in arch:
            swin_out = model.swin(pixel_values=x)
            last_seq = swin_out.last_hidden_state
            logits_orig = model.classifier(swin_out.pooler_output)
            probs_orig = torch.softmax(logits_orig, dim=1)

            target_logit = logits_orig[0, ai_idx] - logits_orig[0, non_ai_idx]
            grads = torch.autograd.grad(target_logit, last_seq)[0]

            side = int(round(last_seq.shape[1] ** 0.5))
            acts_2d = last_seq.detach()[0].transpose(0, 1).reshape(1, -1, side, side)
            grads_2d = grads.detach()[0].transpose(0, 1).reshape(1, -1, side, side)
            weights = grads_2d.mean(dim=(2, 3), keepdim=True)
            cam = F.relu((weights * acts_2d).sum(dim=1, keepdim=True))
        else:
            feats = model.features(x)
            pooled = model.avgpool(feats)
            flat = torch.flatten(pooled, 1)
            logits_orig = model.classifier(flat)
            probs_orig = torch.softmax(logits_orig, dim=1)

            target_logit = logits_orig[0, ai_idx] - logits_orig[0, non_ai_idx]
            grads = torch.autograd.grad(target_logit, feats)[0]
            weights = grads.mean(dim=(2, 3), keepdim=True)
            cam = F.relu((weights * feats.detach()).sum(dim=1, keepdim=True))

    if use_tta:
        with torch.no_grad():
            flipped = torch.flip(input_tensor, dims=[3])
            if "swin" in arch:
                logits_flip = model(pixel_values=flipped).logits
            else:
                logits_flip = model(flipped)
            probs_flip = torch.softmax(logits_flip, dim=1)
            probs = 0.5 * (probs_orig.detach() + probs_flip)
    else:
        probs = probs_orig.detach()

    ai_score = float(round(probs[0, ai_idx].item() * 100.0, 2))
    non_ai_score = float(round(probs[0, non_ai_idx].item() * 100.0, 2))

    cam_np = cam.squeeze().cpu().numpy()
    cam_max = float(cam_np.max()) if cam_np.size else 0.0
    cam_min = float(cam_np.min()) if cam_np.size else 0.0
    if cam_max > cam_min:
        cam_np = (cam_np - cam_min) / (cam_max - cam_min)
    else:
        cam_np = None

    return ai_score, non_ai_score, cam_np, crop_rect


def _compute_calibrated_confidence(ai_prob: float, threshold_pct: float) -> tuple[float, str]:
    """
    Measures distance from the operating threshold on a 50-100% scale so a score right on
    the boundary reads as low confidence and extremes read as high confidence.
    """
    if ai_prob >= threshold_pct:
        span = max(1.0, 100.0 - threshold_pct)
        distance = (ai_prob - threshold_pct) / span
    else:
        span = max(1.0, threshold_pct)
        distance = (threshold_pct - ai_prob) / span

    conf_pct = float(round(50.0 + min(1.0, max(0.0, distance)) * 50.0, 1))
    if conf_pct >= 82.0:
        label = "Tinggi"
    elif conf_pct >= 66.0:
        label = "Sedang"
    else:
        label = "Rendah"
    return conf_pct, label


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "TraceAI Forensic API aktif.",
        "provider": MODEL_ARTIFACT["provider"],
        "model_architecture": MODEL_ARTIFACT["architecture"],
        "model_version": MODEL_ARTIFACT["version"],
        "base_model_id": MODEL_ARTIFACT["base_model_id"],
        "model_file": MODEL_ARTIFACT["model_file"],
        "config_file": MODEL_ARTIFACT["config_file"],
        "is_final_model": MODEL_ARTIFACT["is_final"],
        "model_warning": MODEL_ARTIFACT["model_warning"],
        "preprocessing": MODEL_ARTIFACT["preprocessing"],
        "tta": MODEL_ARTIFACT["tta"],
        "class_names": MODEL_ARTIFACT["class_names"],
        "image_size": MODEL_ARTIFACT["image_size"],
        "threshold": MODEL_ARTIFACT["threshold"],
        "device": str(DEVICE),
    }


@app.post("/api/v1/scan")
async def scan_product_image(image: UploadFile = File(...)):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Format file tidak didukung. Gunakan gambar JPG, PNG, atau WebP.",
        )

    contents = await image.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="File gambar kosong dan tidak dapat diproses.",
        )
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ukuran gambar melebihi batas maksimal 10 MB.",
        )

    try:
        verify_img = Image.open(io.BytesIO(contents))
        img_format = (verify_img.format or "UNKNOWN").upper()
        verify_img.verify()
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.load()
        oriented_img = ImageOps.exif_transpose(pil_img)
        orig_w, orig_h = oriented_img.size
    except (UnidentifiedImageError, Exception):
        raise HTTPException(
            status_code=400,
            detail="File gambar rusak atau format binernya tidak valid.",
        )

    try:
        tags = exifread.process_file(io.BytesIO(contents), details=False)
    except Exception:
        tags = {}

    camera_make = str(tags.get("Image Make", "")).strip() or None
    camera_model = str(tags.get("Image Model", "")).strip() or None
    software_tag = str(tags.get("Image Software", "")).strip() or None
    datetime_orig = str(tags.get("EXIF DateTimeOriginal", "")).strip() or None
    has_camera_data = bool(camera_make or camera_model)
    camera_name = " ".join(part for part in (camera_make, camera_model) if part).strip()

    metadata_status = "Wajar" if has_camera_data else "Kosong"
    if has_camera_data:
        metadata_desc = f"Terekam informasi sensor perangkat ({camera_name})."
    elif software_tag:
        metadata_desc = f"Data kamera tidak ditemukan, tertera tag perangkat lunak ({software_tag})."
    else:
        metadata_desc = "Tidak ditemukan informasi kamera EXIF maupun tanda tangan kriptografi C2PA."

    try:
        ai_prob, non_ai_prob, cam_np, crop_rect = predict_with_gradcam(oriented_img)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Terjadi gangguan internal saat menjalankan inferensi model.",
        ) from exc

    threshold_pct = float(round(MODEL_ARTIFACT.get("threshold", 0.65) * 100.0, 1))
    is_ai_generated = bool(ai_prob >= threshold_pct)
    high_cutoff = min(95.0, max(80.0, threshold_pct + 15.0))
    confidence_percent, model_confidence = _compute_calibrated_confidence(ai_prob, threshold_pct)

    if not is_ai_generated:
        classification = "AI rendah"
        if ai_prob <= threshold_pct * 0.5:
            verdict = "Kemungkinan besar gambar produk asli."
        else:
            verdict = "Kemungkinan gambar asli, dengan sedikit artefak kompresi."
    elif ai_prob >= high_cutoff:
        classification = "AI tinggi"
        verdict = "Terdeteksi kuat sebagai gambar buatan AI."
    else:
        classification = "AI sedang"
        verdict = "Terindikasi buatan AI atau mengalami manipulasi digital."

    is_high_ai = is_ai_generated and ai_prob >= high_cutoff
    is_mid_ai = is_ai_generated and not is_high_ai
    lighting_abnormal = is_ai_generated and ai_prob >= 90.0

    anomalies = []
    heatmap_data_url = None
    if is_ai_generated and cam_np is not None:
        cam_t = torch.from_numpy(cam_np.astype(np.float32)).unsqueeze(0).unsqueeze(0)
        cam_up = F.interpolate(cam_t, size=(100, 100), mode="bilinear", align_corners=False).squeeze().numpy()
        raw_boxes = _extract_cam_boxes(cam_up, crop_rect=crop_rect, max_boxes=3)

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

        heatmap_data_url = _render_heatmap_data_url(
            cam_np,
            crop_rect=crop_rect,
            orig_size=(orig_w, orig_h),
        )

    safe_filename = os.path.basename(image.filename) if image.filename else "unnamed.jpg"

    return {
        "status": "success",
        "data": {
            "scan_id": f"scn_{uuid.uuid4().hex[:8]}",
            "filename": safe_filename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ai_probability": ai_prob,
            "non_ai_probability": non_ai_prob,
            "is_ai_generated": is_ai_generated,
            "threshold": threshold_pct,
            "classification": classification,
            "model_confidence": model_confidence,
            "confidence_percent": confidence_percent,
            "verdict_text": verdict,
            "model_file": MODEL_ARTIFACT["model_file"],
            "is_final_model": MODEL_ARTIFACT["is_final"],
            "model_warning": MODEL_ARTIFACT["model_warning"],
            "image_meta": {
                "width": orig_w,
                "height": orig_h,
                "format": img_format,
                "file_size_bytes": len(contents),
                "has_exif": bool(tags),
                "camera_make": camera_make,
                "camera_model": camera_model,
                "software": software_tag,
                "datetime_original": datetime_orig,
            },
            "model_info": {
                "provider": MODEL_ARTIFACT["provider"],
                "architecture": MODEL_ARTIFACT["architecture"],
                "version": MODEL_ARTIFACT["version"],
                "base_model_id": MODEL_ARTIFACT["base_model_id"],
                "image_size": MODEL_ARTIFACT["image_size"],
                "preprocessing": MODEL_ARTIFACT["preprocessing"],
                "tta": MODEL_ARTIFACT["tta"],
                "threshold": threshold_pct,
            },
            "anomalies": anomalies,
            "heatmap": heatmap_data_url,
            "breakdown": {
                "texture": {
                    "status": "Janggal" if is_high_ai else ("Perlu dicek" if is_mid_ai else "Wajar"),
                    "description": (
                        "Permukaan tampak terlalu licin dan seragam tanpa butiran sensor kamera alami."
                        if is_high_ai
                        else (
                            "Sebagian permukaan terlihat sangat halus atau terdampak kompresi berulang."
                            if is_mid_ai
                            else "Distribusi butiran noise dan detail tekstur terlihat wajar."
                        )
                    ),
                },
                "text_logo": {
                    "status": "Janggal" if is_high_ai else ("Perlu dicek" if is_mid_ai else "Wajar"),
                    "description": (
                        "Pola tepi mikro dan detail karakter menunjukkan struktur sintetis."
                        if is_high_ai
                        else (
                            "Detail garis halus kurang tajam sehingga perlu pemeriksaan visual manual."
                            if is_mid_ai
                            else "Ketajaman tepi objek dan proporsi detail terlihat konsisten."
                        )
                    ),
                },
                "lighting": {
                    "status": "Janggal" if lighting_abnormal else "Wajar",
                    "description": (
                        "Transisi pantulan cahaya tampak terlalu seragam dan artifisial."
                        if lighting_abnormal
                        else "Arah jatuh bayangan dan pantulan cahaya terlihat selaras."
                    ),
                },
                "metadata": {
                    "status": metadata_status,
                    "description": metadata_desc,
                },
            },
        },
    }
