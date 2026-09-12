/**
 * Fictional demo input. Route names and terms are invented for demonstration
 * and are not current prices from any real payment provider.
 */
export const DEMO_CASE = Object.freeze({
  invoiceAmount: '1000.00',
  invoiceCurrency: 'USD',
  clientCountry: 'United States',
  platformOrContext: 'Direct client invoice for a Pakistan-based freelancer',
  routes: [
    {
      quoteId: 'route-a',
      routeName: 'Crescent Direct (fictional)',
      pastedText: [
        'Fictional demonstration quote; this is not a current provider price.',
        'Available to Pakistan-based freelancers receiving USD from US direct clients.',
        'We deduct a 1% fee calculated on the original USD invoice, plus a fixed $10 withdrawal charge, from your payout.',
        'There are no other deductions.',
        'We convert the remaining USD at 275 PKR per USD.',
        'PKR receiving charge is 0.',
        'Settlement normally takes two business days.',
      ].join('\n'),
    },
    {
      quoteId: 'route-b',
      routeName: 'Indus Transfer (fictional)',
      pastedText: [
        'Fictional demonstration quote; this is not a current provider price.',
        'Available to Pakistan-based freelancers receiving USD from US direct clients.',
        'The recipient pays a $25 USD incoming charge and a $10 USD intermediary charge, both deducted from the invoice.',
        'There are no other deductions.',
        'The remaining USD converts at 278 PKR per USD.',
        'PKR receiving charge is 0.',
        'Settlement normally takes one business day.',
      ].join('\n'),
    },
  ],
})
