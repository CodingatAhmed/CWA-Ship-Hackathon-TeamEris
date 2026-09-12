"""Environment-backed settings loaded only at the composition edge."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Runtime settings for HTTP composition and one OpenAI adapter."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    frontend_origins: str = "http://localhost:5173"
    ai_provider: str = "openai"
    ai_model: str = "gpt-5.4-mini"
    ai_api_key: SecretStr | None = None
    ai_timeout_seconds: float = Field(default=30.0, gt=0, le=120)

    @property
    def allowed_frontend_origins(self) -> list[str]:
        """Return configured comma-separated browser origins."""

        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Load settings once for dependency wiring."""

    return Settings()
