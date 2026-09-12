"""Exact same-quote provenance validation for extracted payment terms."""

import re
from dataclasses import dataclass, replace
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.domain.payment_terms import PaymentTerm


@dataclass(frozen=True, slots=True)
class EvidenceExcerpt:
    """Verbatim quote text supporting an extracted payment term."""

    quote_id: str
    excerpt: str
    start_char: int | None = None
    end_char: int | None = None


class EvidenceValidationError(ValueError):
    """Raised when a candidate term lacks usable same-quote evidence."""


NUMERIC_TERM_NAMES = {
    "fixed_fee",
    "percentage_fee",
    "fx_rate_pkr",
    "receiving_fee_pkr",
    "other_fee",
}
NUMBER_PATTERN = re.compile(
    r"(?<![\w.])(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?![\w.])"
)


def validate_term_evidence(
    quote_text: str,
    quote_id: str,
    term: "PaymentTerm",
) -> "PaymentTerm":
    """Return a term with server-computed offsets or reject its provenance.

    Excerpts are matched case-sensitively and verbatim against the server's copy
    of the quote. Provider-supplied offsets are never trusted; they are replaced
    with offsets calculated here.
    """

    from app.domain.payment_terms import TermState

    if term.state in {TermState.CONTRADICTORY, TermState.UNSUPPORTED}:
        raise EvidenceValidationError(
            f"{term.name.value} is {term.state.value} and cannot be used"
        )
    if not term.evidence:
        raise EvidenceValidationError(
            f"{term.name.value} has no supporting evidence excerpt"
        )

    validated: list[EvidenceExcerpt] = []
    for evidence in term.evidence:
        if evidence.quote_id != quote_id:
            raise EvidenceValidationError(
                f"{term.name.value} evidence belongs to another quote"
            )
        if not evidence.excerpt:
            raise EvidenceValidationError(
                f"{term.name.value} evidence excerpt is empty"
            )
        start = quote_text.find(evidence.excerpt)
        if start < 0:
            raise EvidenceValidationError(
                f"{term.name.value} evidence is not verbatim in this quote"
            )
        validated.append(
            EvidenceExcerpt(
                quote_id=quote_id,
                excerpt=evidence.excerpt,
                start_char=start,
                end_char=start + len(evidence.excerpt),
            )
        )

    if term.condition and not any(
        term.condition in evidence.excerpt for evidence in validated
    ):
        raise EvidenceValidationError(
            f"{term.name.value} condition is not verbatim in its evidence"
        )

    if term.name.value in NUMERIC_TERM_NAMES:
        if term.value is None or not _evidence_contains_value(term.value, validated):
            raise EvidenceValidationError(
                f"{term.name.value} numeric value does not match its evidence"
            )

    return replace(term, evidence=tuple(validated))


def _evidence_contains_value(
    expected_value: str,
    evidence_items: list[EvidenceExcerpt],
) -> bool:
    """Compare normalized decimals without guessing values absent from excerpts."""

    try:
        expected = Decimal(expected_value)
    except InvalidOperation:
        return False
    if not expected.is_finite():
        return False

    for evidence in evidence_items:
        for match in NUMBER_PATTERN.finditer(evidence.excerpt):
            try:
                candidate = Decimal(match.group().replace(",", ""))
            except InvalidOperation:
                continue
            if candidate == expected:
                return True
    return False
