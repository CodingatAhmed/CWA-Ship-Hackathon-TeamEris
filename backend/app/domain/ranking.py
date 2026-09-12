"""Ranking boundary; recommendation policy is intentionally not implemented."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol, Sequence


@dataclass(frozen=True, slots=True)
class RankableRoute:
    quote_id: str
    status: str
    estimated_net_pkr: Decimal | None
    conditions: tuple[str, ...]


class RankingPolicy(Protocol):
    """Select a route only when evidence and eligibility allow comparison."""

    def recommend(self, routes: Sequence[RankableRoute]) -> str | None:
        """Return a quote ID or no recommendation; rules will be added later."""

        ...

