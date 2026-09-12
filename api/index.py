"""Vercel serverless entrypoint exposing the existing FastAPI application.

The backend package is not vendored here. This module only puts `backend/`
on the import path so the deployed function runs exactly the same
composition root, routes, and domain code as local development.
"""

import os
import sys

BACKEND_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.main import app as app  # noqa: E402  (path setup must precede import)
