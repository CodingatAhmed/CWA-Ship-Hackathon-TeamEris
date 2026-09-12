from pathlib import Path

from pydantic import SecretStr

from app.adapters.ai import GroqQuoteExtractor, OpenAIQuoteExtractor
from app.application.quote_extractor import MisconfiguredQuoteExtractor
from app.config import BACKEND_ROOT, Settings
from app.main import build_quote_extractor


def settings(provider: str, model: str) -> Settings:
    return Settings(
        ai_provider=provider,
        ai_model=model,
        ai_api_key=SecretStr("private-test-key"),
    )


def test_openai_provider_selects_only_openai_adapter() -> None:
    extractor = build_quote_extractor(settings("openai", "openai-model"))

    assert isinstance(extractor, OpenAIQuoteExtractor)
    assert not isinstance(extractor, GroqQuoteExtractor)


def test_groq_provider_selects_only_groq_adapter() -> None:
    extractor = build_quote_extractor(
        settings(" GROQ ", "openai/gpt-oss-20b")
    )

    assert isinstance(extractor, GroqQuoteExtractor)
    assert not isinstance(extractor, OpenAIQuoteExtractor)


def test_unsupported_provider_uses_safe_configuration_failure() -> None:
    extractor = build_quote_extractor(settings("unknown", "unused-model"))

    assert isinstance(extractor, MisconfiguredQuoteExtractor)


def test_settings_loader_points_to_backend_dotenv() -> None:
    assert Path(Settings.model_config["env_file"]) == BACKEND_ROOT / ".env"
