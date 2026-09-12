from decimal import Decimal

from app.domain.ranking import RankableRoute, RankingPolicy, RouteStatus


def route(
    quote_id: str,
    amount: str | None,
    *,
    status: RouteStatus = RouteStatus.READY,
    conditions: tuple[str, ...] = (),
) -> RankableRoute:
    return RankableRoute(
        quote_id=quote_id,
        status=status,
        estimated_net_pkr=Decimal(amount) if amount else None,
        conditions=conditions,
    )


def test_highest_supported_net_wins_and_carries_conditions() -> None:
    decision = RankingPolicy().recommend(
        [
            route("a", "100"),
            route(
                "b",
                "110",
                status=RouteStatus.CONDITIONAL,
                conditions=("Subject to account approval",),
            ),
        ]
    )

    assert decision.quote_id == "b"
    assert decision.summary.startswith(
        "Best estimated net amount from the evidence provided."
    )
    assert decision.conditions == ("Subject to account approval",)


def test_tie_has_no_invented_winner() -> None:
    decision = RankingPolicy().recommend([route("a", "100"), route("b", "100")])

    assert decision.quote_id is None
    assert "same estimated net" in decision.reason


def test_one_supported_route_is_not_a_comparative_recommendation() -> None:
    decision = RankingPolicy().recommend(
        [
            route("a", "100"),
            route("b", None, status=RouteStatus.INSUFFICIENT_EVIDENCE),
        ]
    )

    assert decision.quote_id is None
    assert decision.reason.startswith("Only one route")


def test_ineligible_and_insufficient_routes_are_not_ranked() -> None:
    decision = RankingPolicy().recommend(
        [
            route("a", "200", status=RouteStatus.INELIGIBLE),
            route("b", None, status=RouteStatus.INSUFFICIENT_EVIDENCE),
        ]
    )

    assert decision.quote_id is None
    assert decision.reason.startswith("No route")
