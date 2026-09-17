import os
from datetime import datetime, timedelta
from typing import Optional, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

import database
import models
from config import settings

# JWT Secret and configuration
JWT_SECRET = os.getenv("JWT_SECRET", "lectraai-super-secret-key-12345-abcde")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """
    Verify a plain password against the hashed password.
    """
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def verify_google_id_token(token: str) -> dict[str, Any]:
    """
    Verify a Google ID token and return its claims (sub, email, etc.).
    Accepts tokens issued for any client ID listed in GOOGLE_CLIENT_IDS.
    """
    allowed_audiences = settings.google_client_id_list()
    if not allowed_audiences:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Sign-In is not configured on the server (missing GOOGLE_CLIENT_IDS).",
        )

    idinfo = None
    last_error: Optional[Exception] = None
    for audience in allowed_audiences:
        try:
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=audience,
            )
            break
        except Exception as e:
            last_error = e
            continue

    if idinfo is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {last_error}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    iss = idinfo.get("iss")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not idinfo.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address",
        )

    if idinfo.get("email_verified") is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google email address is not verified",
        )

    return idinfo

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token for a user.
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        
    to_encode = {
        "sub": user_id,
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

import requests
from jwt.algorithms import RSAAlgorithm

CLERK_PEM_KEY = None

def get_clerk_public_key(token_header):
    """
    Fetch Clerk JWKS and return the RSA public key matching the token's kid.
    """
    global CLERK_PEM_KEY
    if CLERK_PEM_KEY:
        return CLERK_PEM_KEY

    clerk_publishable = os.getenv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_cmVsaWV2ZWQtdGVycmFwaW4tNzkxLmNsZXJrLmFjY291bnRzLmRldiQ")
    # Decode domain from publishable key prefix (pk_test_<domain>$)
    try:
        import base64
        raw = clerk_publishable.split("pk_test_")[1].rstrip("$")
        decoded = base64.b64decode(raw + "==").decode("utf-8")
        jwks_url = f"https://{decoded}/.well-known/jwks.json"
        res = requests.get(jwks_url, timeout=5)
        if res.ok:
            jwks = res.json()
            kid = token_header.get("kid")
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    CLERK_PEM_KEY = RSAAlgorithm.from_jwk(key)
                    return CLERK_PEM_KEY
    except Exception as e:
        print(f"Failed to fetch Clerk JWKS key: {e}")
    return None

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(database.get_db)
) -> models.User:
    """
    FastAPI dependency to retrieve the current logged-in user.
    Verifies either local HS256 JWT or Clerk RS256 JWT tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user_id: Optional[str] = None
    email: Optional[str] = None

    # 1. Try decoding local HS256 JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        pass

    # 2. If local decoding failed, try decoding Clerk RS256 token
    if not user_id:
        try:
            unverified_header = jwt.get_unverified_header(token)
            if unverified_header.get("alg") == "RS256":
                rsa_key = get_clerk_public_key(unverified_header)
                if rsa_key:
                    payload = jwt.decode(
                        token,
                        rsa_key,
                        algorithms=["RS256"],
                        options={"verify_aud": False}
                    )
                    user_id = payload.get("sub")
                    email = payload.get("email") or payload.get("primary_email")
        except Exception as e:
            print(f"Clerk token decode attempt failed: {e}")

    if not user_id:
        raise credentials_exception

    # Find or provision user in DB
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None and email:
        user = db.query(models.User).filter(models.User.email == email).first()

    if user is None:
        # Auto-provision user record for Clerk session
        user = models.User(
            id=user_id,
            email=email or f"{user_id}@clerk.user",
            hashed_password=None,
            auth_provider="clerk",
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            # If sub ID couldn't be used directly as primary key, fallback search
            user = db.query(models.User).filter(models.User.email == email).first()

    if user is None:
        raise credentials_exception

    return user

