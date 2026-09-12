"""HTTP route definitions for the setup milestone."""

from fastapi import APIRouter, HTTPException, status

from app.api.schemas import (
    CompareRequest,
    CompareResponse,
    HealthResponse,
    NotImplementedResponse,
)

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["system"],
    summary="Check API health",
)
async def health() -> HealthResponse:
    """Return a dependency-free liveness response."""

    return HealthResponse(status="ok", service="payoutpath-pk-api")


@router.post(
    "/api/compare",
    response_model=CompareResponse,
    responses={
        status.HTTP_501_NOT_IMPLEMENTED: {
            "model": NotImplementedResponse,
            "description": "Comparison modules have not been implemented.",
        }
    },
    tags=["comparison"],
    summary="Compare payout route quotes (planned)",
)
async def compare_quotes(_: CompareRequest) -> CompareResponse:
    """Expose the future contract without manufacturing comparison results."""

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Comparison is not implemented in the setup milestone.",
    )

