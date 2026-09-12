"""Environment-backed settings used only at the application composition edge."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, including future real AI adapter credentials."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    frontend_origins: str = "http://localhost:5173"
    ai_provider: str | None = None
    ai_model: str | None = None
    ai_api_key: SecretStr | None = None

    @property
    def allowed_frontend_origins(self) -> list[str]:
        """Return the configured comma-separated browser origins."""

        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Load settings once for dependency wiring."""

    return Settings()

