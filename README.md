# PayoutPath PK

PayoutPath PK is an evidence-first payout-route comparator for Pakistani
freelancers. It accepts an invoice context and user-provided route quotes, uses one
real AI API to normalize the messy text, verifies exact same-quote excerpts, and
uses deterministic Python `Decimal` code to estimate net PKR.

The backend comparison pipeline is implemented. The React application is still the
setup screen and has not yet been connected to the comparison journey. A real AI
call also requires a backend API key; there is no hardcoded parser, production
fixture, or automatic fallback. Without valid AI configuration, comparison returns
a safe retryable `503` while `GET /health` remains available.

## Repository layout

```text
.
|-- backend/
|   |-- app/
|   |   |-- api/                  # HTTP validation and response mapping
|   |   |-- application/          # Comparison orchestration and QuoteExtractor port
|   |   |-- domain/               # Evidence, Decimal fee, and ranking rules
|   |   |-- adapters/
|   |   |   |-- ai/               # Selectable OpenAI/Groq structured-output adapters
|   |   |   `-- official_sources/ # Reserved current-source catalog adapter
|   |   |-- config.py             # Backend-only environment settings
|   |   `-- main.py               # FastAPI composition root
|   |-- tests/                    # Domain, adapter-boundary, use-case, and API tests
|   |-- .env.example
|   `-- pyproject.toml
|-- docs/
|   `-- CONTRACT.md               # Frozen frontend/backend JSON contract
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- pages/
|   |   `-- styles/
|   |-- .env.example
|   `-- package.json
`-- README.md
```

The backend is one modular monolith. Provider SDK or HTTP behavior stays in
`adapters/`; the application layer depends only on the `QuoteExtractor` protocol;
the domain imports neither FastAPI nor provider code. `main.py` wires exactly one
selected AI adapter, the Decimal fee engine, ranking policy, and comparison use
case.

## Backend behavior

`POST /api/compare` performs this sequence:

1. Pydantic validates invoice context and at least two distinct route quotes.
2. The configured OpenAI or Groq Responses API adapter extracts typed terms from
   each quote using strict JSON Schema output.
3. The backend verifies every candidate excerpt verbatim against the same input
   quote and recomputes its character offsets.
4. Unsupported, contradictory, cross-quote, or invented evidence is refused.
5. `DecimalFeeEngine` calculates only the supported subset and itemizes every fee.
6. `RankingPolicy` compares only supported `ready` or `conditional` estimates.
7. The response includes assumptions, missing facts, conditions, and the mandatory
   verification notice.

AI is load-bearing for extraction and normalization. It does not perform
arithmetic, invent missing rates or fees, choose a winner, infer provider
reputation, or decide regulatory obligations.

### Supported calculation subset

- Freelancer- or sender-paid fixed fees in the invoice currency.
- Dimensionless percentage fees explicitly based on the original invoice amount;
  the calculated fee is denominated in the invoice currency.
- Other fees with explicit payer and invoice currency.
- An explicit rate stated as PKR per one unit of invoice currency.
- Explicit PKR receiving fees after conversion.
- Evidence-backed eligibility conditions and display-only settlement wording.

Every amount uses `Decimal`. Applied fees and final money use `ROUND_HALF_UP` to
`0.01`:

```text
percentage fee = original invoice amount * percentage / 100
convertible amount = invoice amount - supported freelancer-paid invoice fees
estimated net PKR = convertible amount * quoted PKR rate
                    - supported freelancer-paid PKR receiving fees
```

An unclear payer, missing currency/rate, remaining-balance percentage, intermediate
currency, contradiction, invalid excerpt, or impossible negative result produces
`estimated_net_pkr: null`. A sender-paid fee is displayed but not subtracted.

Statuses are:

- `ready`: required terms and explicit eligibility are supported.
- `conditional`: a net is calculable but an evidenced condition remains.
- `insufficient_evidence`: a safe net cannot be calculated.
- `ineligible`: the quote explicitly excludes the supplied context.

A winner is returned only when at least two routes have supported estimates. An
exact tie, one supported route, or no supported routes returns no recommendation
and explains why.

## API contract

The complete request, successful response, `422`, `503`, tie, and no-recommendation
representations are documented in [`docs/CONTRACT.md`](docs/CONTRACT.md). FastAPI
also publishes live schemas at `http://127.0.0.1:8000/docs`.

Health response:

```http
GET /health
```

```json
{"status":"ok","service":"payoutpath-pk-api"}
```

Comparison request keys remain:

```json
{
  "invoice_amount": "1000.00",
  "invoice_currency": "USD",
  "client_country": "United States",
  "platform_or_context": "Direct client invoice",
  "route_quotes": [
    {
      "quote_id": "route-a",
      "route_name": "Route A",
      "pasted_text": "A fictional user-provided route quote."
    },
    {
      "quote_id": "route-b",
      "route_name": "Route B",
      "pasted_text": "A different fictional route quote."
    }
  ]
}
```

## Configuration

Copy the backend example and set a real application API credential:

```powershell
Copy-Item backend/.env.example backend/.env
```

For GroqCloud Free-plan use, put these exact settings in `backend/.env`:

```dotenv
APP_ENV=development
FRONTEND_ORIGINS=http://localhost:5173
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
AI_API_KEY=<Groq key stored privately in backend/.env>
AI_TIMEOUT_SECONDS=30
```

For OpenAI, keep the same variable names but set `AI_PROVIDER=openai`, an OpenAI
model ID, and an OpenAI application API key. A Groq-served `openai/gpt-oss-20b`
request always uses the Groq endpoint and Groq key; it does not use OpenAI API
billing.

The key must stay in `backend/.env` or the deployment's server-side secret store.
Never place it in a `VITE_` variable, commit it, or log it. Both adapters use a
bounded timeout, validate structured output with Pydantic, and never log quote
bodies, prompts, or full provider responses. The OpenAI adapter sets `store:
false`; the Groq adapter omits `store` because Groq does not support that request
field. See the official [Groq Responses API](https://console.groq.com/docs/responses-api),
[structured-output support](https://console.groq.com/docs/structured-outputs), and
[Free-plan rate limits](https://console.groq.com/docs/rate-limits).

Groq's generation schema inlines nullable enum references inside `anyOf` to match
its schema validator. Returned JSON still undergoes the unchanged strict Pydantic
validation and independent same-quote evidence checks.

The Groq adapter makes one request per quote, uses low reasoning effort, and caps
each structured response at 1,600 output tokens. This leaves room within the
currently documented 8,000-token-per-minute Free-plan limit for a short two-quote
demo. If Groq returns an incomplete response or `429`, comparison fails visibly
with a retryable `503`; partial extraction never enters calculation.

The frontend uses relative `/health` and `/api` paths through the Vite development
proxy. `VITE_API_PROXY_TARGET` selects the local backend. A deployed frontend can
use `VITE_API_BASE_URL`; backend `FRONTEND_ORIGINS` must contain only the exact
allowed origins.

## Run and test the backend

Python 3.11 or newer is required.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m pytest -q
python -m uvicorn app.main:app --reload --port 8000
```

Verify health from another shell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Tests use an injected deterministic extractor to isolate domain and API behavior.
That fake exists only under `backend/tests/` and is never used by production
composition. Adapter tests use an in-memory HTTP transport and make no paid calls.

Live smoke tests are deliberately opt-in. After selecting the matching provider
and storing its real key in `backend/.env`, run only that provider's test:

```powershell
$env:RUN_LIVE_AI_TEST = "1"
python -m pytest -q tests/test_live_groq.py
# Or, when AI_PROVIDER=openai:
python -m pytest -q tests/test_live_openai.py
```

The Groq smoke test performs an end-to-end `POST /api/compare` with two unfamiliar
fictional quotes, checks exact excerpts, and confirms a missing rate remains
missing. Live tests are skipped during the ordinary suite, and no synthetic
extraction fallback is used when configuration or a provider fails.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Production checks:

```powershell
npm run lint
npm run build
```

## Privacy and regulatory product rule

Remove account numbers, identity documents, and confidential client details before
pasting. Quotes are processed for the request and are not intentionally persisted.

PayoutPath PK does not include a tax calculator and does not assert a repatriation
threshold. Every successful response includes:

> Verify any tax or regulatory information with a qualified professional and
> current official sources.

## Remaining release sequence

1. Select OpenAI or Groq in `backend/.env`, add that provider's application API
   key, and record a live integration check on two previously unseen fictional
   quotes, confirming every returned excerpt matches exactly.
2. Connect the React input, loading, results, evidence, missing-data, and retry
   screens to the frozen API contract.
3. Run backend tests plus frontend lint/build and exercise validation, missing FX,
   tie, ineligible, provider failure, and narrow-screen paths.
4. Configure exact production CORS and backend-only secrets, then deploy both
   services.
5. Run the three-minute demo twice from the public URL and freeze the submission.
