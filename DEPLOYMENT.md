# Deploying to Vercel

This branch deploys the whole system to **one Vercel project and one origin**:
the built React frontend is served as static files, and the existing FastAPI
backend runs as a Python serverless function at `/api/*`.

Because both halves share an origin, the browser calls `/api/compare` as a
relative path and **no CORS configuration is required**.

## What is in this branch

| Path | Purpose |
| --- | --- |
| `vercel.json` | Build, output directory, function limits, and routing |
| `api/index.py` | Serverless entrypoint; imports the real app from `backend/` |
| `requirements.txt` | Python runtime dependencies for that function |
| `.vercelignore` | Keeps tests and local artifacts out of the deployment |

`api/index.py` does not copy any backend code. It only puts `backend/` on the
import path, so the deployed function runs the same composition root, routes,
and domain logic as local development.

## Import the project

1. In Vercel, **Add New → Project** and import this repository.
2. Select the **`deploy-vercel`** branch.
3. Leave the framework preset as **Other**. `vercel.json` already defines the
   build command (`npm --prefix frontend run build`) and the output directory
   (`frontend/dist`).

## Required environment variables

Set these in **Project → Settings → Environment Variables**. The backend reads
them through `pydantic-settings`, which prefers real environment variables over
the local `backend/.env` file, so nothing else needs to change.

| Variable | Value | Notes |
| --- | --- | --- |
| `AI_PROVIDER` | `groq` | `groq` or `openai`; anything else fails every comparison |
| `AI_MODEL` | `openai/gpt-oss-20b` | Must match the selected provider |
| `AI_API_KEY` | *your key* | Mark as **Secret**; never commit it |
| `AI_TIMEOUT_SECONDS` | `20` | See the timeout note below |

`FRONTEND_ORIGINS` is not needed for this single-origin deployment.

If `AI_API_KEY` is missing, the deployment still builds and `/health` still
returns 200 — only comparison fails, and the UI reports it as a configuration
problem with no misleading retry button.

## The one real constraint: function duration

Quote extraction runs **sequentially**, one call per pasted quote. With two
quotes the worst case is `2 × AI_TIMEOUT_SECONDS` plus provider latency.

`vercel.json` sets `maxDuration: 60`, which is the ceiling on Vercel's Hobby
plan (Pro allows up to 300). Keeping `AI_TIMEOUT_SECONDS=20` leaves the worst
case near 40s, comfortably inside that ceiling.

If the function does hit the limit, Vercel returns 504 and the frontend already
presents it as a retryable timeout rather than a broken screen.

## Verifying a deployment

```bash
curl https://<your-deployment>/health
# {"status":"ok","service":"payoutpath-pk-api"}
```

Then open the site, choose **Load fictional demo**, and run a comparison. A
successful run shows a recommendation, per-route status, itemized fees with
payer and deduction semantics, and verbatim evidence from each pasted quote.

## Local development is unchanged

Vercel config does not affect local work. The Vite dev server still proxies
`/api` and `/health` to `http://127.0.0.1:8000`:

```bash
# terminal 1
cd backend && uvicorn app.main:app --reload

# terminal 2
cd frontend && npm run dev
```
