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

    OPENAI_API_KEY: str = ""
    PHASE1_DEPARTMENTS: str = "Emergency,Blood Bank,ICU,Surgery,Maternity,Infection Control"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
