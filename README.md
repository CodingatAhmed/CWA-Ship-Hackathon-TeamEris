# PayoutPath PK

PayoutPath PK is being built to help Pakistani freelancers compare payout routes from messy, user-provided quote text. This repository is currently at the **setup milestone**: the application shell, API contracts, and architectural boundaries exist, but comparison does not work yet.

A real AI API is a mandatory product dependency. It will extract payment terms from unfamiliar pasted text in the next implementation phase. There is no demo extractor, keyword fallback, or fabricated comparison output in this milestone.

## What works now

- `GET /health` returns a live FastAPI health response.
- `POST /api/compare` validates the planned request contract and then deliberately returns `501 Not Implemented`.
- FastAPI publishes the planned comparison request and response schemas in `/docs` and `/openapi.json`.
- The React/Vite frontend builds and presents an honest description of the planned inputs, outputs, and current status.
- The application layer defines a provider-neutral `QuoteExtractor` protocol; provider SDK code is reserved for `adapters/ai/`.

## Repository layout

```text
.
|-- backend/
|   |-- app/
|   |   |-- api/                  # HTTP routes and Pydantic transport schemas
|   |   |-- application/          # Use cases and inbound/outbound ports
|   |   |-- domain/               # Payment, fee, evidence, and ranking concepts
|   |   |-- adapters/
|   |   |   |-- ai/               # Future real AI QuoteExtractor implementation
|   |   |   `-- official_sources/ # Future current-source catalog adapter
|   |   |-- config.py             # Environment-backed configuration
|   |   `-- main.py               # FastAPI construction and dependency wiring
|   |-- tests/
|   |-- .env.example
|   `-- pyproject.toml
|-- frontend/
|   |-- src/
|   |   |-- api/                  # Backend HTTP client
|   |   |-- components/           # Reusable presentation components
|   |   |-- pages/                # Page composition
|   |   `-- styles/               # Global and page styling
|   |-- .env.example
|   `-- package.json
`-- web/                           # Pre-existing Vite scaffold, preserved unchanged
```

The backend is one deployable modular monolith with ports and adapters. `domain/` contains provider-free business concepts. `application/` coordinates use cases and owns the `QuoteExtractor` port. `api/` translates HTTP data through Pydantic contracts. `adapters/` will contain integrations with the selected real AI provider and current official sources. `main.py` is the composition root; integrations are wired there rather than imported into the domain.

## API contract

### Health

```http
GET /health
```

```json
{
  "status": "ok",
  "service": "payoutpath-pk-api"
}
```

### Planned comparison

```http
POST /api/compare
Content-Type: application/json
```

The request accepts an invoice amount and three-letter currency, client country, platform or payment context, and at least two independently identified pasted route quotes:

```json
{
  "invoice_amount": "1000.00",
  "invoice_currency": "USD",
  "client_country": "United States",
  "platform_or_context": "Direct client invoice",
  "route_quotes": [
    {
      "quote_id": "route-a",
      "route_name": "Provider A",
      "pasted_text": "Messy quote text supplied by the user..."
    },
    {
      "quote_id": "route-b",
      "route_name": "Provider B",
      "pasted_text": "A differently formatted quote supplied by the user..."
    }
  ]
}
```

The planned successful response supports, for each route, a status, extracted terms tied to evidence excerpts, missing terms, itemized fees, an estimated net amount in PKR, and conditions. It also supports a conditional recommendation and a mandatory verification notice. The precise machine-readable schema is available through FastAPI's OpenAPI page at `http://127.0.0.1:8000/docs`.

For now, every valid comparison request receives:

```json
{
  "detail": "Comparison is not implemented in the setup milestone."
}
```

with HTTP status `501`. Invalid requests can receive `422` before the handler, which confirms the future input contract is enforced.

## Regulatory product rule

Any tax or regulatory information shown by PayoutPath PK must tell users to verify it with a qualified professional and current official sources. The planned `CompareResponse.verification_notice` contract makes this notice mandatory and includes the exact statement:

> Verify any tax or regulatory information with a qualified professional and current official sources.

This setup contains no tax calculator and makes no claim about a repatriation threshold.

## Configuration

Copy the example files without committing the resulting `.env` files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

`backend/.env.example` reserves `AI_PROVIDER`, `AI_MODEL`, and `AI_API_KEY` for the required real AI adapter. The backend must remain healthy when these are unset during this setup milestone; the later extraction use case will fail clearly if its required provider configuration is missing.

During local development the frontend can call relative `/health` and `/api` paths through Vite's proxy. `VITE_API_PROXY_TARGET` selects the backend target. A deployed frontend can instead set `VITE_API_BASE_URL` to an absolute backend URL; allowed browser origins are configured with backend `FRONTEND_ORIGINS`.

## Run the backend

Python 3.11 or newer is required.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

Then verify it in another shell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
python -m pytest
```

## Run the frontend

Node.js 20.19+ or 22.12+ is recommended by the selected Vite release.

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. For a production build check:

```powershell
npm run build
```

## Next implementation sequence

1. Build and test the Decimal-based fee engine.
2. Implement the **real AI quote extractor** using an API key from environment variables, structured output, evidence excerpts, and schema validation.
3. Add evidence and eligibility checks, then the comparison use case.
4. Connect the React input and results screens.
5. Test unfamiliar pasted quotes end to end and prepare the three-minute demo.

The exact next module is `backend/app/domain/fees.py`: implement its Decimal-based `FeeEngine` behavior with unit tests before adding any AI or comparison orchestration.

