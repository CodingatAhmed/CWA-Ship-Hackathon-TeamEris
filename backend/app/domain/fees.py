"""Fee-calculation boundary; Decimal-based business rules are the next module."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol, Sequence

from app.domain.payment_terms import PaymentTerm


@dataclass(frozen=True, slots=True)
class FeeComponent:
    """One transparent fee line produced by the future fee engine."""

    label: str
    amount: Decimal
    currency: str
    calculation_note: str


@dataclass(frozen=True, slots=True)
class FeeEstimate:
    """Auditable output of a future calculation, without implicit float math."""

    components: tuple[FeeComponent, ...]
    estimated_net_pkr: Decimal | None


class FeeEngine(Protocol):
    """Interface to implement and test with Decimal arithmetic next."""

    def calculate(
        self,
        invoice_amount: Decimal,
        invoice_currency: str,
        terms: Sequence[PaymentTerm],
    ) -> FeeEstimate:
        """Calculate an itemized estimate from validated terms."""

        ...

