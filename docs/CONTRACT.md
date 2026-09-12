# PayoutPath PK API contract

This contract is the frontend/backend integration boundary. Monetary amounts cross
JSON as decimal strings. A successful comparison is derived from the user's pasted
quotes; it is not a live price or a guaranteed payout.

## Request

`POST /api/compare`

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
      "pasted_text": "Available to Pakistan-based freelancers for direct USD invoices. We deduct a fixed USD 10 withdrawal charge. There are no other deductions. 275 PKR per USD"
    },
    {
      "quote_id": "route-b",
      "route_name": "Route B",
      "pasted_text": "Subject to account approval. The recipient pays a USD 25 incoming charge. There are no other deductions. 278 PKR per USD"
    }
  ]
}
```

The amount must be a positive decimal string with at most two fractional digits.
Currency is a three-letter code. At least two nonempty quotes with distinct IDs are
required.

## Representative `200` response

```json
{
  "routes": [
    {
      "quote_id": "route-a",
      "route_name": "Route A",
      "status": "ready",
      "extracted_terms": [
        {
          "name": "eligibility_condition",
          "value": "Available for the supplied context",
          "label": null,
          "currency": null,
          "payer": null,
          "percentage_base": null,
          "condition": null,
          "state": "explicit",
          "eligibility_effect": "eligible",
          "evidence": [
            {
              "quote_id": "route-a",
              "excerpt": "Available to Pakistan-based freelancers for direct USD invoices.",
              "source_url": null,
              "start_char": 0,
              "end_char": 64
            }
          ]
        },
        {
          "name": "fixed_fee",
          "value": "10",
          "label": "Withdrawal charge",
          "currency": "USD",
          "payer": "freelancer",
          "percentage_base": null,
          "condition": null,
          "state": "explicit",
          "eligibility_effect": null,
          "evidence": [
            {
              "quote_id": "route-a",
              "excerpt": "We deduct a fixed USD 10 withdrawal charge.",
              "source_url": null,
              "start_char": 65,
              "end_char": 108
            }
          ]
        },
        {
          "name": "fx_rate_pkr",
          "value": "275",
          "label": null,
          "currency": "USD",
          "payer": null,
          "percentage_base": null,
          "condition": null,
          "state": "explicit",
          "eligibility_effect": null,
          "evidence": [
            {
              "quote_id": "route-a",
              "excerpt": "275 PKR per USD",
              "source_url": null,
              "start_char": 140,
              "end_char": 155
            }
          ]
        }
      ],
      "missing_terms": [],
      "unsupported_terms": [],
      "itemized_fees": [
        {
          "label": "Withdrawal charge",
          "amount": "10.00",
          "currency": "USD",
          "payer": "freelancer",
          "is_deduction": true,
          "evidence": [
            {
              "quote_id": "route-a",
              "excerpt": "We deduct a fixed USD 10 withdrawal charge.",
              "source_url": null,
              "start_char": 65,
              "end_char": 108
            }
          ],
          "calculation_note": "Deducted from freelancer proceeds."
        }
      ],
      "fx_rate_pkr": "275",
      "estimated_net_pkr": "272250.00",
      "conditions": []
    },
    {
      "quote_id": "route-b",
      "route_name": "Route B",
      "status": "conditional",
      "extracted_terms": [
        {
          "name": "eligibility_condition",
          "value": "Account approval is required",
          "label": null,
          "currency": null,
          "payer": null,
          "percentage_base": null,
          "condition": "Subject to account approval",
          "state": "conditional",
          "eligibility_effect": "conditional",
          "evidence": [
            {
              "quote_id": "route-b",
              "excerpt": "Subject to account approval.",
              "source_url": null,
              "start_char": 0,
              "end_char": 28
            }
          ]
        },
        {
          "name": "fixed_fee",
          "value": "25",
          "label": "Incoming charge",
          "currency": "USD",
          "payer": "freelancer",
          "percentage_base": null,
          "condition": null,
          "state": "explicit",
          "eligibility_effect": null,
          "evidence": [
            {
              "quote_id": "route-b",
              "excerpt": "The recipient pays a USD 25 incoming charge.",
              "source_url": null,
              "start_char": 29,
              "end_char": 73
            }
          ]
        },
        {
          "name": "fx_rate_pkr",
          "value": "278",
          "label": null,
          "currency": "USD",
          "payer": null,
          "percentage_base": null,
          "condition": null,
          "state": "explicit",
          "eligibility_effect": null,
          "evidence": [
            {
              "quote_id": "route-b",
              "excerpt": "278 PKR per USD",
              "source_url": null,
              "start_char": 105,
              "end_char": 120
            }
          ]
        }
      ],
      "missing_terms": [],
      "unsupported_terms": [],
      "itemized_fees": [
        {
          "label": "Incoming charge",
          "amount": "25.00",
          "currency": "USD",
          "payer": "freelancer",
          "is_deduction": true,
          "evidence": [
            {
              "quote_id": "route-b",
              "excerpt": "The recipient pays a USD 25 incoming charge.",
              "source_url": null,
              "start_char": 29,
              "end_char": 73
            }
          ],
          "calculation_note": "Deducted from freelancer proceeds."
        }
      ],
      "fx_rate_pkr": "278",
      "estimated_net_pkr": "271050.00",
      "conditions": [
        "Subject to account approval"
      ]
    }
  ],
  "recommendation": {
    "quote_id": "route-a",
    "summary": "Best estimated net amount from the evidence provided. route-a has the highest supported estimate.",
    "conditions": []
  },
  "recommendation_reason": null,
  "calculation_assumptions": [
    "Estimates use only explicit terms from the pasted quotes that pass same-quote evidence validation.",
    "Money is calculated with Python Decimal and ROUND_HALF_UP to 0.01.",
    "A conversion rate is used only when stated as PKR per one unit of the invoice currency.",
    "No live provider rate, availability, tax, or regulatory fact is inferred."
  ],
  "verification_notice": {
    "tax_and_regulatory_guidance": "Verify any tax or regulatory information with a qualified professional and current official sources.",
    "official_source_urls": []
  }
}
```

Statuses are `ready`, `conditional`, `insufficient_evidence`, or `ineligible`.
An insufficient or ineligible route has `estimated_net_pkr: null`. A tie, a
single supported route, or no supported routes uses `recommendation: null` and a
human-readable `recommendation_reason`; no winner is invented.

## Validation `422`

FastAPI returns its normal validation envelope. For example, one quote produces:

```json
{
  "detail": [
    {
      "type": "too_short",
      "loc": ["body", "route_quotes"],
      "msg": "List should have at least 2 items after validation, not 1",
      "input": [],
      "ctx": {"field_type": "List", "min_length": 2, "actual_length": 1}
    }
  ]
}
```

Clients should use the response status and `detail`, not depend on a specific
Pydantic error sentence.

## AI service `503`

Missing configuration, timeout, provider failure, or invalid structured output
returns a safe retryable error and never comparison fixture data:

```json
{
  "detail": "AI extraction is temporarily unavailable. Please retry.",
  "retryable": true
}
```

Unexpected failures return `500` with a generic non-retryable body. Error bodies
never contain pasted quote text, provider response bodies, prompts, or secrets.
