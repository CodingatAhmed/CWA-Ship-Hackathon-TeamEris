"""Pure Decimal fee calculation for the deliberately supported MVP subset."""

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Sequence

from app.domain.evidence import EvidenceExcerpt
from app.domain.payment_terms import (
    FeePayer,
    MissingTerm,
    PaymentTerm,
    PercentageBase,
    TermName,
    TermState,
)

MONEY_QUANTUM = Decimal("0.01")


@dataclass(frozen=True, slots=True)
class FeeComponent:
    """One transparent quoted fee and whether it reduces freelancer proceeds."""

    label: str
    amount: Decimal
    currency: str
    payer: FeePayer
    is_deduction: bool
    evidence: tuple[EvidenceExcerpt, ...]
    calculation_note: str


@dataclass(frozen=True, slots=True)
class FeeEstimate:
    """Auditable calculation output; a missing interpretation yields no net."""

    components: tuple[FeeComponent, ...]
    fx_rate_pkr: Decimal | None
    estimated_net_pkr: Decimal | None
    missing_terms: tuple[MissingTerm, ...] = ()


class DecimalFeeEngine:
    """Calculate only explicitly supported fees using ROUND_HALF_UP to 0.01."""

    def calculate(
        self,
        invoice_amount: Decimal,
        invoice_currency: str,
        terms: Sequence[PaymentTerm],
    ) -> FeeEstimate:
        if not invoice_amount.is_finite() or invoice_amount <= 0:
            raise ValueError("invoice amount must be a positive finite Decimal")

        invoice_currency = invoice_currency.upper()
        components: list[FeeComponent] = []
        missing: list[MissingTerm] = []
        invoice_deductions = Decimal("0.00")
        pkr_deductions = Decimal("0.00")
        fx_rates: list[Decimal] = []

        for term in terms:
            if term.state in {TermState.CONTRADICTORY, TermState.UNSUPPORTED}:
                missing.append(
                    MissingTerm(
                        name=term.name.value,
                        reason=f"The extracted term is {term.state.value}.",
                    )
                )
                continue

            if term.name in {TermName.FIXED_FEE, TermName.OTHER_FEE}:
                component, error = self._money_fee(
                    term=term,
                    expected_currency=invoice_currency,
                )
                if error:
                    missing.append(error)
                    continue
                assert component is not None
                components.append(component)
                if component.is_deduction:
                    invoice_deductions += component.amount
                continue

            if term.name is TermName.PERCENTAGE_FEE:
                component, error = self._percentage_fee(
                    term=term,
                    invoice_amount=invoice_amount,
                    invoice_currency=invoice_currency,
                )
                if error:
                    missing.append(error)
                    continue
                assert component is not None
                components.append(component)
                if component.is_deduction:
                    invoice_deductions += component.amount
                continue

            if term.name is TermName.FX_RATE_PKR:
                rate, error = self._fx_rate(term, invoice_currency)
                if error:
                    missing.append(error)
                elif rate is not None:
                    fx_rates.append(rate)
                continue

            if term.name is TermName.RECEIVING_FEE_PKR:
                component, error = self._money_fee(
                    term=term,
                    expected_currency="PKR",
                )
                if error:
                    missing.append(error)
                    continue
                assert component is not None
                components.append(component)
                if component.is_deduction:
                    pkr_deductions += component.amount

        if not fx_rates:
            missing.append(
                MissingTerm(
                    name=TermName.FX_RATE_PKR.value,
                    reason=(
                        "The quote does not provide a supported PKR-per-invoice-"
                        "currency conversion rate."
                    ),
                )
            )
        elif len(fx_rates) > 1:
            missing.append(
                MissingTerm(
                    name=TermName.FX_RATE_PKR.value,
                    reason="The quote contains multiple usable conversion rates.",
                )
            )

        if missing:
            return FeeEstimate(
                components=tuple(components),
                fx_rate_pkr=fx_rates[0] if len(fx_rates) == 1 else None,
                estimated_net_pkr=None,
                missing_terms=_deduplicate_missing(missing),
            )

        fx_rate = fx_rates[0]
        convertible = invoice_amount - invoice_deductions
        if convertible < 0:
            return FeeEstimate(
                components=tuple(components),
                fx_rate_pkr=fx_rate,
                estimated_net_pkr=None,
                missing_terms=(
                    MissingTerm(
                        name="estimated_net_pkr",
                        reason="Quoted deductions exceed the invoice amount.",
                    ),
                ),
            )

        converted_pkr = (convertible * fx_rate).quantize(
            MONEY_QUANTUM,
            rounding=ROUND_HALF_UP,
        )
        net_pkr = (converted_pkr - pkr_deductions).quantize(
            MONEY_QUANTUM,
            rounding=ROUND_HALF_UP,
        )
        if net_pkr < 0:
            return FeeEstimate(
                components=tuple(components),
                fx_rate_pkr=fx_rate,
                estimated_net_pkr=None,
                missing_terms=(
                    MissingTerm(
                        name="estimated_net_pkr",
                        reason="Quoted PKR deductions exceed converted proceeds.",
                    ),
                ),
            )

        return FeeEstimate(
            components=tuple(components),
            fx_rate_pkr=fx_rate,
            estimated_net_pkr=net_pkr,
        )

    def _money_fee(
        self,
        term: PaymentTerm,
        expected_currency: str,
    ) -> tuple[FeeComponent | None, MissingTerm | None]:
        amount, error = _parse_nonnegative(term)
        if error:
            return None, error
        if term.currency is None:
            return None, _missing(term, "The fee currency is not explicit.")
        if term.currency.upper() != expected_currency:
            return None, _missing(
                term,
                f"The fee currency must be {expected_currency} for this calculation.",
            )
        if term.payer not in {FeePayer.FREELANCER, FeePayer.SENDER}:
            return None, _missing(term, "The fee payer is not explicit.")

        assert amount is not None
        rounded = amount.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
        is_deduction = term.payer is FeePayer.FREELANCER
        note = (
            "Deducted from freelancer proceeds."
            if is_deduction
            else "Paid by the sender; not deducted from freelancer proceeds."
        )
        return (
            FeeComponent(
                label=term.label or term.name.value.replace("_", " ").title(),
                amount=rounded,
                currency=expected_currency,
                payer=term.payer,
                is_deduction=is_deduction,
                evidence=term.evidence,
                calculation_note=note,
            ),
            None,
        )

    def _percentage_fee(
        self,
        term: PaymentTerm,
        invoice_amount: Decimal,
        invoice_currency: str,
    ) -> tuple[FeeComponent | None, MissingTerm | None]:
        percentage, error = _parse_nonnegative(term)
        if error:
            return None, error
        if term.currency is not None:
            return None, _missing(
                term,
                "A percentage fee must not carry a monetary currency.",
            )
        if term.percentage_base is not PercentageBase.ORIGINAL_INVOICE:
            return None, _missing(
                term,
                "Only a percentage of the original invoice is supported.",
            )
        if term.payer not in {FeePayer.FREELANCER, FeePayer.SENDER}:
            return None, _missing(term, "The percentage fee payer is not explicit.")

        assert percentage is not None
        amount = (invoice_amount * percentage / Decimal("100")).quantize(
            MONEY_QUANTUM,
            rounding=ROUND_HALF_UP,
        )
        is_deduction = term.payer is FeePayer.FREELANCER
        note = (
            f"{percentage}% of the original invoice amount; "
            + (
                "deducted from freelancer proceeds."
                if is_deduction
                else "paid by the sender and not deducted."
            )
        )
        return (
            FeeComponent(
                label=term.label or "Percentage fee",
                amount=amount,
                currency=invoice_currency,
                payer=term.payer,
                is_deduction=is_deduction,
                evidence=term.evidence,
                calculation_note=note,
            ),
            None,
        )

    def _fx_rate(
        self,
        term: PaymentTerm,
        invoice_currency: str,
    ) -> tuple[Decimal | None, MissingTerm | None]:
        rate, error = _parse_positive(term)
        if error:
            return None, error
        if term.currency is None or term.currency.upper() != invoice_currency:
            return None, _missing(
                term,
                (
                    "The conversion rate must explicitly be PKR per one unit of "
                    "the invoice currency."
                ),
            )
        return rate, None


def _parse_nonnegative(
    term: PaymentTerm,
) -> tuple[Decimal | None, MissingTerm | None]:
    if term.value is None:
        return None, _missing(term, "The numeric value is missing.")
    if len(term.value) > 50 or re.fullmatch(r"\d+(?:\.\d+)?", term.value) is None:
        return None, _missing(
            term,
            "The numeric value must be a canonical non-negative decimal string.",
        )
    try:
        value = Decimal(term.value)
    except InvalidOperation:
        return None, _missing(term, "The numeric value is invalid.")
    if not value.is_finite() or value < 0:
        return None, _missing(term, "The numeric value must be finite and non-negative.")
    return value, None


def _parse_positive(
    term: PaymentTerm,
) -> tuple[Decimal | None, MissingTerm | None]:
    value, error = _parse_nonnegative(term)
    if error:
        return None, error
    if value == 0:
        return None, _missing(term, "The conversion rate must be positive.")
    return value, None


def _missing(term: PaymentTerm, reason: str) -> MissingTerm:
    return MissingTerm(name=term.name.value, reason=reason)


def _deduplicate_missing(items: Sequence[MissingTerm]) -> tuple[MissingTerm, ...]:
    by_name: dict[str, MissingTerm] = {}
    for item in items:
        by_name.setdefault(item.name, item)
    return tuple(by_name.values())
