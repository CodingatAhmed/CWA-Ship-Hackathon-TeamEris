"""FastAPI composition root for the PayoutPath PK modular monolith."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.ai import OpenAIQuoteExtractor
from app.api.routes import router
from app.application.compare_quotes import CompareQuotes
from app.config import Settings, get_settings
from app.domain.fees import DecimalFeeEngine
from app.domain.ranking import RankingPolicy


def build_compare_service(settings: Settings) -> CompareQuotes:
    """Wire the one real provider adapter to deterministic application services."""

    provider_is_openai = settings.ai_provider.strip().lower() == "openai"
    api_key = (
        settings.ai_api_key.get_secret_value()
        if provider_is_openai and settings.ai_api_key is not None
        else None
    )
    extractor = OpenAIQuoteExtractor(
        api_key=api_key,
        model=settings.ai_model if provider_is_openai else None,
        timeout_seconds=settings.ai_timeout_seconds,
    )
    return CompareQuotes(
        extractor=extractor,
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
