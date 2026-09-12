"""Comparison use case coordinating extraction, validation, maths, and ranking."""

from dataclasses import dataclass, replace
from decimal import Decimal
from typing import Sequence

from app.application.quote_extractor import (
    QuoteExtractor,
    QuoteExtractorInvalidResponseError,
)
from app.domain.evidence import EvidenceValidationError, validate_term_evidence
from app.domain.fees import DecimalFeeEngine, FeeComponent
from app.domain.payment_terms import (
    EligibilityEffect,
    ExtractedQuote,
    MissingTerm,
    PaymentTerm,
    QuoteDocument,
    TermName,
    TermState,
)
from app.domain.ranking import (
    RankableRoute,
    RankingDecision,
    RankingPolicy,
    RouteStatus,
)


@dataclass(frozen=True, slots=True)
class RouteQuoteInput:
    quote_id: str
    route_name: str
    pasted_text: str


@dataclass(frozen=True, slots=True)
class ComparisonInput:
    invoice_amount: Decimal
    invoice_currency: str
    client_country: str
    platform_or_context: str
    route_quotes: tuple[RouteQuoteInput, ...]


@dataclass(frozen=True, slots=True)
class ComparedRoute:
    quote_id: str
    route_name: str
    status: RouteStatus
    extracted_terms: tuple[PaymentTerm, ...]
    missing_terms: tuple[MissingTerm, ...]
    unsupported_terms: tuple[MissingTerm, ...]
    itemized_fees: tuple[FeeComponent, ...]
    fx_rate_pkr: Decimal | None
    estimated_net_pkr: Decimal | None
    conditions: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ComparisonResult:
    routes: tuple[ComparedRoute, ...]
    recommendation: RankingDecision
    calculation_assumptions: tuple[str, ...]


class CompareQuotes:
    """Execute one evidence-first comparison without provider-specific imports."""

    def __init__(
        self,
        extractor: QuoteExtractor,
        fee_engine: DecimalFeeEngine,
        ranking_policy: RankingPolicy,
    ) -> None:
        self._extractor = extractor
        self._fee_engine = fee_engine
        self._ranking_policy = ranking_policy

    async def execute(self, comparison: ComparisonInput) -> ComparisonResult:
        routes: list[ComparedRoute] = []
        for route_quote in comparison.route_quotes:
            document = QuoteDocument(
                quote_id=route_quote.quote_id,
                route_name=route_quote.route_name,
                platform_or_context=comparison.platform_or_context,
                client_country=comparison.client_country,
                invoice_amount=comparison.invoice_amount,
                invoice_currency=comparison.invoice_currency,
                text=route_quote.pasted_text,
            )
            extracted = await self._extractor.extract(document)
            if extracted.quote_id != document.quote_id:
                raise QuoteExtractorInvalidResponseError(
                    "extractor returned a mismatched quote identifier"
                )
            routes.append(self._compare_route(document, extracted))

        ranking = self._ranking_policy.recommend(
            [
                RankableRoute(
                    quote_id=route.quote_id,
                    status=route.status,
                    estimated_net_pkr=route.estimated_net_pkr,
                    conditions=route.conditions,
                )
                for route in routes
            ]
        )
        return ComparisonResult(
            routes=tuple(routes),
            recommendation=ranking,
            calculation_assumptions=(
                (
                    "Estimates use only explicit terms from the pasted quotes "
                    "that pass same-quote evidence validation."
                ),
                (
                    "Money is calculated with Python Decimal and ROUND_HALF_UP "
                    "to 0.01."
                ),
                (
                    "A conversion rate is used only when stated as PKR per one "
                    "unit of the invoice currency."
                ),
                "No live provider rate, availability, tax, or regulatory fact is inferred.",
            ),
        )

    def _compare_route(
        self,
        document: QuoteDocument,
        extracted: ExtractedQuote,
    ) -> ComparedRoute:
        validated_terms: list[PaymentTerm] = []
        unsupported = list(extracted.unsupported_terms)

        for term in extracted.terms:
            try:
                validated_terms.append(
                    validate_term_evidence(document.text, document.quote_id, term)
                )
            except EvidenceValidationError as exc:
                unsupported.append(
                    MissingTerm(
                        name=term.name.value,
                        reason=str(exc),
                        affects_calculation=(
                            term.name is not TermName.SETTLEMENT_TIME
                        ),
                    )
                )

        eligibility_terms = [
            term
            for term in validated_terms
            if term.name is TermName.ELIGIBILITY_CONDITION
        ]
        missing = list(extracted.missing_terms)
        for term in validated_terms:
            if (
                term.state is TermState.CONDITIONAL
                and term.name is not TermName.ELIGIBILITY_CONDITION
                and not term.condition
            ):
                missing.append(
                    MissingTerm(
                        name=term.name.value,
                        reason="The quote does not state how the condition applies.",
                    )
                )
        if not eligibility_terms:
            missing.append(
                MissingTerm(
                    name=TermName.ELIGIBILITY_CONDITION.value,
                    reason=(
                        "The quote does not explicitly establish eligibility for "
                        "the supplied client and payment context."
                    ),
                )
            )

        for term in eligibility_terms:
            if term.eligibility_effect in {None, EligibilityEffect.UNKNOWN}:
                missing.append(
                    MissingTerm(
                        name=TermName.ELIGIBILITY_CONDITION.value,
                        reason="The eligibility effect is not explicit.",
                    )
                )

        conditions = _conditions(validated_terms)
        ineligible = any(
            term.eligibility_effect is EligibilityEffect.INELIGIBLE
            for term in eligibility_terms
        )
        if ineligible:
            return ComparedRoute(
                quote_id=document.quote_id,
                route_name=document.route_name,
                status=RouteStatus.INELIGIBLE,
                extracted_terms=tuple(validated_terms),
                missing_terms=_deduplicate_missing(missing),
                unsupported_terms=_deduplicate_missing(unsupported),
                itemized_fees=(),
                fx_rate_pkr=None,
                estimated_net_pkr=None,
                conditions=conditions,
            )

        estimate = self._fee_engine.calculate(
            invoice_amount=document.invoice_amount,
            invoice_currency=document.invoice_currency,
            terms=validated_terms,
        )
        missing.extend(estimate.missing_terms)
        calculation_blockers = [
            item
            for item in (*missing, *unsupported)
            if item.affects_calculation
        ]
        if estimate.estimated_net_pkr is None or calculation_blockers:
            status = RouteStatus.INSUFFICIENT_EVIDENCE
            estimate = replace(estimate, estimated_net_pkr=None)
        elif conditions:
            status = RouteStatus.CONDITIONAL
        else:
            status = RouteStatus.READY

        return ComparedRoute(
            quote_id=document.quote_id,
            route_name=document.route_name,
            status=status,
            extracted_terms=tuple(validated_terms),
            missing_terms=_deduplicate_missing(missing),
            unsupported_terms=_deduplicate_missing(unsupported),
            itemized_fees=estimate.components,
            fx_rate_pkr=estimate.fx_rate_pkr,
            estimated_net_pkr=estimate.estimated_net_pkr,
            conditions=conditions,
        )


def _conditions(terms: Sequence[PaymentTerm]) -> tuple[str, ...]:
    conditions: list[str] = []
    for term in terms:
        if term.condition:
            conditions.append(term.condition)
        elif (
            term.name is TermName.ELIGIBILITY_CONDITION
            and term.eligibility_effect is EligibilityEffect.CONDITIONAL
            and term.value
        ):
            conditions.append(term.value)
    return tuple(dict.fromkeys(conditions))


def _deduplicate_missing(items: Sequence[MissingTerm]) -> tuple[MissingTerm, ...]:
    by_name: dict[str, MissingTerm] = {}
    for item in items:
        by_name.setdefault(item.name, item)
    return tuple(by_name.values())
