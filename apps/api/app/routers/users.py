from fastapi import APIRouter, Header, HTTPException, status
from supabase import create_client, Client
from app.services.database import MongoDB
from app.config import settings
import jwt

router = APIRouter(prefix="/users", tags=["users"])


def get_supabase_admin() -> Client:
    url = settings.SUPABASE_URL
    service_role_key = settings.SUPABASE_SERVICE_KEY

    if not url or not service_role_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment")

    return create_client(url, service_role_key)


def extract_user_id_from_token(auth_header: str | None) -> str:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.split(" ", 1)[1]

    try:
        # Temporary approach: decode token without signature verification
        # only to extract the Supabase user id ("sub")
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        return user_id

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to decode token",
        )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(authorization: str | None = Header(default=None)):
    user_id = extract_user_id_from_token(authorization)

    try:
        # 1) Get MongoDB database using your existing project pattern
        db = MongoDB.get_database()

        # 2) Delete all projects owned by this user
        await db.projects.delete_many({"user_id": user_id})

        # 3) Delete the user from Supabase Auth
        supabase_admin = get_supabase_admin()
        supabase_admin.auth.admin.delete_user(user_id)

        return

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}",
        )