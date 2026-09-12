import FieldError from './FieldError.jsx'
import { MAX_QUOTE_LENGTH } from '../lib/comparison.js'

function RouteQuoteEditor({ index, route, errors, disabled, onChange }) {
  const nameId = `${route.quoteId}-name`
  const textId = `${route.quoteId}-text`
  const label = index === 0 ? 'Route A' : 'Route B'

  return (
    <fieldset className="route-editor">
      <legend>
        <span className="route-tag">{label}</span>
      </legend>

      <div className="field">
        <label htmlFor={nameId}>Route name</label>
        <input
          id={nameId}
          name={nameId}
          type="text"
          maxLength={120}
          autoComplete="off"
          placeholder="Provider or payout method"
          value={route.routeName}
          disabled={disabled}
          aria-invalid={Boolean(errors.routeName)}
          aria-describedby={errors.routeName ? `${nameId}-error` : undefined}
          onChange={(event) => onChange(index, 'routeName', event.target.value)}
        />
        <FieldError id={`${nameId}-error`} message={errors.routeName} />
      </div>

      <div className="field">
        <label htmlFor={textId}>Pasted quote text</label>
        <textarea
          id={textId}
          name={textId}
          rows={10}
          maxLength={MAX_QUOTE_LENGTH}
          placeholder="Paste the fee and rate wording exactly as the provider gave it."
          value={route.pastedText}
          disabled={disabled}
          aria-invalid={Boolean(errors.pastedText)}
          aria-describedby={
            errors.pastedText ? `${textId}-error privacy-hint` : 'privacy-hint'
          }
          onChange={(event) => onChange(index, 'pastedText', event.target.value)}
        />
        <div className="field-foot">
          <FieldError id={`${textId}-error`} message={errors.pastedText} />
          <span className="char-count">
            {route.pastedText.length.toLocaleString('en-PK')} / {MAX_QUOTE_LENGTH.toLocaleString('en-PK')}
          </span>
        </div>
      </div>
    </fieldset>
  )
}

export default RouteQuoteEditor
