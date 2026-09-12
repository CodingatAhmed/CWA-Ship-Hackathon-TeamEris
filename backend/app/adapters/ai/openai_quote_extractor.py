"""OpenAI Responses API adapter for strict, evidence-bearing quote extraction."""

from typing import Any

import httpx

from app.adapters.ai.extraction import (
    EXTRACTION_INSTRUCTIONS,
    build_quote_input,
    extraction_text_config,
    parse_extraction_response,
)

from app.application.quote_extractor import (
    QuoteExtractorConfigurationError,
    QuoteExtractorInvalidResponseError,
    QuoteExtractorProviderError,
    QuoteExtractorRateLimitError,
    QuoteExtractorTimeoutError,
)
from app.domain.payment_terms import ExtractedQuote, QuoteDocument

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


class OpenAIQuoteExtractor:
    """Call one configured OpenAI model; never provide a synthetic fallback."""

    def __init__(
        self,
        *,
        api_key: str | None,
        model: str | None,
        timeout_seconds: float = 30.0,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout_seconds
        self._http_client = http_client

    async def extract(self, quote: QuoteDocument) -> ExtractedQuote:
        if not self._api_key or not self._model:
            raise QuoteExtractorConfigurationError(
                "OpenAI API key and model are required"
            )

        response_data = await self._request(self._request_body(quote))
        return parse_extraction_response(response_data, quote, "OpenAI")

    def _request_body(self, quote: QuoteDocument) -> dict[str, Any]:
        return {
            "model": self._model,
            "instructions": EXTRACTION_INSTRUCTIONS,
            "input": build_quote_input(quote),
            "text": extraction_text_config(),
            "max_output_tokens": 3000,
            "store": False,
        }

    async def _request(self, body: dict[str, Any]) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        try:
            if self._http_client is not None:
                response = await self._http_client.post(
                    OPENAI_RESPONSES_URL,
                    headers=headers,
                    json=body,
                    timeout=self._timeout,
                )
            else:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.post(
                        OPENAI_RESPONSES_URL,
                        headers=headers,
                        json=body,
                    )
        except httpx.TimeoutException as exc:
            raise QuoteExtractorTimeoutError("OpenAI request timed out") from exc
        except httpx.RequestError as exc:
            raise QuoteExtractorProviderError(
                "OpenAI request failed to connect"
            ) from exc

        if response.status_code == 429:
            raise QuoteExtractorRateLimitError("OpenAI rate limit was reached")
        if response.status_code >= 400:
            raise QuoteExtractorProviderError(
                f"OpenAI request failed with status {response.status_code}"
            )
        try:
            data = response.json()
        except ValueError as exc:
            raise QuoteExtractorInvalidResponseError(
                "OpenAI response was not JSON"
            ) from exc
        if not isinstance(data, dict):
            raise QuoteExtractorInvalidResponseError(
                "OpenAI response did not contain an object"
            )
        return data
