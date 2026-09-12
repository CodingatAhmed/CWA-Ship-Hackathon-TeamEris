import { formatMoney } from '../lib/format.js'

function ComparisonContext({ context }) {
  if (!context) return null

  return (
    <section className="comparison-context" aria-labelledby="comparison-context-title">
      <div className="context-heading">
        <p className="eyebrow">Your supplied context</p>
        <h2 id="comparison-context-title">This result is specific to this invoice.</h2>
      </div>
      <dl className="context-list">
        <div>
          <dt>Invoice</dt>
          <dd>{formatMoney(context.invoiceAmount, context.invoiceCurrency)}</dd>
        </div>
        <div>
          <dt>Client country</dt>
          <dd>{context.clientCountry}</dd>
        </div>
        <div>
          <dt>Payment context</dt>
          <dd>{context.platformOrContext}</dd>
        </div>
      </dl>
    </section>
  )
}

export default ComparisonContext
