"""FastAPI composition root for the PayoutPath PK modular monolith."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings


def create_app() -> FastAPI:
    """Construct the HTTP application and wire edge dependencies."""

    settings = get_settings()
    application = FastAPI(
        title="PayoutPath PK API",
        version="0.1.0",
        description=(
            "Setup milestone only. Health is operational; comparison deliberately "
            "returns 501 until the real modules and AI adapter are implemented."
        ),
    )
    application.state.settings = settings

    if settings.allowed_frontend_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_frontend_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    application.include_router(router)
    return application


app = create_app()

