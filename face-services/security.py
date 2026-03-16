import os

from fastapi import Header, HTTPException, status


API_KEY = os.environ["FACE_API_KEY"]


async def require_api_key(x_api_key: str | None = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": "API key tidak valid atau belum dikirim",
            },
        )
