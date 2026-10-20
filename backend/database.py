
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./icc_adonay.db"
    JWT_SECRET_KEY: str
    JWT_EXPIRE_MINUTES: int = 30

    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    ADMIN_ROLE: str = "pastor"

    FRONTEND_ORIGINS: str = (
        "http://127.0.0.1:5500,http://localhost:5500"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

connect_args = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def obtener_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
