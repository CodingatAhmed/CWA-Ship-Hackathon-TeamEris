"""Explicitly opted-in smoke test that incurs real provider usage."""

import asyncio
import os
from decimal import Decimal

import pytest

from app.adapters.ai.openai_quote_extractor import OpenAIQuoteExtractor
from app.config import Settings
from app.domain.evidence import validate_term_evidence
from app.domain.payment_terms import QuoteDocument, TermName

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_AI_TEST") != "1",
    reason="set RUN_LIVE_AI_TEST=1 to make real OpenAI requests",
)


def test_live_extraction_uses_unseen_quotes_and_exact_evidence() -> None:
    settings = Settings()
    if settings.ai_provider.strip().lower() != "openai":
        pytest.skip("the configured AI_PROVIDER is not openai")
    if settings.ai_api_key is None:
        pytest.skip("AI_API_KEY is required for the opted-in live smoke test")

    api_key = settings.ai_api_key.get_secret_value()
    quotes = (
        QuoteDocument(
            quote_id="live-canada",
            route_name="Fictional Maple Transfer",
            platform_or_context="Direct client invoice",
            client_country="Canada",
            invoice_amount=Decimal("843.25"),
            invoice_currency="USD",
            text=(
                "For this Pakistan-based contractor's Canadian direct invoice, "
                "the receiver is charged 7.50 USD once and 0.8 percent of the "
                "original USD bill. After charges, each USD is exchanged for PKR "
                "276.40. The local bank takes PKR 125. Settlement normally takes "
                "two business days. No further deductions apply."
            ),
        ),
        QuoteDocument(
            quote_id="live-uk",
            route_name="Fictional Thames Route",
            platform_or_context="Direct client invoice",
            client_country="United Kingdom",
            invoice_amount=Decimal("619.80"),
            invoice_currency="USD",
            text=(
                "This route is offered to Pakistan-based freelancers billing a UK "
                "direct customer. The recipient covers a USD 4 processing charge; "
                "no other charges are listed. Funds usually arrive next day."
            ),
        ),
    )

    async def extract_all():
        extractor = OpenAIQuoteExtractor(
            api_key=api_key,
            model=settings.ai_model,
            timeout_seconds=settings.ai_timeout_seconds,
        )
        return tuple([await extractor.extract(quote) for quote in quotes])

    results = asyncio.run(extract_all())

    for quote, result in zip(quotes, results, strict=True):
        assert result.quote_id == quote.quote_id
        for term in result.terms:
            validate_term_evidence(quote.text, quote.quote_id, term)

    assert any(term.name is TermName.FX_RATE_PKR for term in results[0].terms)
    assert any(
        missing.name == TermName.FX_RATE_PKR.value
        for missing in results[1].missing_terms
    )
    assert not hasattr(results[0], "estimated_net_pkr")
    assert not hasattr(results[0], "recommendation")
