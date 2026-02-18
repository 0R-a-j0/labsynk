from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from backend directory
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

import models
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LABSYNk API", version="1.0.0")

# CORS Setup - Allow all localhost ports for development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://labsynk.vercel.app",
    "https://labsynk-frontend.netlify.app", # Explicit Netlify App URL
]

# Add production frontend URL from env with robust handling
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    # Strip trailing slash if present to match browser origin
    frontend_url = frontend_url.rstrip("/")
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import inventory, schedule, ai, vlabs, auth, syllabus
app.include_router(inventory.router)
app.include_router(schedule.router)
app.include_router(ai.router)
app.include_router(syllabus.router)
app.include_router(vlabs.router)
app.include_router(auth.router)
from routers import student_engagement
app.include_router(student_engagement.router)


# ====== Startup Event - Create Default Admin ======

@app.on_event("startup")
def startup_event():
    """Create default admin account on server startup"""
    from routers.auth import create_default_admin
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "Welcome to LABSYNk API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

