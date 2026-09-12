import asyncio
from dataclasses import replace
from decimal import Decimal

from app.application.compare_quotes import CompareQuotes, ComparisonInput, RouteQuoteInput
from app.domain.evidence import EvidenceExcerpt
from app.domain.fees import DecimalFeeEngine
from app.domain.payment_terms import EligibilityEffect, ExtractedQuote, TermName
from app.domain.ranking import RankingPolicy, RouteStatus
from tests.support import QUOTE_A, QUOTE_B, MappingExtractor, extracted_a, extracted_b


def comparison(amount: str = "1000.00") -> ComparisonInput:
    return ComparisonInput(
        invoice_amount=Decimal(amount),
        invoice_currency="USD",
        client_country="United States",
        platform_or_context="Direct client invoice",
        route_quotes=(
            RouteQuoteInput("route-a", "Route A", QUOTE_A),
            RouteQuoteInput("route-b", "Route B", QUOTE_B),
        ),
    )


def execute(
    results: dict[str, ExtractedQuote],
    amount: str = "1000.00",
    comparison_input: ComparisonInput | None = None,
):
    use_case = CompareQuotes(
        extractor=MappingExtractor(results),
        fee_engine=DecimalFeeEngine(),
        ranking_policy=RankingPolicy(),
    )
    return asyncio.run(use_case.execute(comparison_input or comparison(amount)))


def test_fictional_case_is_calculated_without_hardcoded_api_totals() -> None:
    result = execute({"route-a": extracted_a(), "route-b": extracted_b()})

    assert [route.estimated_net_pkr for route in result.routes] == [
        Decimal("269500.00"),
        Decimal("268270.00"),
    ]
    assert result.recommendation.quote_id == "route-a"


def test_invoice_size_reverses_the_supported_winner() -> None:
    result = execute(
        {"route-a": extracted_a(), "route-b": extracted_b()},
        amount="1500.00",
    )

    assert [route.estimated_net_pkr for route in result.routes] == [
        Decimal("405625.00"),
        Decimal("407270.00"),
    ]
    assert result.recommendation.quote_id == "route-b"


def test_missing_fx_yields_null_net_and_no_comparative_winner() -> None:
    result = execute(
        {"route-a": extracted_a(), "route-b": extracted_b(include_rate=False)}
    )

    assert result.routes[1].status is RouteStatus.INSUFFICIENT_EVIDENCE
    assert result.routes[1].estimated_net_pkr is None
    assert result.recommendation.quote_id is None
    assert result.recommendation.reason.startswith("Only one route")


def test_invented_evidence_makes_only_that_route_insufficient() -> None:
    route_b = extracted_b()
    bad_rate = replace(
        route_b.terms[3],
        evidence=(
            EvidenceExcerpt(
                quote_id="route-b",
                excerpt="The invented rate is 999 PKR per USD.",
            ),
        ),
    )
    route_b = replace(
        route_b,
        terms=(*route_b.terms[:3], bad_rate, *route_b.terms[4:]),
    )

    result = execute({"route-a": extracted_a(), "route-b": route_b})

    assert result.routes[0].status is RouteStatus.READY
    assert result.routes[1].status is RouteStatus.INSUFFICIENT_EVIDENCE
    assert result.routes[1].estimated_net_pkr is None


def test_explicit_exclusion_is_ineligible_and_not_calculated() -> None:
    route_b = extracted_b()
    available_excerpt = (
        "Available to Pakistan-based freelancers receiving USD from US direct clients."
    )
    excluded_excerpt = (
        "Not available to Pakistan-based freelancers receiving USD from US direct clients."
    )
    excluded_quote = QUOTE_B.replace(available_excerpt, excluded_excerpt)
    ineligible = replace(
        route_b.terms[0],
        value="Not available for direct clients",
        eligibility_effect=EligibilityEffect.INELIGIBLE,
        evidence=(EvidenceExcerpt(quote_id="route-b", excerpt=excluded_excerpt),),
    )
    route_b = replace(route_b, terms=(ineligible, *route_b.terms[1:]))
    comparison_input = replace(
        comparison(),
        route_quotes=(
            RouteQuoteInput("route-a", "Route A", QUOTE_A),
            RouteQuoteInput("route-b", "Route B", excluded_quote),
        ),
    )

    result = execute(
        {"route-a": extracted_a(), "route-b": route_b},
        comparison_input=comparison_input,
    )

    assert result.routes[1].status is RouteStatus.INELIGIBLE
    assert result.routes[1].estimated_net_pkr is None
    assert result.routes[1].itemized_fees == ()


def test_evidenced_condition_is_visible_and_conditional() -> None:
    route_b = extracted_b()
    condition_excerpt = "Subject to account approval."
    conditional_quote = f"{QUOTE_B} {condition_excerpt}"
    conditional = replace(
        route_b.terms[0],
        value="Available after account approval",
        eligibility_effect=EligibilityEffect.CONDITIONAL,
        condition="Subject to account approval",
        evidence=(
            *route_b.terms[0].evidence,
            EvidenceExcerpt(quote_id="route-b", excerpt=condition_excerpt),
        ),
    )
    route_b = replace(route_b, terms=(conditional, *route_b.terms[1:]))
    comparison_input = replace(
        comparison(),
        route_quotes=(
            RouteQuoteInput("route-a", "Route A", QUOTE_A),
            RouteQuoteInput("route-b", "Route B", conditional_quote),
        ),
    )

    result = execute(
        {"route-a": extracted_a(), "route-b": route_b},
        comparison_input=comparison_input,
    )

    assert result.routes[1].status is RouteStatus.CONDITIONAL
    assert result.routes[1].conditions == ("Subject to account approval",)


def test_missing_eligibility_support_prevents_ready_status() -> None:
    route_b = extracted_b()
    route_b = replace(
        route_b,
        terms=tuple(
            term
            for term in route_b.terms
            if term.name is not TermName.ELIGIBILITY_CONDITION
        ),
    )

    result = execute({"route-a": extracted_a(), "route-b": route_b})

    assert result.routes[1].status is RouteStatus.INSUFFICIENT_EVIDENCE
    assert result.routes[1].estimated_net_pkr is None
