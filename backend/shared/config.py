from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "AI-HPS"
    APP_VERSION: str = "1.0.0"

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    RABBITMQ_URL: str = "amqp://aihps:aihps_dev_pass@localhost:5672/"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES_STAFF: int = 480
    ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN: int = 240
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 30

    # ── LLM provider ──────────────────────────────────────────────────────────
    LLM_PROVIDER: str = "groq"
    LLM_MODEL: str = "llama-3.3-70b-versatile"

    # Groq API — never hard-coded; always read from .env
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_CHAT_ENDPOINT: str = "https://api.groq.com/openai/v1/chat/completions"

    # Optional fallback providers
    GEMINI_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""

    # ── LLM generation parameters ─────────────────────────────────────────────
    TEMPERATURE: float = 0.2
    MAX_TOKENS: int = 650

    # ── RAG retrieval parameters ──────────────────────────────────────────────
    RAG_TOP_K: int = 5          # chunks retrieved from vector store
    RAG_MIN_SIMILARITY: float = 0.35  # minimum cosine similarity to accept

    # ── Phase 1 departments ───────────────────────────────────────────────────
    PHASE1_DEPARTMENTS: str = "Emergency,Blood Bank,ICU,Surgery,Maternity,Infection Control"

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "AI-HPS"
    EMAIL_PASSWORD: str = ""
    OTP_EXPIRE_MINUTES: int = 10

    # Internal service-to-service token for the WhatsApp gateway.
    WHATSAPP_INTERNAL_TOKEN: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
