const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(
    /\/+$/,
    ""
);

export async function scanProductImage(imageFile, { signal } = {}) {
    const formData = new FormData();
    formData.append("image", imageFile);

    let response;
    try {
        response = await fetch(`${API_BASE_URL}/scan`, {
            method: "POST",
            body: formData,
            signal,
        });
    } catch (err) {
        if (err?.name === "AbortError") throw err;
        throw new Error(
            "Tidak dapat terhubung ke server Backend (pastikan FastAPI berjalan di port 8000)."
        );
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.detail || "Gagal memindai gambar di server.");
    }

    return result.data;
}
