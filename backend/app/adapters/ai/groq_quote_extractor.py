"""Groq Responses API adapter for strict, evidence-bearing quote extraction."""

import logging
from copy import deepcopy
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
    QuoteExtractorTimeoutError,
)
from app.domain.payment_terms import ExtractedQuote, QuoteDocument

logger = logging.getLogger(__name__)

GROQ_RESPONSES_URL = "https://api.groq.com/openai/v1/responses"
GROQ_MAX_OUTPUT_TOKENS = 1600


def groq_extraction_text_config() -> dict[str, Any]:
    """Inline nullable enum refs that Groq cannot disambiguate inside anyOf.

    The runtime response still passes through the original strict Pydantic model.
    Only Groq's generation schema is normalized, leaving the OpenAI schema intact.
    """

    text_config = extraction_text_config()
    schema = text_config["format"]["schema"]
    definitions = schema.get("$defs", {})
    _inline_any_of_refs(schema, definitions)
    return text_config


def _inline_any_of_refs(
    node: dict[str, Any] | list[Any],
    definitions: dict[str, Any],
) -> None:
    if isinstance(node, list):
        for item in node:
            if isinstance(item, (dict, list)):
                _inline_any_of_refs(item, definitions)
        return

    any_of = node.get("anyOf")
    if isinstance(any_of, list):
        for index, branch in enumerate(any_of):
            if not isinstance(branch, dict):
                continue
            reference = branch.get("$ref")
            if not isinstance(reference, str) or not reference.startswith("#/$defs/"):
                continue
            definition_name = reference.removeprefix("#/$defs/")
            definition = definitions.get(definition_name)
            if isinstance(definition, dict):
                any_of[index] = deepcopy(definition)

    for value in node.values():
        if isinstance(value, (dict, list)):
            _inline_any_of_refs(value, definitions)


class GroqQuoteExtractor:
    """Call one configured Groq model; never provide a synthetic fallback."""

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
                "Groq API key and model are required"
            )

        response_data = await self._request(self._request_body(quote))
        return parse_extraction_response(response_data, quote, "Groq")

    def _request_body(self, quote: QuoteDocument) -> dict[str, Any]:
        return {
            "model": self._model,
            "instructions": EXTRACTION_INSTRUCTIONS,
            "input": build_quote_input(quote),
            "text": groq_extraction_text_config(),
            "reasoning": {"effort": "low"},
            "max_output_tokens": GROQ_MAX_OUTPUT_TOKENS,
        }

    async def _request(self, body: dict[str, Any]) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        try:
            if self._http_client is not None:
                response = await self._http_client.post(
                    GROQ_RESPONSES_URL,
                    headers=headers,
                    json=body,
                    timeout=self._timeout,
                )
            else:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.post(
                        GROQ_RESPONSES_URL,
                        headers=headers,
                        json=body,
                    )
        except httpx.TimeoutException as exc:
            raise QuoteExtractorTimeoutError("Groq request timed out") from exc
        except httpx.RequestError as exc:
            raise QuoteExtractorProviderError(
                "Groq request failed to connect"
            ) from exc

        if response.status_code >= 400:
            # Log the provider's own error descriptor so a rejected request can
            # be told apart from a transient outage. Only Groq's error fields
            # are recorded, never the request body, which carries quote text.
            logger.error(
                "Groq responded %s: %s",
                response.status_code,
                _provider_error_summary(response),
            )
        if response.status_code == 401:
            raise QuoteExtractorProviderError("Groq authentication failed")
        if response.status_code == 429:
            raise QuoteExtractorProviderError("Groq rate limit was reached")
        if response.status_code >= 400:
            raise QuoteExtractorProviderError(
                f"Groq request failed with status {response.status_code}"
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise QuoteExtractorInvalidResponseError(
                "Groq response was not JSON"
            ) from exc
        if not isinstance(data, dict):
            raise QuoteExtractorInvalidResponseError(
                "Groq response did not contain an object"
            )
        return data


def _provider_error_summary(response: httpx.Response) -> str:
    """Summarize a Groq error body by its own descriptor fields only."""

    try:
        body = response.json()
    except ValueError:
        return "<non-JSON error body>"
    error = body.get("error") if isinstance(body, dict) else None
    if not isinstance(error, dict):
        return "<no error object>"
    parts = [
        f"{field}={error[field]!r}"
        for field in ("type", "code", "message")
        if isinstance(error.get(field), str)
    ]
    return "; ".join(parts)[:500] or "<empty error object>"
