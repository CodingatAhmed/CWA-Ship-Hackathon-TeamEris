from decimal import Decimal

from app.domain.evidence import EvidenceExcerpt
from app.domain.fees import DecimalFeeEngine
from app.domain.payment_terms import (
    FeePayer,
    PaymentTerm,
    PercentageBase,
    TermName,
)

ENGINE = DecimalFeeEngine()


def term(
    name: TermName,
    value: str,
    *,
    currency: str | None = None,
    payer: FeePayer | None = None,
    percentage_base: PercentageBase | None = None,
) -> PaymentTerm:
    return PaymentTerm(
        name=name,
        value=value,
        currency=currency,
        payer=payer,
        percentage_base=percentage_base,
        evidence=(EvidenceExcerpt(quote_id="route", excerpt=f"{name}: {value}"),),
    )


def rate(value: str = "275") -> PaymentTerm:
    return term(TermName.FX_RATE_PKR, value, currency="USD")


def test_fixed_percentage_and_receiving_fees_use_decimal_math() -> None:
    result = ENGINE.calculate(
        Decimal("1000.00"),
        "USD",
        [
            term(
                TermName.PERCENTAGE_FEE,
                "1",
                payer=FeePayer.FREELANCER,
                percentage_base=PercentageBase.ORIGINAL_INVOICE,
            ),
            term(
                TermName.FIXED_FEE,
                "10",
                currency="USD",
                payer=FeePayer.FREELANCER,
            ),
            rate(),
            term(
                TermName.RECEIVING_FEE_PKR,
                "100",
                currency="PKR",
                payer=FeePayer.FREELANCER,
            ),
        ],
    )

    assert [item.amount for item in result.components] == [
        Decimal("10.00"),
        Decimal("10.00"),
        Decimal("100.00"),
    ]
    assert result.estimated_net_pkr == Decimal("269400.00")


def test_sender_paid_fee_is_shown_but_not_subtracted() -> None:
    result = ENGINE.calculate(
        Decimal("100.00"),
        "USD",
        [
            term(
                TermName.FIXED_FEE,
                "10",
                currency="USD",
                payer=FeePayer.SENDER,
            ),
            rate("2"),
        ],
    )

    assert result.components[0].is_deduction is False
    assert result.estimated_net_pkr == Decimal("200.00")


def test_explicit_zero_receiving_fee_is_supported() -> None:
    result = ENGINE.calculate(
        Decimal("10.00"),
        "USD",
        [
            rate("2"),
            term(
                TermName.RECEIVING_FEE_PKR,
                "0",
                currency="PKR",
                payer=FeePayer.FREELANCER,
            ),
        ],
    )

    assert result.estimated_net_pkr == Decimal("20.00")


def test_missing_rate_refuses_a_net() -> None:
    result = ENGINE.calculate(Decimal("10.00"), "USD", [])

    assert result.estimated_net_pkr is None
    assert {item.name for item in result.missing_terms} == {"fx_rate_pkr"}


def test_foreign_currency_or_unknown_payer_refuses_a_net() -> None:
    for unsupported_fee in (
        term(
            TermName.FIXED_FEE,
            "10",
            currency="EUR",
            payer=FeePayer.FREELANCER,
        ),
        term(TermName.FIXED_FEE, "10", currency="USD"),
    ):
        result = ENGINE.calculate(
            Decimal("100.00"),
            "USD",
            [unsupported_fee, rate("2")],
        )
        assert result.estimated_net_pkr is None


def test_percentage_of_remaining_balance_is_refused() -> None:
    result = ENGINE.calculate(
        Decimal("100.00"),
        "USD",
        [
            term(
                TermName.PERCENTAGE_FEE,
                "2",
                payer=FeePayer.FREELANCER,
                percentage_base=PercentageBase.REMAINING_BALANCE,
            ),
            rate("2"),
        ],
    )

    assert result.estimated_net_pkr is None
    assert "original invoice" in result.missing_terms[0].reason


def test_round_half_up_applies_to_each_fee() -> None:
    result = ENGINE.calculate(
        Decimal("100.00"),
        "USD",
        [
            term(
                TermName.PERCENTAGE_FEE,
                "1.005",
                payer=FeePayer.FREELANCER,
                percentage_base=PercentageBase.ORIGINAL_INVOICE,
            ),
            rate("1"),
        ],
    )

    assert result.components[0].amount == Decimal("1.01")
    assert result.estimated_net_pkr == Decimal("98.99")


def test_negative_or_impossible_values_are_refused() -> None:
    negative_rate = ENGINE.calculate(Decimal("10.00"), "USD", [rate("-1")])
    excessive_fee = ENGINE.calculate(
        Decimal("10.00"),
        "USD",
        [
            term(
                TermName.FIXED_FEE,
                "20",
                currency="USD",
                payer=FeePayer.FREELANCER,
            ),
            rate("2"),
        ],
    )

    assert negative_rate.estimated_net_pkr is None
    assert excessive_fee.estimated_net_pkr is None
