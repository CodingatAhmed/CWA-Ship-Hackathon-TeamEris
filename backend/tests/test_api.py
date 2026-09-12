"""Setup milestone API checks."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "payoutpath-pk-api"}


def test_compare_is_deliberately_not_implemented() -> None:
    response = client.post(
        "/api/compare",
        json={
            "invoice_amount": "1000.00",
            "invoice_currency": "USD",
            "client_country": "United States",
            "platform_or_context": "Direct client invoice",
            "route_quotes": [
                {
                    "quote_id": "route-a",
                    "route_name": "Provider A",
                    "pasted_text": "A real quote would be pasted here.",
                },
                {
                    "quote_id": "route-b",
                    "route_name": "Provider B",
                    "pasted_text": "A second real quote would be pasted here.",
                },
            ],
        },
    )

    assert response.status_code == 501
    assert response.json() == {
        "detail": "Comparison is not implemented in the setup milestone."
    }


def test_compare_requires_at_least_two_quotes() -> None:
    response = client.post(
        "/api/compare",
        json={
            "invoice_amount": "1000.00",
            "invoice_currency": "USD",
            "client_country": "United States",
            "platform_or_context": "Direct client invoice",
            "route_quotes": [
                {
                    "quote_id": "only-route",
                    "route_name": "Only provider",
                    "pasted_text": "Only one quote is not enough.",
                }
            ],
        },
    )

    assert response.status_code == 422

