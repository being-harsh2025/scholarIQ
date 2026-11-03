from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User
from app.schemas import UserRegister, UserLogin, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user, log_audit

router = APIRouter()

@router.post("/register", response_model=UserOut)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        student_id=user_in.student_id if user_in.role == "student" else None,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, user.id, "REGISTER", "user", str(user.id), {"email": user.email, "role": user.role})
    return user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated.")

    token = create_access_token(subject=user.id, role=user.role)
    log_audit(db, user.id, "LOGIN", "user", str(user.id))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-users")
def get_demo_users():
    """Provides pre-configured demo credentials for swift evaluation without weakening security."""
    return [
        {
            "role": "admin",
            "email": "admin@scholariq.ai",
            "password": "AdminPass123!",
            "label": "Administrator",
            "description": "Full access to user management, system health, all datasets and model training"
        },
        {
            "role": "teacher",
            "email": "teacher@scholariq.ai",
            "password": "TeacherPass123!",
            "label": "Faculty / Teacher",
            "description": "Upload datasets, perform EDA, train models, generate single & batch predictions"
        },
        {
            "role": "student",
            "email": "student@scholariq.ai",
            "password": "StudentPass123!",
            "student_id": "STU-10001",
            "label": "Student (STU-10001)",
            "description": "Restricted view showing only their personal academic record and interventions"
        }
    ]
