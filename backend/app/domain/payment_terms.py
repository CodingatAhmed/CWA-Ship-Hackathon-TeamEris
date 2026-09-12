"""Provider-neutral payment-term models produced by quote extraction."""

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum

from app.domain.evidence import EvidenceExcerpt


class TermName(StrEnum):
    """Payment terms supported by the first deterministic comparison release."""

    FIXED_FEE = "fixed_fee"
    PERCENTAGE_FEE = "percentage_fee"
    FX_RATE_PKR = "fx_rate_pkr"
    RECEIVING_FEE_PKR = "receiving_fee_pkr"
    OTHER_FEE = "other_fee"
    SETTLEMENT_TIME = "settlement_time"
    ELIGIBILITY_CONDITION = "eligibility_condition"


class TermState(StrEnum):
    """Whether a candidate term can be relied on as stated."""

    EXPLICIT = "explicit"
    CONDITIONAL = "conditional"
    CONTRADICTORY = "contradictory"
    UNSUPPORTED = "unsupported"


class FeePayer(StrEnum):
    FREELANCER = "freelancer"
    SENDER = "sender"
    UNKNOWN = "unknown"


class PercentageBase(StrEnum):
    ORIGINAL_INVOICE = "original_invoice"
    REMAINING_BALANCE = "remaining_balance"
    UNKNOWN = "unknown"


class EligibilityEffect(StrEnum):
    ELIGIBLE = "eligible"
    CONDITIONAL = "conditional"
    INELIGIBLE = "ineligible"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class QuoteDocument:
    """One user quote plus only the invoice context needed for extraction."""

    quote_id: str
    route_name: str
    platform_or_context: str
    client_country: str
    invoice_amount: Decimal
    invoice_currency: str
    text: str


@dataclass(frozen=True, slots=True)
class MissingTerm:
    """A fact that was absent, ambiguous, contradictory, or unsupported."""

    name: str
    reason: str
    affects_calculation: bool = True


@dataclass(frozen=True, slots=True)
class PaymentTerm:
    """A normalized extracted value grounded in the user's pasted quote."""

    name: TermName
    value: str | None
    evidence: tuple[EvidenceExcerpt, ...]
    label: str | None = None
    currency: str | None = None
    payer: FeePayer | None = None
    percentage_base: PercentageBase | None = None
    condition: str | None = None
    state: TermState = TermState.EXPLICIT
    eligibility_effect: EligibilityEffect | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.name, TermName):
            raise ValueError("unsupported payment term name")
        if self.value is not None and not self.value.strip():
            raise ValueError("payment term value cannot be blank")


@dataclass(frozen=True, slots=True)
class ExtractedQuote:
    """Strictly parsed candidate output returned through QuoteExtractor."""

    quote_id: str
    terms: tuple[PaymentTerm, ...]
    missing_terms: tuple[MissingTerm, ...] = ()
    unsupported_terms: tuple[MissingTerm, ...] = ()
