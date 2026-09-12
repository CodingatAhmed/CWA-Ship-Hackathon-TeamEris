/**
 * Local UI fixture that mirrors the frozen `CompareResponse` contract exactly.
 * It is disabled unless VITE_USE_MOCK_API is explicitly set to "true" and must
 * stay disabled for any release build. Values are fictional.
 */
export const MOCK_ENABLED = import.meta.env.VITE_USE_MOCK_API === 'true'

export const MOCK_COMPARE_RESPONSE = Object.freeze({
  routes: [
    {
      quote_id: 'route-a',
      route_name: 'Meridian Remit (fictional)',
      status: 'conditional',
      extracted_terms: [
        {
          name: 'fixed_fee',
          value: '5.00',
          evidence: [
            {
              quote_id: 'route-a',
              excerpt: 'A fixed transfer fee of USD 5.00 applies to every payout.',
              source_url: null,
              start_char: 82,
              end_char: 139,
            },
          ],
        },
        {
          name: 'percentage_fee',
          value: '1.75',
          evidence: [
            {
              quote_id: 'route-a',
              excerpt:
                'A service charge of 1.75% of the invoice amount is deducted before conversion.',
              source_url: null,
              start_char: 140,
              end_char: 217,
            },
          ],
        },
        {
          name: 'fx_rate_pkr',
          value: '278.40',
          evidence: [
            {
              quote_id: 'route-a',
              excerpt: 'a quoted rate of 1 USD = 278.40 PKR',
              source_url: null,
              start_char: 253,
              end_char: 288,
            },
          ],
        },
        {
          name: 'receiving_fee_pkr',
          value: '250.00',
          evidence: [
            {
              quote_id: 'route-a',
              excerpt: 'The receiving bank in Pakistan deducts PKR 250 per incoming transfer.',
              source_url: null,
              start_char: 290,
              end_char: 358,
            },
          ],
        },
        {
          name: 'settlement_time',
          value: '2 to 3 working days',
          evidence: [
            {
              quote_id: 'route-a',
              excerpt: 'Settlement usually completes within 2 to 3 working days.',
              source_url: null,
              start_char: 359,
              end_char: 414,
            },
          ],
        },
      ],
      missing_terms: [],
      itemized_fees: [
        {
          label: 'Fixed transfer fee',
          amount: '5.00',
          currency: 'USD',
          calculation_note: 'Stated fixed fee deducted from the invoice amount.',
        },
        {
          label: 'Service charge (1.75%)',
          amount: '32.38',
          currency: 'USD',
          calculation_note: '1850.00 × 1.75 / 100 = 32.375, rounded half up to 32.38.',
        },
        {
          label: 'Receiving bank fee',
          amount: '250.00',
          currency: 'PKR',
          calculation_note: 'Stated PKR receiving fee deducted after conversion.',
        },
      ],
      estimated_net_pkr: '504383.41',
      conditions: [
        'The quoted rate applies only if the payout is submitted on the same working day.',
      ],
    },
    {
      quote_id: 'route-b',
      route_name: 'Indus Gateway (fictional)',
      status: 'insufficient_evidence',
      extracted_terms: [
        {
          name: 'percentage_fee',
          value: '2.40',
          evidence: [
            {
              quote_id: 'route-b',
              excerpt: 'We charge a flat 2.4% platform commission on the invoice value.',
              source_url: null,
              start_char: 76,
              end_char: 138,
            },
          ],
        },
        {
          name: 'settlement_time',
          value: '1 working day',
          evidence: [
            {
              quote_id: 'route-b',
              excerpt: 'Typical settlement time is 1 working day.',
              source_url: null,
              start_char: 392,
              end_char: 432,
            },
          ],
        },
      ],
      missing_terms: [
        {
          name: 'fx_rate_pkr',
          reason:
            'The quote states the rate is confirmed at payout time and does not give a PKR conversion rate.',
        },
        {
          name: 'receiving_fee_pkr',
          reason:
            'Local partner receiving charges are mentioned but no amount is stated in the quote.',
        },
      ],
      itemized_fees: [
        {
          label: 'Platform commission (2.4%)',
          amount: '44.40',
          currency: 'USD',
          calculation_note: '1850.00 × 2.4 / 100 = 44.40.',
        },
      ],
      estimated_net_pkr: null,
      conditions: ['Local partner banks may apply their own receiving charges.'],
    },
  ],
  recommendation: {
    quote_id: 'route-a',
    summary:
      'Best estimated net amount from the evidence provided: Meridian Remit (fictional) at an estimated PKR 504,383.41.',
    conditions: [
      'The quoted rate applies only if the payout is submitted on the same working day.',
      'Indus Gateway (fictional) could not be compared because no PKR conversion rate was stated.',
    ],
  },
  verification_notice: {
    tax_and_regulatory_guidance:
      'Verify any tax or regulatory information with a qualified professional and current official sources.',
    official_source_urls: [],
  },
})
