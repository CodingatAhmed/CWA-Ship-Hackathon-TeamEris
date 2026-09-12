"""Strict request and evidence-rich response contracts for the public API."""

import re
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.domain.payment_terms import (
    EligibilityEffect,
    FeePayer,
    PercentageBase,
    TermName,
    TermState,
)
from app.domain.ranking import RouteStatus

CurrencyCode = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_upper=True,
        pattern=r"^[A-Z]{3}$",
    ),
]


class ApiModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class HealthResponse(ApiModel):
    status: Literal["ok"]
    service: str


class RouteQuote(ApiModel):
    quote_id: str = Field(min_length=1, max_length=80)
    route_name: str = Field(min_length=1, max_length=120)
    pasted_text: str = Field(min_length=1, max_length=50_000)


class CompareRequest(ApiModel):
    invoice_amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    invoice_currency: CurrencyCode
    client_country: str = Field(min_length=2, max_length=100)
    platform_or_context: str = Field(min_length=1, max_length=200)
    route_quotes: list[RouteQuote] = Field(min_length=2, max_length=10)

    @field_validator("invoice_amount", mode="before")
    @classmethod
    def invoice_amount_is_a_decimal_string(cls, value: object) -> object:
        if not isinstance(value, str):
            raise ValueError("invoice amount must be a decimal string")
        normalized = value.strip()
        if re.fullmatch(r"\d+(?:\.\d{1,2})?", normalized) is None:
            raise ValueError("invoice amount must be a canonical decimal string")
        return normalized

    @model_validator(mode="after")
    def route_quote_ids_are_unique(self) -> "CompareRequest":
        quote_ids = [quote.quote_id for quote in self.route_quotes]
        if len(quote_ids) != len(set(quote_ids)):
            raise ValueError("route quote IDs must be unique")
        return self


class EvidenceExcerpt(ApiModel):
    quote_id: str = Field(min_length=1, max_length=80)
    excerpt: str = Field(min_length=1, max_length=2_000)
    source_url: AnyHttpUrl | None = None
    start_char: int | None = Field(default=None, ge=0)
    end_char: int | None = Field(default=None, ge=0)


class ExtractedTerm(ApiModel):
    name: TermName
    value: str | None
    label: str | None = None
    currency: CurrencyCode | None = None
    payer: FeePayer | None = None
    percentage_base: PercentageBase | None = None
    condition: str | None = None
    state: TermState
    eligibility_effect: EligibilityEffect | None = None
    evidence: list[EvidenceExcerpt] = Field(min_length=1)


class MissingTerm(ApiModel):
    name: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=1, max_length=500)
    affects_calculation: bool


class FeeItem(ApiModel):
    label: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    currency: CurrencyCode
    payer: FeePayer
    is_deduction: bool
    evidence: list[EvidenceExcerpt] = Field(min_length=1)
    calculation_note: str = Field(min_length=1, max_length=500)


class RouteComparison(ApiModel):
    quote_id: str = Field(min_length=1, max_length=80)
    route_name: str = Field(min_length=1, max_length=120)
    status: RouteStatus
    extracted_terms: list[ExtractedTerm]
    missing_terms: list[MissingTerm]
    unsupported_terms: list[MissingTerm]
    itemized_fees: list[FeeItem]
    fx_rate_pkr: Decimal | None = Field(default=None, gt=0)
    estimated_net_pkr: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=18,
        decimal_places=2,
    )
    conditions: list[str]


class ConditionalRecommendation(ApiModel):
    quote_id: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=1_000)
    conditions: list[str]


class VerificationNotice(ApiModel):
    tax_and_regulatory_guidance: Literal[
        "Verify any tax or regulatory information with a qualified professional and current official sources."
    ] = "Verify any tax or regulatory information with a qualified professional and current official sources."
    official_source_urls: list[AnyHttpUrl] = Field(default_factory=list)


class CompareResponse(ApiModel):
    routes: list[RouteComparison] = Field(min_length=2)
    recommendation: ConditionalRecommendation | None
    recommendation_reason: str | None
    calculation_assumptions: list[str] = Field(min_length=1)
    verification_notice: VerificationNotice


class ServiceUnavailableResponse(ApiModel):
    detail: str
    retryable: Literal[True] = True


class UnexpectedErrorResponse(ApiModel):
    detail: Literal["Comparison failed unexpectedly."]
    retryable: Literal[False] = False
