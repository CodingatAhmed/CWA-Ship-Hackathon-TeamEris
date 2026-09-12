import FieldError from './FieldError.jsx'
import RouteQuoteEditor from './RouteQuoteEditor.jsx'

function ComparisonForm({
  form,
  errors,
  isSubmitting,
  serverFieldMessages,
  onFieldChange,
  onRouteChange,
  onSubmit,
  onLoadDemo,
  onClear,
  isDemo,
}) {
  const disabled = isSubmitting

  return (
    <form id="comparison-form" className="comparison-form" noValidate onSubmit={onSubmit}>
      <div className="form-block">
        <div className="form-block-head">
          <span className="block-number" aria-hidden="true">
            01
          </span>
          <div>
            <h2>Invoice context</h2>
            <p>Describe the overseas invoice this Pakistan-based freelancer needs to receive.</p>
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="invoice-amount">Invoice amount</label>
            <input
              id="invoice-amount"
              name="invoiceAmount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1000.00"
              value={form.invoiceAmount}
              disabled={disabled}
              aria-invalid={Boolean(errors.invoiceAmount)}
              aria-describedby={errors.invoiceAmount ? 'invoice-amount-error' : undefined}
              onChange={(event) => onFieldChange('invoiceAmount', event.target.value)}
            />
            <FieldError id="invoice-amount-error" message={errors.invoiceAmount} />
          </div>

          <div className="field">
            <label htmlFor="invoice-currency">Invoice currency</label>
            <input
              id="invoice-currency"
              name="invoiceCurrency"
              type="text"
              maxLength={3}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              placeholder="USD"
              className="uppercase-input"
              value={form.invoiceCurrency}
              disabled={disabled}
              aria-invalid={Boolean(errors.invoiceCurrency)}
              aria-describedby={errors.invoiceCurrency ? 'invoice-currency-error' : undefined}
              onChange={(event) =>
                onFieldChange('invoiceCurrency', event.target.value.toUpperCase())
              }
            />
            <FieldError id="invoice-currency-error" message={errors.invoiceCurrency} />
          </div>

          <div className="field">
            <label htmlFor="client-country">Client country</label>
            <input
              id="client-country"
              name="clientCountry"
              type="text"
              maxLength={100}
              autoComplete="off"
              placeholder="United States"
              value={form.clientCountry}
              disabled={disabled}
              aria-invalid={Boolean(errors.clientCountry)}
              aria-describedby={errors.clientCountry ? 'client-country-error' : undefined}
              onChange={(event) => onFieldChange('clientCountry', event.target.value)}
            />
            <FieldError id="client-country-error" message={errors.clientCountry} />
          </div>

          <div className="field field-wide">
            <label htmlFor="platform-context">Platform or payment context</label>
            <input
              id="platform-context"
              name="platformOrContext"
              type="text"
              maxLength={200}
              autoComplete="off"
              placeholder="Direct client invoice for a Pakistan-based freelancer"
              value={form.platformOrContext}
              disabled={disabled}
              aria-invalid={Boolean(errors.platformOrContext)}
              aria-describedby={errors.platformOrContext ? 'platform-context-error' : undefined}
              onChange={(event) => onFieldChange('platformOrContext', event.target.value)}
            />
            <FieldError id="platform-context-error" message={errors.platformOrContext} />
          </div>
        </div>
      </div>

      <div className="form-block">
        <div className="form-block-head">
          <span className="block-number" aria-hidden="true">
            02
          </span>
          <div>
            <h2>Two route quotes</h2>
            <p>Paste exactly two quotes verbatim so every extracted term keeps its source.</p>
          </div>
        </div>

        <p className="privacy-hint" id="privacy-hint">
          <span className="privacy-badge">Privacy</span>
          Remove account numbers, identity documents, and confidential client details before
          pasting.
        </p>

        {isDemo && (
          <p className="demo-loaded" role="status">
            Fictional demonstration loaded. Its route names, wording, fees, and rates are
            illustrative—not current provider prices.
          </p>
        )}

        <div className="route-grid">
          {form.routes.map((route, index) => (
            <RouteQuoteEditor
              key={route.quoteId}
              index={index}
              route={route}
              errors={errors.routes[index] ?? {}}
              disabled={disabled}
              onChange={onRouteChange}
            />
          ))}
        </div>
      </div>

      {serverFieldMessages.length > 0 && (
        <div className="server-field-errors" role="alert">
          <p>The comparison service rejected these inputs:</p>
          <ul>
            {serverFieldMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="button-primary" disabled={disabled}>
          {isSubmitting ? 'Comparing…' : 'Compare routes'}
        </button>
        <button
          type="button"
          className="button-ghost"
          disabled={disabled}
          onClick={onLoadDemo}
        >
          Load fictional demo
        </button>
        <button type="button" className="button-ghost" disabled={disabled} onClick={onClear}>
          Clear
        </button>
        <p className="demo-note">
          The demo is sent through the real backend and AI extractor; it is never a fixture result.
        </p>
      </div>
    </form>
  )
}

export default ComparisonForm
