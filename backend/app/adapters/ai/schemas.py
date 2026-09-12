"""Strict provider-boundary schemas for structured quote extraction."""

import re

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.payment_terms import (
    EligibilityEffect,
    FeePayer,
    PercentageBase,
    TermName,
    TermState,
)


class AdapterModel(BaseModel):
    """Reject provider fields that are not part of the extraction contract."""

    model_config = ConfigDict(extra="forbid")


class CandidateEvidence(AdapterModel):
    quote_id: str = Field(min_length=1)
    excerpt: str = Field(min_length=1)
    start_char: int | None
    end_char: int | None


class CandidateTerm(AdapterModel):
    name: TermName
    value: str | None
    label: str | None
    currency: str | None
    payer: FeePayer | None
    percentage_base: PercentageBase | None
    condition: str | None
    state: TermState
    eligibility_effect: EligibilityEffect | None
    evidence: list[CandidateEvidence] = Field(min_length=1)

    @model_validator(mode="after")
    def enforce_term_shape(self) -> "CandidateTerm":
        """Apply semantic constraints that JSON field types cannot express."""

        numeric_terms = {
            TermName.FIXED_FEE,
            TermName.PERCENTAGE_FEE,
            TermName.FX_RATE_PKR,
            TermName.RECEIVING_FEE_PKR,
            TermName.OTHER_FEE,
        }
        monetary_terms = {
            TermName.FIXED_FEE,
            TermName.FX_RATE_PKR,
            TermName.RECEIVING_FEE_PKR,
            TermName.OTHER_FEE,
        }
        currency_free_terms = {
            TermName.PERCENTAGE_FEE,
            TermName.SETTLEMENT_TIME,
            TermName.ELIGIBILITY_CONDITION,
        }

        if self.name in numeric_terms and (
            self.value is None
            or re.fullmatch(r"\d+(?:\.\d+)?", self.value) is None
        ):
            raise ValueError("numeric terms require a canonical decimal value")
        if self.name in monetary_terms and not self.currency:
            raise ValueError("monetary terms require an explicit currency")
        if self.name in currency_free_terms and self.currency is not None:
            raise ValueError("percentage and descriptive terms require null currency")
        return self


class CandidateMissingTerm(AdapterModel):
    name: str
    reason: str
    affects_calculation: bool


class ExtractionPayload(AdapterModel):
    quote_id: str = Field(min_length=1)
    terms: list[CandidateTerm]
    missing_terms: list[CandidateMissingTerm]
    unsupported_terms: list[CandidateMissingTerm]
