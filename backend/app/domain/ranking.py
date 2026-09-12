"""Deterministic route eligibility and highest-supported-net ranking policy."""

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from typing import Sequence


class RouteStatus(StrEnum):
    READY = "ready"
    CONDITIONAL = "conditional"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    INELIGIBLE = "ineligible"


@dataclass(frozen=True, slots=True)
class RankableRoute:
    quote_id: str
    status: RouteStatus
    estimated_net_pkr: Decimal | None
    conditions: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class RankingDecision:
    quote_id: str | None
    summary: str | None
    conditions: tuple[str, ...]
    reason: str | None


class RankingPolicy:
    """Recommend only when at least two supported route estimates are comparable."""

    def recommend(self, routes: Sequence[RankableRoute]) -> RankingDecision:
        candidates = [
            route
            for route in routes
            if route.status in {RouteStatus.READY, RouteStatus.CONDITIONAL}
            and route.estimated_net_pkr is not None
        ]

        if not candidates:
            return RankingDecision(
                quote_id=None,
                summary=None,
                conditions=(),
                reason="No route has enough supported evidence for comparison.",
            )
        if len(candidates) == 1:
            return RankingDecision(
                quote_id=None,
                summary=None,
                conditions=(),
                reason=(
                    "Only one route has a supported estimate; a comparative "
                    "recommendation would be unsafe."
                ),
            )

        highest = max(route.estimated_net_pkr for route in candidates)
        winners = [route for route in candidates if route.estimated_net_pkr == highest]
        if len(winners) != 1:
            return RankingDecision(
                quote_id=None,
                summary=None,
                conditions=(),
                reason=(
                    "Supported routes have the same estimated net PKR; no winner "
                    "is asserted."
                ),
            )

        winner = winners[0]
        return RankingDecision(
            quote_id=winner.quote_id,
            summary=(
                "Best estimated net amount from the evidence provided. "
                f"{winner.quote_id} has the highest supported estimate."
            ),
            conditions=winner.conditions,
            reason=None,
        )
