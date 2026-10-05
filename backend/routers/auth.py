"""
Authentication Router - Login, Register, User Management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator
import os
from typing import Optional, List
from datetime import timedelta

from database import get_db
from models import User
from utils.auth import (
    password_version,
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
    get_current_user_optional,
    require_role,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ROLE_HIERARCHY
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


# ====== Pydantic Schemas ======

class PasswordInput(BaseModel):
    @field_validator("password", check_fields=False)
    @classmethod
    def validate_password(cls, value):
        if value is not None and not 12 <= len(value.encode("utf-8")) <= 72:
            raise ValueError("Password must contain 12 to 72 UTF-8 bytes")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserRegister(PasswordInput):
    email: EmailStr
    password: str
    role: str = "assistant"  # Default to lab assistant
    name: Optional[str] = None
    department_id: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    name: Optional[str] = None
    department_id: Optional[int] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class UserUpdate(PasswordInput):
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(default=None, max_length=200)
    role: Optional[str] = None
    password: Optional[str] = None
    department_id: Optional[int] = None


# ====== Default Admin Creation ======

def create_default_admin(db: Session):
    """Provision an administrator only with explicitly supplied credentials."""
    admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL")
    admin_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
    if not admin_email and not admin_password:
        return False
    if not admin_email or not admin_password:
        raise RuntimeError("Both bootstrap administrator settings are required")
    try:
        data = UserRegister(email=admin_email, password=admin_password, role="principal")
    except ValueError:
        raise RuntimeError("Invalid bootstrap administrator email or password") from None
    if db.query(User).filter(User.email == data.email).first():
        return False
    db.add(User(email=data.email, hashed_password=get_password_hash(data.password),
                role="principal", name="Principal"))
    db.commit()
    return True


# ====== Auth Endpoints ======

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "pwd": password_version(user.hashed_password)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "name": getattr(user, 'name', None),
            "department_id": user.department_id
        }
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user


@router.get("/check")
def check_auth(current_user: User = Depends(get_current_user_optional)):
    """Check if user is authenticated (returns user info or null)"""
    if current_user:
        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "role": current_user.role,
                "department_id": current_user.department_id
            }
        }
    return {"authenticated": False, "user": None}


# ====== User Management (Admin Only) ======

@router.post("/register", response_model=UserResponse)
def register_user(
    data: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod"))  # HOD or Principal can create users
):
    """Register a new user (HOD/Principal only)"""
    # Validate role
    if data.role not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {list(ROLE_HIERARCHY.keys())}"
        )
    
    # Check if email exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # HODs can only create assistants, not other HODs/Principals
    creator_level = ROLE_HIERARCHY.get(current_user.role, 0)
    new_user_level = ROLE_HIERARCHY.get(data.role, 0)
    
    if new_user_level >= creator_level and current_user.role != "principal":
        raise HTTPException(
            status_code=403,
            detail="Cannot create user with equal or higher role than yourself"
        )
    
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        name=data.name or "test0",
        department_id=data.department_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod"))
):
    """List all users (HOD/Principal only)"""
    return db.query(User).order_by(User.email).all()


@router.get("/directory", response_model=List[UserResponse])
def get_user_directory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users (Available to all authenticated users for dropdowns)"""
    return db.query(User).order_by(User.role, User.name, User.email).all()


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("principal"))
):
    """Delete a user (Principal only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"success": True, "message": f"Deleted user {user.email}"}


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod"))
):
    """Update a user (HOD/Principal only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.role != "principal":
        actor_level = ROLE_HIERARCHY[current_user.role]
        if ROLE_HIERARCHY.get(user.role, -1) >= actor_level:
            raise HTTPException(status_code=403, detail="Cannot modify an equal or higher role")
        if data.role is not None and ROLE_HIERARCHY.get(data.role, -1) >= actor_level:
            raise HTTPException(status_code=403, detail="Cannot assign an equal or higher role")
    if data.email:
        existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        user.email = data.email
    if data.role:
        if data.role not in ROLE_HIERARCHY:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = data.role
    if data.password:
        user.hashed_password = get_password_hash(data.password)
    if data.department_id is not None:
        user.department_id = data.department_id
    if data.name:
        user.name = data.name
    
    db.commit()
    db.refresh(user)
    return user
