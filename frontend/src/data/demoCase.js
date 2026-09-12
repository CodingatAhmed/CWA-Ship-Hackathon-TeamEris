/**
 * Fictional demo input. Route names and terms are invented for demonstration
 * and are not current prices from any real payment provider.
 */
export const DEMO_CASE = Object.freeze({
  invoiceAmount: '1850.00',
  invoiceCurrency: 'USD',
  clientCountry: 'United States',
  platformOrContext: 'Direct contract invoice paid by international bank transfer',
  routes: [
    {
      quoteId: 'route-a',
      routeName: 'Meridian Remit (fictional)',
      pastedText: [
        'Meridian Remit payout summary — illustrative example, not a real provider.',
        'A fixed transfer fee of USD 5.00 applies to every payout.',
        'A service charge of 1.75% of the invoice amount is deducted before conversion.',
        'Funds are converted to PKR at a quoted rate of 1 USD = 278.40 PKR.',
        'The receiving bank in Pakistan deducts PKR 250 per incoming transfer.',
        'Settlement usually completes within 2 to 3 working days.',
        'The quoted rate applies only if the payout is submitted on the same working day.',
      ].join('\n'),
    },
    {
      quoteId: 'route-b',
      routeName: 'Indus Gateway (fictional)',
      pastedText: [
        'Indus Gateway pricing note — illustrative example, not a real provider.',
        'We charge a flat 2.4% platform commission on the invoice value.',
        'There is no fixed per-transfer charge on this plan.',
        'Payouts to Pakistan are settled in PKR. The conversion rate is confirmed at',
        'payout time and is not quoted in advance in this document.',
        'Local partner banks may apply their own receiving charges.',
        'Typical settlement time is 1 working day.',
      ].join('\n'),
    },
  ],
})
