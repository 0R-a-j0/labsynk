"""
Authentication utilities - JWT tokens and password hashing
"""
from datetime import datetime, timedelta, timezone
import os
import hashlib
import hmac
from typing import Optional
import jwt
from jwt import PyJWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "")
if len(SECRET_KEY.encode()) < 32 or SECRET_KEY == "labsynk-secret-key-change-in-production-2026":
    raise RuntimeError("Set SECRET_KEY to a unique random secret of at least 32 bytes")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Bearer token security
security = HTTPBearer(auto_error=False)


# ====== Password Utilities ======

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    if len(plain_password.encode("utf-8")) > 72:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ====== JWT Token Utilities ======

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]})
        return payload
    except PyJWTError:
        return None


# ====== User Authentication ======

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get the current authenticated user from JWT token"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required", headers={"WWW-Authenticate": "Bearer"})
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub", "")
    if not isinstance(user_id, str) or not user_id.isdecimal():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.get(User, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not hmac.compare_digest(str(payload.get("pwd", "")), password_version(user.hashed_password)):
        raise HTTPException(status_code=401, detail="Session expired; please sign in again")
    return user


def password_version(hashed_password: str) -> str:
    """Invalidate issued tokens after a password reset without storing token state."""
    return hmac.new(SECRET_KEY.encode(), hashed_password.encode(), hashlib.sha256).hexdigest()


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise (for students)"""
    if credentials is None:
        return None
    
    return get_current_user(credentials, db)


# ====== Role-Based Access Control ======

ROLE_HIERARCHY = {
    "student": 0,      # No login required, view only
    "assistant": 1,    # Lab assistant - can edit inventory, upload syllabus
    "hod": 2,          # Head of Department - full access
    "principal": 3,    # Principal - highest access
}


def require_role(minimum_role: str):
    """Decorator factory to require a minimum role level"""
    required_level = ROLE_HIERARCHY[minimum_role]

    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        user_level = ROLE_HIERARCHY.get(current_user.role, -1)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {minimum_role}"
            )
        
        return current_user
    
    return role_checker


def require_assistant():
    """Require at least lab assistant role"""
    return require_role("assistant")


def require_hod():
    """Require at least HOD role"""
    return require_role("hod")


def require_principal():
    """Require principal role"""
    return require_role("principal")
