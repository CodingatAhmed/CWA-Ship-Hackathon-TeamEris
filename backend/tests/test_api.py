from fastapi.testclient import TestClient

from app.application.compare_quotes import CompareQuotes
from app.config import Settings
from app.domain.fees import DecimalFeeEngine
from app.domain.ranking import RankingPolicy
from app.main import create_app
from tests.support import QUOTE_A, QUOTE_B, MappingExtractor, extracted_a, extracted_b


def request_body() -> dict:
    return {
        "invoice_amount": "1000.00",
        "invoice_currency": "USD",
        "client_country": "United States",
        "platform_or_context": "Direct client invoice",
        "route_quotes": [
            {
                "quote_id": "route-a",
                "route_name": "Route A",
                "pasted_text": QUOTE_A,
            },
            {
                "quote_id": "route-b",
                "route_name": "Route B",
                "pasted_text": QUOTE_B,
            },
        ],
    }


def client_with_fake() -> TestClient:
    service = CompareQuotes(
        extractor=MappingExtractor(
            {"route-a": extracted_a(), "route-b": extracted_b()}
        ),
        fee_engine=DecimalFeeEngine(),
        ranking_policy=RankingPolicy(),
    )
    return TestClient(create_app(compare_service=service))


def test_health_remains_available_without_ai_configuration() -> None:
    app = create_app(settings=Settings(ai_api_key=None))
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "payoutpath-pk-api"}


def test_valid_comparison_returns_contract_and_verification_notice() -> None:
    response = client_with_fake().post("/api/compare", json=request_body())

    assert response.status_code == 200
    payload = response.json()
    assert [route["estimated_net_pkr"] for route in payload["routes"]] == [
        "269500.00",
        "268270.00",
    ]
    assert payload["recommendation"]["quote_id"] == "route-a"
    assert payload["routes"][0]["itemized_fees"][0]["evidence"]
    assert payload["verification_notice"]["tax_and_regulatory_guidance"] == (
        "Verify any tax or regulatory information with a qualified professional "
        "and current official sources."
    )


def test_invalid_quote_count_and_duplicate_ids_return_422() -> None:
    client = client_with_fake()
    one_quote = request_body()
    one_quote["route_quotes"] = one_quote["route_quotes"][:1]
    duplicate = request_body()
    duplicate["route_quotes"][1]["quote_id"] = "route-a"

    assert client.post("/api/compare", json=one_quote).status_code == 422
    assert client.post("/api/compare", json=duplicate).status_code == 422


def test_invoice_amount_must_cross_json_as_a_decimal_string() -> None:
    body = request_body()
    body["invoice_amount"] = 1000.00

    assert client_with_fake().post("/api/compare", json=body).status_code == 422

    body["invoice_amount"] = "1e3"
    assert client_with_fake().post("/api/compare", json=body).status_code == 422


def test_unconfigured_real_extractor_returns_safe_retryable_503() -> None:
    app = create_app(settings=Settings(ai_provider="openai", ai_api_key=None))
    response = TestClient(app).post("/api/compare", json=request_body())

    assert response.status_code == 503
    payload = response.json()
    assert payload["retryable"] is True
    assert "test-key" not in str(payload)
    assert QUOTE_A not in str(payload)


def test_unexpected_failure_returns_generic_safe_500() -> None:
    class ExplodingService:
        async def execute(self, command):
            raise RuntimeError(f"internal failure while handling {command.route_quotes[0].pasted_text}")

    app = create_app(compare_service=ExplodingService())
    response = TestClient(app).post("/api/compare", json=request_body())

    assert response.status_code == 500
    assert response.json() == {
        "detail": "Comparison failed unexpectedly.",
        "retryable": False,
    }
    assert QUOTE_A not in response.text


def test_openapi_exposes_success_and_service_failure_contracts() -> None:
    schema = client_with_fake().get("/openapi.json").json()
    responses = schema["paths"]["/api/compare"]["post"]["responses"]

    assert "200" in responses
    assert "422" in responses
    assert "503" in responses
