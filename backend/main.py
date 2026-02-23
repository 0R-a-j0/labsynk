from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import threading
import time
import requests as http_requests
from pathlib import Path

# Load .env from backend directory
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)


# ====== Keep-Alive Ping (prevents Render free-tier sleep) ======

def _keep_alive():
    """Ping own /health endpoint every 10 minutes to prevent Render spin-down."""
    # Render sets RENDER_EXTERNAL_URL automatically; fallback to BACKEND_URL
    base_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL")
    if not base_url:
        return  # Not running on Render / no URL configured — skip

    url = f"{base_url.rstrip('/')}/health"
    interval = 10 * 60  # 10 minutes

    while True:
        time.sleep(interval)
        try:
            resp = http_requests.get(url, timeout=10)
            print(f"[keep-alive] pinged {url} — {resp.status_code}")
        except Exception as exc:
            print(f"[keep-alive] ping failed: {exc}")

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
    """Create default admin account on server startup and start keep-alive."""
    from routers.auth import create_default_admin
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()

    # Start keep-alive pinger (daemon thread dies with the server)
    ping_thread = threading.Thread(target=_keep_alive, daemon=True)
    ping_thread.start()


@app.get("/")
def read_root():
    return {"message": "Welcome to LABSYNk API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

