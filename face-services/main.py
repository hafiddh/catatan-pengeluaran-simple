import logging
import os

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import FileResponse, PlainTextResponse

from db import init_db
from face_service import FaceService
from security import require_api_key

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

app = FastAPI(
    title="Face Recognition Service",
    description=(
        "Service sederhana untuk registrasi dan verifikasi wajah.\n\n"
        "**Fitur:**\n"
        "- Registrasi wajah (min 5 foto)\n"
        "- Verifikasi wajah (cocokkan dengan user terdaftar)\n"
        "- Identifikasi wajah (cari siapa pemilik wajah)\n"
        "- Update foto untuk user yang sudah terdaftar\n"
    ),
    version="1.0.0",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

face_service = FaceService(
    data_dir=os.getenv("FACE_DATA_DIR", "data"),
    tolerance=float(os.getenv("FACE_TOLERANCE", "0.42")),
    min_photos=int(os.getenv("FACE_MIN_PHOTOS", "6")),
    max_photo_size_mb=float(os.getenv("FACE_MAX_PHOTO_MB", "10")),
    min_quality_score=float(os.getenv("FACE_MIN_QUALITY_SCORE", "35")),
)


@app.on_event("startup")
async def startup_event():
    init_db()
    face_service.reload_cache()


@app.get("/api/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="./openapi.json",
        title=f"{app.title} - Swagger UI",
    )


@app.get("/api/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url="./openapi.json",
        title=f"{app.title} - ReDoc",
    )


# ------------------------------------------------------------------ #
#  Health
# ------------------------------------------------------------------ #
@app.get("/api/health", tags=["System"])
async def health_check(api_key: None = Depends(require_api_key)):
    """Cek status service."""
    stats = face_service.get_stats()
    return {
        "status": "ok",
        **stats,
    }


@app.get("/api/stats", tags=["System"])
async def get_stats(api_key: None = Depends(require_api_key)):
    """Statistik ringkas service."""
    return face_service.get_stats()


# ------------------------------------------------------------------ #
#  Registration
# ------------------------------------------------------------------ #
@app.post("/api/register", tags=["Face"])
async def register(
    username: str = Form(
        ..., description="Username unik (huruf, angka, _, - | 3-50 karakter)"
    ),
    photos: list[UploadFile] = File(
        ..., description="Wajib 6 foto wajah (1 wajah per foto)"
    ),
    api_key: None = Depends(require_api_key),
):
    """
    Registrasi wajah baru.

    Kirim **username** dan **6 foto** wajah.
    Semua foto harus menampilkan orang yang sama dengan 1 wajah per foto.

    Tips untuk hasil terbaik:
    - Gunakan pencahayaan yang baik
    - Variasikan sudut wajah (depan, sedikit kiri, sedikit kanan)
    - Hindari menggunakan kacamata hitam / masker
    - Gunakan latar belakang yang tidak terlalu ramai
    """
    photo_bytes = [await p.read() for p in photos]
    result = face_service.register(username, photo_bytes)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result)
    return result


@app.put("/api/users/{username}/photos", tags=["Face"])
async def update_photos(
    username: str,
    photos: list[UploadFile] = File(..., description="Foto tambahan"),
    api_key: None = Depends(require_api_key),
):
    """Tambahkan foto baru ke profile yang sudah terdaftar."""
    photo_bytes = [await p.read() for p in photos]
    result = face_service.update_photos(username, photo_bytes)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result)
    return result


# ------------------------------------------------------------------ #
#  Verification & Identification
# ------------------------------------------------------------------ #
@app.post("/api/verify", tags=["Face"])
async def verify(
    username: str = Form(..., description="Username yang akan diverifikasi"),
    photo: UploadFile = File(..., description="Foto wajah untuk verifikasi"),
    api_key: None = Depends(require_api_key),
):
    """
    Verifikasi wajah — cocokkan foto dengan user tertentu.

    Kirim **username** dan **1 foto** wajah.
    Mengembalikan apakah wajah cocok, beserta confidence score.
    """
    content = await photo.read()
    result = face_service.verify(username, content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result)
    return result


@app.post("/api/identify", tags=["Face"])
async def identify(
    photo: UploadFile = File(..., description="Foto wajah untuk identifikasi"),
    api_key: None = Depends(require_api_key),
):
    """
    Identifikasi wajah — cari siapa pemilik wajah dari semua user terdaftar.

    Kirim **1 foto** wajah. Service akan mencocokkan dengan semua user
    yang sudah terdaftar dan mengembalikan kandidat terbaik.
    """
    content = await photo.read()
    result = face_service.identify(content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result)
    return result


# ------------------------------------------------------------------ #
#  User Management
# ------------------------------------------------------------------ #
@app.get("/api/users", tags=["Users"])
async def list_users(api_key: None = Depends(require_api_key)):
    """Daftar semua user yang terdaftar."""
    return {"users": face_service.list_users()}


@app.get("/api/logs", tags=["Users"])
async def list_logs(
    limit: int = Query(default=20, ge=1, le=100),
    api_key: None = Depends(require_api_key),
):
    """Riwayat verifikasi dan identifikasi terbaru."""
    return {"logs": face_service.list_logs(limit=limit)}


@app.get("/api/logs/export", tags=["Users"])
async def export_logs(api_key: None = Depends(require_api_key)):
    """Export log recognition dalam format CSV."""
    csv_payload = face_service.export_logs_csv()
    return PlainTextResponse(
        content=csv_payload,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{face_service.build_export_filename()}"'
        },
    )


@app.get("/api/users/{username}", tags=["Users"])
async def get_user(username: str, api_key: None = Depends(require_api_key)):
    """Detail informasi user."""
    result = face_service.get_user_info(username)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result)
    return result


@app.get("/api/users/{username}/samples/{sample_id}/photo", tags=["Users"])
async def get_sample_photo(
    username: str,
    sample_id: int,
    api_key: None = Depends(require_api_key),
):
    """Ambil file foto sample tertentu untuk preview frontend."""
    photo_path = face_service.get_sample_photo_path(username, sample_id)
    if photo_path is None:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Foto sample tidak ditemukan"},
        )
    return FileResponse(photo_path)


@app.delete("/api/users/{username}", tags=["Users"])
async def delete_user(username: str, api_key: None = Depends(require_api_key)):
    """Hapus user dan semua data wajahnya."""
    result = face_service.delete_user(username)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result)
    return result


# ------------------------------------------------------------------ #
#  Entrypoint
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
