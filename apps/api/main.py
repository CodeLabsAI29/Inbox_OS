"""
InboxOS FastAPI Backend — Main Entry Point

Run with:
  uvicorn main:app --reload

API Docs available at:
  http://localhost:8000/docs
  http://localhost:8000/redoc
"""

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from config import settings
from database import create_tables
from routers import auth, emails, rules, tasks, reminders, replies, dashboard, analytics, settings as settings_router, ai, telegram


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: create database tables
    await create_tables()
    print(f"✅ InboxOS API started — {settings.APP_ENV} mode")
    print(f"📬 AI Provider: {settings.AI_PROVIDER}")
    print(f"🗄️  Database: {settings.DATABASE_URL}")

    # Auto-register Telegram Webhook on startup
    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/setWebhook",
                    json={
                        "url": settings.TELEGRAM_WEBHOOK_URL,
                        "secret_token": settings.TELEGRAM_SECRET_TOKEN
                    },
                    timeout=5.0
                )
                res.raise_for_status()
                print(f"🤖 Telegram Webhook registered: {settings.TELEGRAM_WEBHOOK_URL}")
        except Exception as e:
            print(f"⚠️ Telegram Webhook auto-registration failed: {str(e)}")

    yield
    # Shutdown
    print("👋 InboxOS API shutting down...")


app = FastAPI(
    title="InboxOS API",
    description="""
## InboxOS — AI-Powered Inbox Operating System

An open-source AI inbox operating system that transforms how people interact with email.

### Pipeline
Email → AI Understanding → Decision Engine → Actions → Delivery

### Authentication
Most endpoints require a Bearer JWT token.
In development mode (`APP_ENV=development`), auth is bypassed and a mock user is returned.

### Mock Mode
When `AI_PROVIDER=mock`, all AI responses return deterministic realistic data.
Replace with `openai`, `gemini`, or `ollama` for real AI processing.
    """,
    version="1.0.0",
    contact={"name": "InboxOS Team", "url": "https://github.com/your-org/inboxos"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(emails.router)
app.include_router(rules.router)
app.include_router(tasks.router)
app.include_router(reminders.router)
app.include_router(replies.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)
app.include_router(ai.router)
app.include_router(telegram.router)


# ── Health & Root ─────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {
        "name": "InboxOS API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.APP_ENV,
        "ai_provider": settings.AI_PROVIDER,
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "api": "InboxOS", "version": "1.0.0"}


# ── Global Exception Handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )
