from dataclasses import replace

import pytest

from app.domain.evidence import EvidenceExcerpt, EvidenceValidationError, validate_term_evidence
from app.domain.payment_terms import PaymentTerm, TermName, TermState


def test_evidence_offsets_are_recomputed_from_same_quote() -> None:
    quote = "The recipient pays a fixed fee of USD 10."
    term = PaymentTerm(
        name=TermName.FIXED_FEE,
        value="10",
        evidence=(
            EvidenceExcerpt(
                quote_id="route-a",
                excerpt="fixed fee of USD 10",
                start_char=999,
                end_char=1000,
            ),
        ),
    )

    validated = validate_term_evidence(quote, "route-a", term)

    assert validated.evidence[0].start_char == quote.index("fixed fee")
    assert validated.evidence[0].end_char == quote.index("fixed fee") + 19


@pytest.mark.parametrize(
    "evidence",
    [
        EvidenceExcerpt(quote_id="route-b", excerpt="USD 10"),
        EvidenceExcerpt(quote_id="route-a", excerpt="invented USD 10"),
        EvidenceExcerpt(quote_id="route-a", excerpt=""),
    ],
)
def test_invalid_or_cross_quote_evidence_is_rejected(
    evidence: EvidenceExcerpt,
) -> None:
    term = PaymentTerm(
        name=TermName.FIXED_FEE,
        value="10",
        evidence=(evidence,),
    )

    with pytest.raises(EvidenceValidationError):
        validate_term_evidence("The fee is USD 10.", "route-a", term)


def test_contradictory_term_is_not_usable_even_with_real_excerpt() -> None:
    term = PaymentTerm(
        name=TermName.FIXED_FEE,
        value=None,
        evidence=(EvidenceExcerpt(quote_id="route-a", excerpt="USD 10 or USD 20"),),
        state=TermState.CONTRADICTORY,
    )

    with pytest.raises(EvidenceValidationError):
        validate_term_evidence("Fee is USD 10 or USD 20.", "route-a", term)


def test_invented_condition_is_rejected() -> None:
    term = PaymentTerm(
        name=TermName.FIXED_FEE,
        value="10",
        condition="Only on weekdays",
        evidence=(EvidenceExcerpt(quote_id="route-a", excerpt="Fee is USD 10"),),
    )

    with pytest.raises(EvidenceValidationError, match="condition"):
        validate_term_evidence("Fee is USD 10.", "route-a", term)


def test_numeric_value_that_disagrees_with_evidence_is_rejected() -> None:
    term = PaymentTerm(
        name=TermName.FIXED_FEE,
        value="20",
        evidence=(EvidenceExcerpt(quote_id="route-a", excerpt="Fee is USD 10"),),
    )

    with pytest.raises(EvidenceValidationError, match="numeric value"):
        validate_term_evidence("Fee is USD 10.", "route-a", term)


def test_unsupported_term_name_is_rejected() -> None:
    valid = PaymentTerm(
        name=TermName.FIXED_FEE,
        value="10",
        evidence=(),
    )

    with pytest.raises(ValueError, match="unsupported"):
        replace(valid, name="made_up_fee")
