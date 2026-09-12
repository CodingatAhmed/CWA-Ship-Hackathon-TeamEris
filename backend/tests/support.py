"""Deterministic test data kept out of production composition."""

from collections.abc import Mapping

from app.domain.evidence import EvidenceExcerpt
from app.domain.payment_terms import (
    EligibilityEffect,
    ExtractedQuote,
    FeePayer,
    MissingTerm,
    PaymentTerm,
    PercentageBase,
    QuoteDocument,
    TermName,
)

QUOTE_A = (
    "Available to Pakistan-based freelancers receiving USD from US direct clients. "
    "We deduct a 1% fee calculated on the original USD invoice, plus a fixed $10 "
    "withdrawal charge, from your payout. There are no other deductions. We convert "
    "the remaining USD at 275 PKR per USD. PKR receiving charge is 0."
)
QUOTE_B = (
    "Available to Pakistan-based freelancers receiving USD from US direct clients. "
    "The recipient pays a $25 USD incoming charge and a $10 USD intermediary charge, "
    "both deducted from the invoice. There are no other deductions. The remaining "
    "USD converts at 278 PKR per USD. PKR receiving charge is 0."
)


def evidence(quote_id: str, excerpt: str) -> tuple[EvidenceExcerpt, ...]:
    return (EvidenceExcerpt(quote_id=quote_id, excerpt=excerpt),)


def extracted_a() -> ExtractedQuote:
    quote_id = "route-a"
    return ExtractedQuote(
        quote_id=quote_id,
        terms=(
            PaymentTerm(
                name=TermName.ELIGIBILITY_CONDITION,
                value="Available for the supplied context",
                eligibility_effect=EligibilityEffect.ELIGIBLE,
                evidence=evidence(
                    quote_id,
                    "Available to Pakistan-based freelancers receiving USD from US direct clients.",
                ),
            ),
            PaymentTerm(
                name=TermName.PERCENTAGE_FEE,
                value="1",
                label="Service fee",
                currency=None,
                payer=FeePayer.FREELANCER,
                percentage_base=PercentageBase.ORIGINAL_INVOICE,
                evidence=evidence(
                    quote_id,
                    "a 1% fee calculated on the original USD invoice",
                ),
            ),
            PaymentTerm(
                name=TermName.FIXED_FEE,
                value="10",
                label="Withdrawal charge",
                currency="USD",
                payer=FeePayer.FREELANCER,
                evidence=evidence(quote_id, "a fixed $10 withdrawal charge"),
            ),
            PaymentTerm(
                name=TermName.FX_RATE_PKR,
                value="275",
                currency="USD",
                evidence=evidence(quote_id, "275 PKR per USD"),
            ),
            PaymentTerm(
                name=TermName.RECEIVING_FEE_PKR,
                value="0",
                label="PKR receiving charge",
                currency="PKR",
                payer=FeePayer.FREELANCER,
                evidence=evidence(quote_id, "PKR receiving charge is 0"),
            ),
        ),
    )


def extracted_b(*, include_rate: bool = True) -> ExtractedQuote:
    quote_id = "route-b"
    terms = [
        PaymentTerm(
            name=TermName.ELIGIBILITY_CONDITION,
            value="Available for the supplied context",
            eligibility_effect=EligibilityEffect.ELIGIBLE,
            evidence=evidence(
                quote_id,
                "Available to Pakistan-based freelancers receiving USD from US direct clients.",
            ),
        ),
        PaymentTerm(
            name=TermName.OTHER_FEE,
            value="25",
            label="Incoming charge",
            currency="USD",
            payer=FeePayer.FREELANCER,
            evidence=evidence(quote_id, "a $25 USD incoming charge"),
        ),
        PaymentTerm(
            name=TermName.OTHER_FEE,
            value="10",
            label="Intermediary charge",
            currency="USD",
            payer=FeePayer.FREELANCER,
            evidence=evidence(quote_id, "a $10 USD intermediary charge"),
        ),
        PaymentTerm(
            name=TermName.RECEIVING_FEE_PKR,
            value="0",
            label="PKR receiving charge",
            currency="PKR",
            payer=FeePayer.FREELANCER,
            evidence=evidence(quote_id, "PKR receiving charge is 0"),
        ),
    ]
    if include_rate:
        terms.insert(
            3,
            PaymentTerm(
                name=TermName.FX_RATE_PKR,
                value="278",
                currency="USD",
                evidence=evidence(quote_id, "278 PKR per USD"),
            ),
        )
    return ExtractedQuote(
        quote_id=quote_id,
        terms=tuple(terms),
        missing_terms=(
            ()
            if include_rate
            else (
                MissingTerm(
                    name=TermName.FX_RATE_PKR.value,
                    reason="The quote does not state a PKR conversion rate.",
                ),
            )
        ),
    )


class MappingExtractor:
    def __init__(self, results: Mapping[str, ExtractedQuote]) -> None:
        self._results = results

    async def extract(self, quote: QuoteDocument) -> ExtractedQuote:
        return self._results[quote.quote_id]
