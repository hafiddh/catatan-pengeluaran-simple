"""
Script untuk menguji semua endpoint Face Recognition Service.

Jalankan service terlebih dahulu:
    python main.py

Kemudian jalankan script ini:
    python test_api.py

Pastikan ada file foto wajah di folder 'test_photos/' sebelum menjalankan.
Buat folder test_photos/ dan taruh minimal 6 foto wajah orang yang sama di sana.
"""

import os
import sys
import requests

BASE_URL = "http://localhost:8000"
TEST_PHOTOS_DIR = "test_photos"
TEST_USERNAME = "test-user"


def check_service():
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        r.raise_for_status()
        print(f"[OK] Service running: {r.json()}")
        return True
    except Exception as e:
        print(f"[ERROR] Service tidak berjalan: {e}")
        print("Jalankan dulu: python main.py")
        return False


def load_photos(folder: str, count: int = 6) -> list[str]:
    if not os.path.isdir(folder):
        print(f"[ERROR] Folder '{folder}' tidak ditemukan.")
        print(f"Buat folder '{folder}' dan taruh foto wajah di sana.")
        sys.exit(1)

    supported = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
    files = sorted(
        [
            os.path.join(folder, f)
            for f in os.listdir(folder)
            if f.lower().endswith(supported)
        ]
    )

    if len(files) < count:
        print(f"[ERROR] Butuh minimal {count} foto, ditemukan {len(files)} di '{folder}'")
        sys.exit(1)

    return files[:count]


def test_register(photos: list[str]):
    print("\n=== TEST: Register ===")
    files = [("photos", (os.path.basename(p), open(p, "rb"), "image/jpeg")) for p in photos[:5]]
    data = {"username": TEST_USERNAME}

    r = requests.post(f"{BASE_URL}/api/register", data=data, files=files)
    for _, f in files:
        f[1].close()

    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def test_verify(photo_path: str, username: str = TEST_USERNAME):
    print("\n=== TEST: Verify ===")
    with open(photo_path, "rb") as f:
        files = {"photo": (os.path.basename(photo_path), f, "image/jpeg")}
        data = {"username": username}
        r = requests.post(f"{BASE_URL}/api/verify", data=data, files=files)

    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def test_identify(photo_path: str):
    print("\n=== TEST: Identify ===")
    with open(photo_path, "rb") as f:
        files = {"photo": (os.path.basename(photo_path), f, "image/jpeg")}
        r = requests.post(f"{BASE_URL}/api/identify", files=files)

    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def test_list_users():
    print("\n=== TEST: List Users ===")
    r = requests.get(f"{BASE_URL}/api/users")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def test_get_user(username: str = TEST_USERNAME):
    print("\n=== TEST: Get User Info ===")
    r = requests.get(f"{BASE_URL}/api/users/{username}")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def test_update_photos(photos: list[str], username: str = TEST_USERNAME):
    print("\n=== TEST: Update Photos ===")
    files = [("photos", (os.path.basename(p), open(p, "rb"), "image/jpeg")) for p in photos]
    r = requests.put(f"{BASE_URL}/api/users/{username}/photos", files=files)
    for _, f in files:
        f[1].close()

    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def test_delete_user(username: str = TEST_USERNAME):
    print("\n=== TEST: Delete User ===")
    r = requests.delete(f"{BASE_URL}/api/users/{username}")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def main():
    print("=" * 60)
    print("  Face Recognition Service - API Test")
    print("=" * 60)

    if not check_service():
        return

    photos = load_photos(TEST_PHOTOS_DIR, 6)
    print(f"\nLoaded {len(photos)} test photos from '{TEST_PHOTOS_DIR}/'")

    results = {}

    # 1. Register
    results["register"] = test_register(photos[:5])

    # 2. List users
    results["list_users"] = test_list_users()

    # 3. Get user info
    results["get_user"] = test_get_user()

    # 4. Verify (should match)
    results["verify"] = test_verify(photos[5])

    # 5. Identify
    results["identify"] = test_identify(photos[5])

    # 6. Update photos
    results["update_photos"] = test_update_photos(photos[5:6])

    # 7. Delete user
    results["delete"] = test_delete_user()

    # Summary
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")

    total = len(results)
    passed = sum(1 for v in results.values() if v)
    print(f"\n  {passed}/{total} tests passed")


if __name__ == "__main__":
    main()
