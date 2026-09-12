"""FastAPI composition root for the PayoutPath PK modular monolith."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.ai import GroqQuoteExtractor, OpenAIQuoteExtractor
from app.api.routes import router
from app.application.compare_quotes import CompareQuotes
from app.application.quote_extractor import (
    MisconfiguredQuoteExtractor,
    QuoteExtractor,
)
from app.config import Settings, get_settings
from app.domain.fees import DecimalFeeEngine
from app.domain.ranking import RankingPolicy


def build_quote_extractor(settings: Settings) -> QuoteExtractor:
    """Construct only the provider selected for this backend deployment."""

    provider = settings.ai_provider.strip().lower()
    if provider not in {"openai", "groq"}:
        return MisconfiguredQuoteExtractor("AI_PROVIDER is unsupported")

    api_key = (
        settings.ai_api_key.get_secret_value()
        if settings.ai_api_key is not None
        else None
    )
    adapter_type = (
        OpenAIQuoteExtractor if provider == "openai" else GroqQuoteExtractor
    )
    return adapter_type(
        api_key=api_key,
        model=settings.ai_model,
        timeout_seconds=settings.ai_timeout_seconds,
    )


def build_compare_service(settings: Settings) -> CompareQuotes:
    """Wire the selected provider to deterministic application services."""

    return CompareQuotes(
        extractor=build_quote_extractor(settings),
        fee_engine=DecimalFeeEngine(),
        ranking_policy=RankingPolicy(),
    )


def create_app(
    *,
    settings: Settings | None = None,
    compare_service: CompareQuotes | None = None,
) -> FastAPI:
    """Construct HTTP dependencies while keeping health independent from AI."""

    resolved_settings = settings or get_settings()
    application = FastAPI(
        title="PayoutPath PK API",
        version="0.2.0",
        description=(
            "Evidence-first payout-route comparison. A configured real AI API "
            "extracts quote terms; deterministic Python validates and calculates."
        ),
    )
    application.state.settings = resolved_settings
    application.state.compare_quotes = compare_service or build_compare_service(
        resolved_settings
    )

    if resolved_settings.allowed_frontend_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.allowed_frontend_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["Content-Type"],
        )

    application.include_router(router)
    return application


app = create_app()
