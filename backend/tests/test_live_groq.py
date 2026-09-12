"""Opt-in Groq end-to-end smoke test that incurs real provider usage."""

import os

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_AI_TEST") != "1",
    reason="set RUN_LIVE_AI_TEST=1 to make real Groq requests",
)


def test_live_groq_compare_uses_exact_evidence_and_keeps_missing_rate_missing() -> None:
    settings = Settings()
    if settings.ai_provider.strip().lower() != "groq":
        pytest.skip("the configured AI_PROVIDER is not groq")
    if settings.ai_api_key is None or not settings.ai_api_key.get_secret_value():
        pytest.skip("AI_API_KEY is required for the opted-in Groq smoke test")

    quotes = [
        {
            "quote_id": "live-orbit",
            "route_name": "Fictional Orbit Lane",
            "pasted_text": (
                "For a Pakistan-based independent worker invoicing a Singapore "
                "client directly, Orbit Lane withholds USD 6.25 from recipient "
                "proceeds. It applies no other fee. Each remaining USD is exchanged "
                "at PKR 279.15. This route is available for that direct invoice."
            ),
        },
        {
            "quote_id": "live-cedar",
            "route_name": "Fictional Cedar Wire",
            "pasted_text": (
                "Cedar Wire is available to Pakistan-based freelancers for direct "
                "invoices from a Singapore customer. The recipient charge is 1.1 "
                "percent of the original USD invoice, and no other deduction is "
                "listed. Settlement usually takes one business day. No PKR exchange "
                "rate is stated."
            ),
        },
    ]
    response = TestClient(create_app(settings=settings)).post(
        "/api/compare",
        json={
            "invoice_amount": "843.25",
            "invoice_currency": "USD",
            "client_country": "Singapore",
            "platform_or_context": "Direct client invoice",
            "route_quotes": quotes,
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    source_by_id = {item["quote_id"]: item["pasted_text"] for item in quotes}
    for route in payload["routes"]:
        for term in route["extracted_terms"]:
            for evidence in term["evidence"]:
                assert evidence["quote_id"] == route["quote_id"]
                assert evidence["excerpt"] in source_by_id[route["quote_id"]]

    missing_route = next(
        route for route in payload["routes"] if route["quote_id"] == "live-cedar"
    )
    assert missing_route["estimated_net_pkr"] is None
    assert any(
        term["name"] == "fx_rate_pkr" for term in missing_route["missing_terms"]
    )
