"""HTTP translation for health and the comparison use case."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.api.schemas import (
    CompareRequest,
    CompareResponse,
    ConditionalRecommendation,
    EvidenceExcerpt,
    ExtractedTerm,
    FeeItem,
    HealthResponse,
    MissingTerm,
    RouteComparison,
    ServiceUnavailableResponse,
    UnexpectedErrorResponse,
    VerificationNotice,
)
from app.application.compare_quotes import (
    CompareQuotes,
    ComparedRoute,
    ComparisonInput,
    RouteQuoteInput,
)
from app.application.quote_extractor import QuoteExtractorError
from app.domain.evidence import EvidenceExcerpt as DomainEvidenceExcerpt

router = APIRouter()


def get_compare_quotes(request: Request) -> CompareQuotes:
    """Resolve the composition-root service; tests can override this dependency."""

    return request.app.state.compare_quotes


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["system"],
    summary="Check API health",
)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="payoutpath-pk-api")


@router.post(
    "/api/compare",
    response_model=CompareResponse,
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ServiceUnavailableResponse,
            "description": "The configured AI extraction service is unavailable.",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": UnexpectedErrorResponse,
            "description": "An unexpected comparison failure occurred safely.",
        }
    },
    tags=["comparison"],
    summary="Compare payout route quotes from their supplied evidence",
)
async def compare_quotes(
    request: CompareRequest,
    use_case: CompareQuotes = Depends(get_compare_quotes),
) -> CompareResponse | JSONResponse:
    command = ComparisonInput(
        invoice_amount=request.invoice_amount,
        invoice_currency=request.invoice_currency,
        client_country=request.client_country,
        platform_or_context=request.platform_or_context,
        route_quotes=tuple(
            RouteQuoteInput(
                quote_id=quote.quote_id,
                route_name=quote.route_name,
                pasted_text=quote.pasted_text,
            )
            for quote in request.route_quotes
        ),
    )
    # Build the response inside the guard as well: serializing extracted values
    # can still fail validation, and that must stay a safe JSON error rather
    # than an unhandled exception surfacing as a bare ASGI 500.
    try:
        result = await use_case.execute(command)

        recommendation = None
        if result.recommendation.quote_id and result.recommendation.summary:
            recommendation = ConditionalRecommendation(
                quote_id=result.recommendation.quote_id,
                summary=result.recommendation.summary,
                conditions=list(result.recommendation.conditions),
            )

        return CompareResponse(
            routes=[_route_response(route) for route in result.routes],
            recommendation=recommendation,
            recommendation_reason=result.recommendation.reason,
            calculation_assumptions=list(result.calculation_assumptions),
            verification_notice=VerificationNotice(),
        )
    except QuoteExtractorError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": exc.public_message, "retryable": True},
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Comparison failed unexpectedly.", "retryable": False},
        )


def _route_response(route: ComparedRoute) -> RouteComparison:
    return RouteComparison(
        quote_id=route.quote_id,
        route_name=route.route_name,
        status=route.status,
        extracted_terms=[
            ExtractedTerm(
                name=term.name,
                value=term.value,
                label=term.label,
                currency=term.currency,
                payer=term.payer,
                percentage_base=term.percentage_base,
                condition=term.condition,
                state=term.state,
                eligibility_effect=term.eligibility_effect,
                evidence=[_evidence(item) for item in term.evidence],
            )
            for term in route.extracted_terms
        ],
        missing_terms=[
            MissingTerm(
                name=item.name,
                reason=item.reason,
                affects_calculation=item.affects_calculation,
            )
            for item in route.missing_terms
        ],
        unsupported_terms=[
            MissingTerm(
                name=item.name,
                reason=item.reason,
                affects_calculation=item.affects_calculation,
            )
            for item in route.unsupported_terms
        ],
        itemized_fees=[
            FeeItem(
                label=item.label,
                amount=item.amount,
                currency=item.currency,
                payer=item.payer,
                is_deduction=item.is_deduction,
                evidence=[_evidence(evidence) for evidence in item.evidence],
                calculation_note=item.calculation_note,
            )
            for item in route.itemized_fees
        ],
        fx_rate_pkr=route.fx_rate_pkr,
        estimated_net_pkr=route.estimated_net_pkr,
        conditions=list(route.conditions),
    )


def _evidence(item: DomainEvidenceExcerpt) -> EvidenceExcerpt:
    return EvidenceExcerpt(
        quote_id=item.quote_id,
        excerpt=item.excerpt,
        start_char=item.start_char,
        end_char=item.end_char,
    )
