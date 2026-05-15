import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Flask ──────────────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    DEBUG      = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    # ── PostgreSQL ─────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://ong_user:123456@localhost:5432/ong_doacoes"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Mercado Pago ───────────────────────────────────────────────────────────
    MP_ACCESS_TOKEN   = os.getenv("MP_ACCESS_TOKEN", "")
    MP_WEBHOOK_SECRET = os.getenv("MP_WEBHOOK_SECRET", "")
    # URL pública que o MP vai chamar quando o pagamento for confirmado
    # Em dev: URL do ngrok. Em produção: https://seudominio.com/api/pix/webhook
    MP_WEBHOOK_URL    = os.getenv("MP_WEBHOOK_URL", "")

    # ── CORS ───────────────────────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    # --- Time Session ----------------------------------------------------------
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = True 
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 1800

    # RATELIMIT_STORAGE_URI = "redis://localhost:6379" 