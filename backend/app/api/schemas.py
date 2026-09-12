"""Pydantic request and response contracts for the public HTTP API."""

from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

CurrencyCode = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_upper=True,
        pattern=r"^[A-Z]{3}$",
    ),
]


class ApiModel(BaseModel):
    """Shared strict-enough defaults for transport models."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class HealthResponse(ApiModel):
    status: Literal["ok"]
    service: str


class RouteQuote(ApiModel):
    """One route quote pasted verbatim by the user."""

    quote_id: str = Field(min_length=1, max_length=80)
    route_name: str = Field(min_length=1, max_length=120)
    pasted_text: str = Field(min_length=1, max_length=50_000)


class CompareRequest(ApiModel):
    """Inputs needed by the future comparison use case."""

    invoice_amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    invoice_currency: CurrencyCode
    client_country: str = Field(min_length=2, max_length=100)
    platform_or_context: str = Field(min_length=1, max_length=200)
    route_quotes: list[RouteQuote] = Field(min_length=2, max_length=10)

    @model_validator(mode="after")
    def route_quote_ids_are_unique(self) -> "CompareRequest":
        quote_ids = [quote.quote_id for quote in self.route_quotes]
        if len(quote_ids) != len(set(quote_ids)):
            raise ValueError("route quote IDs must be unique")
        return self


class RouteStatus(StrEnum):
    READY = "ready"
    CONDITIONAL = "conditional"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    INELIGIBLE = "ineligible"


class EvidenceExcerpt(ApiModel):
    """Text grounding for a single extracted term."""

    quote_id: str = Field(min_length=1, max_length=80)
    excerpt: str = Field(min_length=1, max_length=2_000)
    source_url: AnyHttpUrl | None = None
    start_char: int | None = Field(default=None, ge=0)
    end_char: int | None = Field(default=None, ge=0)


class ExtractedTerm(ApiModel):
    """A normalized display value with evidence; never an unsupported guess."""

    name: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=500)
    evidence: list[EvidenceExcerpt] = Field(min_length=1)


class MissingTerm(ApiModel):
    name: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=1, max_length=500)


class FeeItem(ApiModel):
    """One auditable component of a future Decimal-based estimate."""

    label: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    currency: CurrencyCode
    calculation_note: str = Field(min_length=1, max_length=500)


class RouteComparison(ApiModel):
    quote_id: str = Field(min_length=1, max_length=80)
    route_name: str = Field(min_length=1, max_length=120)
    status: RouteStatus
    extracted_terms: list[ExtractedTerm]
    missing_terms: list[MissingTerm]
    itemized_fees: list[FeeItem]
    estimated_net_pkr: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=18,
        decimal_places=2,
    )
    conditions: list[str]


class ConditionalRecommendation(ApiModel):
    """A non-absolute recommendation whose assumptions remain visible."""

    quote_id: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=1_000)
    conditions: list[str] = Field(min_length=1)


class VerificationNotice(ApiModel):
    """Required verification language for regulatory or tax-related output."""

    tax_and_regulatory_guidance: Literal[
        "Verify any tax or regulatory information with a qualified professional and current official sources."
    ] = "Verify any tax or regulatory information with a qualified professional and current official sources."
    official_source_urls: list[AnyHttpUrl] = Field(default_factory=list)


class CompareResponse(ApiModel):
    """Planned successful response; the current route never fabricates one."""

    routes: list[RouteComparison] = Field(min_length=2)
    recommendation: ConditionalRecommendation | None
    verification_notice: VerificationNotice


class NotImplementedResponse(ApiModel):
    detail: Literal["Comparison is not implemented in the setup milestone."]

