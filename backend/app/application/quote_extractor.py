"""Provider-neutral outbound port for structured quote extraction."""

from typing import Protocol, runtime_checkable

from app.domain.payment_terms import ExtractedQuote, QuoteDocument


class QuoteExtractorError(RuntimeError):
    """Safe base error for extraction failures crossing into the API layer."""

    public_message = "AI extraction is unavailable. Check configuration and retry."


class QuoteExtractorUnavailableError(QuoteExtractorError):
    """The configured provider could not complete a request."""

    public_message = "AI extraction is temporarily unavailable. Please retry."


class QuoteExtractorTimeoutError(QuoteExtractorUnavailableError):
    """The configured provider exceeded the bounded request timeout."""

    public_message = "AI extraction timed out. Please retry."


class QuoteExtractorProviderError(QuoteExtractorUnavailableError):
    """The provider rejected the request or could not be reached."""

    public_message = "The AI provider is temporarily unavailable. Please retry."


class QuoteExtractorConfigurationError(QuoteExtractorError):
    """Required server-side provider configuration is absent or unsupported."""

    public_message = (
        "AI extraction is not configured on the server. Set the backend AI "
        "provider, model, and API key."
    )


class QuoteExtractorInvalidResponseError(QuoteExtractorError):
    """The provider returned output that failed strict validation."""

    public_message = "AI extraction returned an invalid response. Please retry."


class MisconfiguredQuoteExtractor:
    """Fail comparison lazily so health remains available after bad configuration."""

    def __init__(self, reason: str) -> None:
        self._reason = reason

    async def extract(self, quote: QuoteDocument) -> ExtractedQuote:
        raise QuoteExtractorConfigurationError(self._reason)


@runtime_checkable
class QuoteExtractor(Protocol):
    """Implemented by one real provider adapter at the application edge."""

    async def extract(self, quote: QuoteDocument) -> ExtractedQuote:
        """Extract typed candidates without calculating or recommending."""

        ...
