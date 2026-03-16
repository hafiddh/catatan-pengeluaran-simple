import json
import logging
import os
import re
import shutil
from datetime import datetime
from io import BytesIO
from typing import Optional

import face_recognition
import numpy as np
from sqlalchemy import func, select

from db import SessionLocal
from models import FaceSample, RecognitionLog, User

logger = logging.getLogger(__name__)


def validate_username(username: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_-]{3,50}$", username))


class FaceService:
    def __init__(
        self,
        data_dir: str = "data",
        tolerance: float = 0.42,
        min_photos: int = 5,
        max_photo_size_mb: float = 10.0,
        min_quality_score: float = 35.0,
    ):
        self.data_dir = data_dir
        self.photos_dir = os.path.join(data_dir, "photos")
        self.tolerance = tolerance
        self.min_photos = min_photos
        self.max_photo_bytes = int(max_photo_size_mb * 1024 * 1024)
        self.min_quality_score = min_quality_score
        self._encodings_cache: dict[str, np.ndarray] = {}

        os.makedirs(self.photos_dir, exist_ok=True)

    # ------------------------------------------------------------------ #
    #  Internal helpers
    # ------------------------------------------------------------------ #

    def reload_cache(self):
        cache: dict[str, list[np.ndarray]] = {}
        with SessionLocal() as session:
            rows = session.execute(
                select(User.username, FaceSample.encoding_json)
                .join(FaceSample, FaceSample.user_id == User.id)
                .order_by(User.username.asc(), FaceSample.id.asc())
            ).all()

        for username, encoding_json in rows:
            cache.setdefault(username, []).append(self._deserialize_encoding(encoding_json))

        self._encodings_cache = {
            username: np.vstack(encodings) for username, encodings in cache.items()
        }
        logger.info("Loaded %d users from MySQL cache", len(self._encodings_cache))

    def _serialize_encoding(self, encoding: np.ndarray) -> str:
        return json.dumps(encoding.tolist())

    def _deserialize_encoding(self, payload: str) -> np.ndarray:
        return np.array(json.loads(payload), dtype=np.float64)

    def _calculate_quality_score(
        self,
        image: np.ndarray,
        face_location: tuple[int, int, int, int],
    ) -> float:
        top, right, bottom, left = face_location
        height, width = image.shape[:2]
        face_height = max(1, bottom - top)
        face_width = max(1, right - left)
        face_area_ratio = (face_height * face_width) / max(1, height * width)

        grayscale = image.mean(axis=2) if image.ndim == 3 else image.astype(np.float32)
        face_crop = grayscale[top:bottom, left:right]
        if face_crop.size == 0:
            return 0.0

        vertical_detail = float(np.var(np.diff(face_crop, axis=0))) if face_crop.shape[0] > 1 else 0.0
        horizontal_detail = float(np.var(np.diff(face_crop, axis=1))) if face_crop.shape[1] > 1 else 0.0
        sharpness_score = min(55.0, (vertical_detail + horizontal_detail) / 15.0)
        framing_score = min(45.0, face_area_ratio * 450.0)
        return round(min(100.0, sharpness_score + framing_score), 2)

    def _extract_face_encoding(
        self, image_bytes: bytes
    ) -> tuple[Optional[np.ndarray], str, Optional[dict]]:
        if len(image_bytes) > self.max_photo_bytes:
            limit_mb = self.max_photo_bytes // (1024 * 1024)
            return None, f"Ukuran foto melebihi batas {limit_mb} MB", None

        try:
            image = face_recognition.load_image_file(BytesIO(image_bytes))
        except Exception as exc:
            return None, f"Gagal membaca gambar: {exc}", None

        face_locations = face_recognition.face_locations(image, model="hog")
        if len(face_locations) == 0:
            return None, "Tidak ada wajah terdeteksi dalam gambar", None

        if len(face_locations) > 1:
            return None, f"Terdeteksi {len(face_locations)} wajah, harap kirim foto dengan 1 wajah saja", None

        encodings = face_recognition.face_encodings(image, face_locations)
        if len(encodings) == 0:
            return None, "Gagal mengekstrak fitur wajah", None

        quality_score = self._calculate_quality_score(image, face_locations[0])
        quality_meta = {
            "quality_score": quality_score,
            "face_location": face_locations[0],
            "quality_passed": quality_score >= self.min_quality_score,
        }
        if not quality_meta["quality_passed"]:
            return None, f"Kualitas foto terlalu rendah (score={quality_score})", quality_meta

        return encodings[0], "OK", quality_meta

    def _compare(self, stored: np.ndarray, target: np.ndarray) -> dict:
        distances = np.linalg.norm(stored - target, axis=1)
        sorted_distances = np.sort(distances)
        top_k = min(3, len(sorted_distances))
        avg_top_k = float(np.mean(sorted_distances[:top_k]))
        confidence = max(0.0, min(100.0, (1 - avg_top_k / 0.6) * 100))
        return {
            "distance": round(avg_top_k, 4),
            "confidence": round(confidence, 2),
            "match": avg_top_k <= self.tolerance,
        }

    def _record_log(
        self,
        action: str,
        success: bool,
        message: str,
        requested_username: Optional[str] = None,
        matched_username: Optional[str] = None,
        confidence: Optional[float] = None,
        distance: Optional[float] = None,
    ):
        with SessionLocal() as session:
            session.add(
                RecognitionLog(
                    action=action,
                    success=success,
                    message=message,
                    requested_username=requested_username,
                    matched_username=matched_username,
                    confidence=confidence,
                    distance=distance,
                )
            )
            session.commit()

    def _save_photo(self, username: str, sequence_number: int, photo: bytes) -> str:
        user_photo_dir = os.path.join(self.photos_dir, username)
        os.makedirs(user_photo_dir, exist_ok=True)
        relative_path = f"photos/{username}/{sequence_number}.jpg"
        absolute_path = os.path.join(self.data_dir, relative_path)
        os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
        with open(absolute_path, "wb") as file_handle:
            file_handle.write(photo)
        return relative_path.replace("\\", "/")

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #

    def register(self, username: str, photos: list[bytes]) -> dict:
        if not validate_username(username):
            return {
                "success": False,
                "message": "Username tidak valid. Gunakan huruf, angka, _ atau - (3-50 karakter)",
            }

        if len(photos) != self.min_photos:
            return {
                "success": False,
                "message": f"Registrasi wajib tepat {self.min_photos} foto, diterima {len(photos)}",
            }

        with SessionLocal() as session:
            existing_user = session.scalar(select(User).where(User.username == username))
            if existing_user is not None:
                return {
                    "success": False,
                    "message": f"Username '{username}' sudah terdaftar. Gunakan endpoint update untuk menambah foto.",
                }

            valid_samples: list[dict] = []
            errors: list[str] = []

            for index, photo in enumerate(photos, 1):
                encoding, message, quality_meta = self._extract_face_encoding(photo)
                if encoding is None:
                    errors.append(f"Foto {index}: {message}")
                    continue
                valid_samples.append(
                    {
                        "photo": photo,
                        "encoding": encoding,
                        "quality_score": quality_meta["quality_score"],
                    }
                )

            if len(valid_samples) < self.min_photos:
                return {
                    "success": False,
                    "message": (
                        f"Hanya {len(valid_samples)} foto valid dari {len(photos)} yang dikirim. "
                        f"Minimal {self.min_photos} foto valid diperlukan."
                    ),
                    "errors": errors,
                }

            base_encoding = valid_samples[0]["encoding"]
            for index, sample in enumerate(valid_samples[1:], 2):
                distance = float(np.linalg.norm(base_encoding - sample["encoding"]))
                if distance > 0.6:
                    return {
                        "success": False,
                        "message": (
                            f"Foto valid ke-{index} terlihat berbeda dari foto pertama (distance={distance:.3f}). "
                            "Pastikan semua foto adalah orang yang sama."
                        ),
                        "errors": errors,
                    }

            user = User(username=username)
            session.add(user)
            session.flush()

            for sequence_number, sample in enumerate(valid_samples, 1):
                photo_path = self._save_photo(username, sequence_number, sample["photo"])
                session.add(
                    FaceSample(
                        user_id=user.id,
                        photo_path=photo_path,
                        quality_score=sample["quality_score"],
                        encoding_json=self._serialize_encoding(sample["encoding"]),
                    )
                )

            session.commit()

        self.reload_cache()
        quality_average = round(
            sum(sample["quality_score"] for sample in valid_samples) / len(valid_samples),
            2,
        )
        return {
            "success": True,
            "message": f"Registrasi berhasil untuk '{username}' dengan {len(valid_samples)} foto",
            "photos_valid": len(valid_samples),
            "photos_total": len(photos),
            "quality_average": quality_average,
        }

    def update_photos(self, username: str, photos: list[bytes]) -> dict:
        if not validate_username(username):
            return {"success": False, "message": "Username tidak valid"}

        existing = self._encodings_cache.get(username)
        if existing is None:
            return {"success": False, "message": f"Username '{username}' tidak ditemukan"}

        valid_samples: list[dict] = []
        errors: list[str] = []
        for index, photo in enumerate(photos, 1):
            encoding, message, quality_meta = self._extract_face_encoding(photo)
            if encoding is None:
                errors.append(f"Foto {index}: {message}")
                continue
            distance = float(np.min(np.linalg.norm(existing - encoding, axis=1)))
            if distance > 0.6:
                errors.append(f"Foto {index}: wajah tidak cocok dengan data yang sudah ada")
                continue
            valid_samples.append(
                {
                    "photo": photo,
                    "encoding": encoding,
                    "quality_score": quality_meta["quality_score"],
                }
            )

        if not valid_samples:
            return {
                "success": False,
                "message": "Tidak ada foto valid yang bisa ditambahkan",
                "errors": errors,
            }

        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.username == username))
            if user is None:
                return {"success": False, "message": f"Username '{username}' tidak ditemukan"}

            existing_count = session.scalar(
                select(func.count(FaceSample.id)).where(FaceSample.user_id == user.id)
            ) or 0

            for offset, sample in enumerate(valid_samples, 1):
                photo_path = self._save_photo(username, existing_count + offset, sample["photo"])
                session.add(
                    FaceSample(
                        user_id=user.id,
                        photo_path=photo_path,
                        quality_score=sample["quality_score"],
                        encoding_json=self._serialize_encoding(sample["encoding"]),
                    )
                )

            session.commit()

        self.reload_cache()
        return {
            "success": True,
            "message": f"Berhasil menambah {len(valid_samples)} foto untuk '{username}'",
            "total_photos": len(self._encodings_cache[username]),
            "errors": errors or None,
        }

    def verify(self, username: str, photo: bytes) -> dict:
        stored = self._encodings_cache.get(username)
        if stored is None:
            return {
                "success": False,
                "verified": False,
                "message": f"Username '{username}' tidak ditemukan",
            }

        encoding, message, quality_meta = self._extract_face_encoding(photo)
        if encoding is None:
            self._record_log("verify", False, message, requested_username=username)
            return {"success": False, "verified": False, "message": message}

        result = self._compare(stored, encoding)
        response = {
            "success": True,
            "verified": result["match"],
            "confidence": result["confidence"],
            "distance": result["distance"],
            "threshold": self.tolerance,
            "quality_score": quality_meta["quality_score"],
            "message": "Wajah cocok" if result["match"] else "Wajah tidak cocok",
        }
        self._record_log(
            "verify",
            result["match"],
            response["message"],
            requested_username=username,
            matched_username=username if result["match"] else None,
            confidence=result["confidence"],
            distance=result["distance"],
        )
        return response

    def identify(self, photo: bytes) -> dict:
        if not self._encodings_cache:
            return {"success": False, "message": "Belum ada pengguna terdaftar"}

        encoding, message, quality_meta = self._extract_face_encoding(photo)
        if encoding is None:
            self._record_log("identify", False, message)
            return {"success": False, "message": message}

        candidates = []
        for username, stored in self._encodings_cache.items():
            comparison = self._compare(stored, encoding)
            candidates.append({"username": username, **comparison})

        candidates.sort(key=lambda item: item["distance"])
        best = candidates[0]
        message = (
            f"Teridentifikasi sebagai '{best['username']}'"
            if best["match"]
            else "Wajah tidak dikenali"
        )
        self._record_log(
            "identify",
            best["match"],
            message,
            matched_username=best["username"] if best["match"] else None,
            confidence=best["confidence"],
            distance=best["distance"],
        )
        return {
            "success": True,
            "identified": best["match"],
            "best_match": best["username"] if best["match"] else None,
            "confidence": best["confidence"],
            "distance": best["distance"],
            "quality_score": quality_meta["quality_score"],
            "message": message,
            "candidates": candidates[:5],
        }

    def list_users(self) -> list[dict]:
        with SessionLocal() as session:
            rows = session.execute(
                select(
                    User.username,
                    func.count(FaceSample.id).label("photos_count"),
                    func.round(func.avg(FaceSample.quality_score), 2).label("quality_average"),
                )
                .join(FaceSample, FaceSample.user_id == User.id)
                .group_by(User.id, User.username)
                .order_by(User.username.asc())
            ).all()
        return [
            {
                "username": row.username,
                "photos_count": int(row.photos_count),
                "quality_average": float(row.quality_average or 0),
            }
            for row in rows
        ]

    def delete_user(self, username: str) -> dict:
        if not validate_username(username):
            return {"success": False, "message": "Username tidak valid"}

        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.username == username))
            if user is None:
                return {"success": False, "message": f"Username '{username}' tidak ditemukan"}
            session.delete(user)
            session.commit()

        user_photo_dir = os.path.join(self.photos_dir, username)
        if os.path.exists(user_photo_dir):
            shutil.rmtree(user_photo_dir)

        self.reload_cache()
        return {"success": True, "message": f"User '{username}' berhasil dihapus"}

    def get_user_info(self, username: str) -> dict:
        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.username == username))
            if user is None:
                return {"success": False, "message": f"Username '{username}' tidak ditemukan"}

            rows = session.execute(
                select(FaceSample.id, FaceSample.photo_path, FaceSample.quality_score, FaceSample.created_at)
                .where(FaceSample.user_id == user.id)
                .order_by(FaceSample.id.asc())
            ).all()

        return {
            "success": True,
            "username": username,
            "encodings_count": len(rows),
            "photo_files": [os.path.basename(row.photo_path or "") for row in rows if row.photo_path],
            "samples": [
                {
                    "id": row.id,
                    "filename": os.path.basename(row.photo_path or ""),
                    "quality_score": float(row.quality_score or 0),
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row in rows
            ],
            "quality_average": round(
                sum(float(row.quality_score or 0) for row in rows) / max(1, len(rows)),
                2,
            ),
        }

    def get_stats(self) -> dict:
        with SessionLocal() as session:
            user_count = session.scalar(select(func.count(User.id))) or 0
            sample_count = session.scalar(select(func.count(FaceSample.id))) or 0
            log_count = session.scalar(select(func.count(RecognitionLog.id))) or 0
        return {
            "registered_users": int(user_count),
            "registered_samples": int(sample_count),
            "recognition_logs": int(log_count),
        }

    def list_logs(self, limit: int = 20) -> list[dict]:
        with SessionLocal() as session:
            rows = session.execute(
                select(RecognitionLog)
                .order_by(RecognitionLog.created_at.desc())
                .limit(limit)
            ).scalars().all()

        return [
            {
                "id": row.id,
                "action": row.action,
                "success": row.success,
                "requested_username": row.requested_username,
                "matched_username": row.matched_username,
                "confidence": row.confidence,
                "distance": row.distance,
                "message": row.message,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]

    def export_logs_csv(self) -> str:
        logs = self.list_logs(limit=5000)
        header = [
            "id",
            "action",
            "success",
            "requested_username",
            "matched_username",
            "confidence",
            "distance",
            "message",
            "created_at",
        ]
        lines = [",".join(header)]
        for log in logs:
            values = [
                str(log["id"]),
                log["action"] or "",
                str(log["success"]),
                log["requested_username"] or "",
                log["matched_username"] or "",
                "" if log["confidence"] is None else str(log["confidence"]),
                "" if log["distance"] is None else str(log["distance"]),
                (log["message"] or "").replace('"', '""'),
                log["created_at"] or "",
            ]
            values[7] = f'"{values[7]}"'
            lines.append(",".join(values))
        return "\n".join(lines)

    def get_sample_photo_path(self, username: str, sample_id: int) -> Optional[str]:
        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.username == username))
            if user is None:
                return None
            sample = session.scalar(
                select(FaceSample)
                .where(FaceSample.user_id == user.id, FaceSample.id == sample_id)
            )
            if sample is None or not sample.photo_path:
                return None

        path = os.path.join(self.data_dir, sample.photo_path)
        if not os.path.exists(path):
            return None
        return path

    def build_export_filename(self) -> str:
        return f"recognition_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
