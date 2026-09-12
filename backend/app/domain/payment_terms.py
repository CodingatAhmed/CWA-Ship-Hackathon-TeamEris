"""Minimal payment-term models; normalization rules will be added later."""

from dataclasses import dataclass

from app.domain.evidence import EvidenceExcerpt


@dataclass(frozen=True, slots=True)
class QuoteDocument:
    """Unstructured user input sent through the extraction port."""

    quote_id: str
    route_name: str
    platform_or_context: str
    text: str


@dataclass(frozen=True, slots=True)
class PaymentTerm:
    """A provider-neutral extracted value grounded in pasted evidence."""

    name: str
    value: str
    evidence: tuple[EvidenceExcerpt, ...]


@dataclass(frozen=True, slots=True)
class ExtractedQuote:
    """Validated output expected from a QuoteExtractor adapter."""

    quote_id: str
    terms: tuple[PaymentTerm, ...]
    missing_terms: tuple[str, ...]

