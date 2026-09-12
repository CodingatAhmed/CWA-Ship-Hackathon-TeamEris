"""Regression cover for the production 500 caused by a non-ISO currency.

GroqCloud returned currency "PKR PER USD" on an fx_rate_pkr term. That passed
the provider-boundary schema but could not be serialized by the API contract,
which requires a three-letter code, so the exception escaped as a bare ASGI
500 instead of the contract's safe JSON error.
"""

import json
from decimal import Decimal

from fastapi.testclient import TestClient

from app.adapters.ai.extraction import canonical_currency, parse_extraction_response
from app.domain.payment_terms import QuoteDocument, TermName
from app.main import create_app



def document(text: str) -> QuoteDocument:
    return QuoteDocument(
        quote_id="route-a",
        route_name="Route A",
        platform_or_context="Direct client invoice",
        client_country="United States",
        invoice_amount=Decimal("1000.00"),
        invoice_currency="USD",
        text=text,
    )


def provider_response(terms: list[dict]) -> dict:
    payload = {
        "quote_id": "route-a",
        "terms": terms,
        "missing_terms": [],
        "unsupported_terms": [],
    }
    return {
        "status": "completed",
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": json.dumps(payload)}],
            }
        ],
    }


def fx_term(currency: str) -> dict:
    return {
        "name": "fx_rate_pkr",
        "value": "275",
        "label": None,
        "currency": currency,
        "payer": None,
        "percentage_base": None,
        "condition": None,
        "state": "explicit",
        "eligibility_effect": None,
        "evidence": [
            {
                "quote_id": "route-a",
                "excerpt": "275 PKR per USD",
                "start_char": None,
                "end_char": None,
            }
        ],
    }


def test_canonical_currency_accepts_only_three_letter_codes() -> None:
    assert canonical_currency(" usd ") == "USD"
    assert canonical_currency("PKR") == "PKR"
    assert canonical_currency(None) is None
    # The exact value GroqCloud returned in production.
    assert canonical_currency("PKR PER USD") is None
    assert canonical_currency("US") is None
    assert canonical_currency("USDT") is None


def test_unreadable_currency_becomes_an_unsupported_term_not_a_crash() -> None:
    extracted = parse_extraction_response(
        provider_response([fx_term("PKR PER USD")]),
        document("We convert at 275 PKR per USD."),
        "Groq",
    )

    assert extracted.terms == ()
    assert len(extracted.unsupported_terms) == 1
    unsupported = extracted.unsupported_terms[0]
    assert unsupported.name == TermName.FX_RATE_PKR.value
    assert unsupported.affects_calculation is True
    # The raw model text must not be echoed back into the response.
    assert "PKR PER USD" not in unsupported.reason


def test_a_readable_currency_is_still_normalized_and_kept() -> None:
    extracted = parse_extraction_response(
        provider_response([fx_term(" usd ")]),
        document("We convert at 275 PKR per USD."),
        "Groq",
    )

    assert len(extracted.terms) == 1
    assert extracted.terms[0].currency == "USD"
    assert extracted.unsupported_terms == ()


def test_response_serialization_failure_returns_safe_json_not_a_bare_500() -> None:
    """Any escaping validation error must still honour the error contract."""

    class BrokenService:
        async def execute(self, command):
            raise ValueError("simulated serialization failure")

    response = TestClient(create_app(compare_service=BrokenService())).post(
        "/api/compare",
        json={
            "invoice_amount": "1000.00",
            "invoice_currency": "USD",
            "client_country": "United States",
            "platform_or_context": "Direct client invoice",
            "route_quotes": [
                {"quote_id": "a", "route_name": "A", "pasted_text": "text a"},
                {"quote_id": "b", "route_name": "B", "pasted_text": "text b"},
            ],
        },
    )

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {
        "detail": "Comparison failed unexpectedly.",
        "retryable": False,
    }
