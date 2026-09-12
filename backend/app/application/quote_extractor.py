"""Port for extracting grounded payment terms from unstructured quote text."""

from typing import Protocol, runtime_checkable

from app.domain.payment_terms import ExtractedQuote, QuoteDocument


@runtime_checkable
class QuoteExtractor(Protocol):
    """Contract that a later real AI provider adapter must implement.

    The adapter is responsible for making the provider API call, requesting
    structured output, and validating that output before returning domain data.
    Provider clients and SDK types must not cross this boundary.
    """

    async def extract(self, quote: QuoteDocument) -> ExtractedQuote:
        """Extract supported terms and evidence from one pasted quote."""

        ...

