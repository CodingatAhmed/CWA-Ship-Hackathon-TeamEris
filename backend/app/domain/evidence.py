"""Evidence concepts; eligibility and sufficiency rules are intentionally pending."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EvidenceExcerpt:
    """Exact quote text used to support an extracted payment term."""

    quote_id: str
    excerpt: str
    start_char: int | None = None
    end_char: int | None = None

