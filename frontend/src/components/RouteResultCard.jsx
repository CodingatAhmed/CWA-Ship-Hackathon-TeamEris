import EvidenceList from './EvidenceList.jsx'
import FeeBreakdown from './FeeBreakdown.jsx'
import TermIssues from './TermIssues.jsx'
import { formatFxRate, formatPkr, statusLabel } from '../lib/format.js'

const STATUS_ICONS = {
  ready: '✓',
  conditional: '!',
  insufficient_evidence: '?',
  ineligible: '×',
}

const NULL_NET_MESSAGES = {
  insufficient_evidence: 'Not enough evidence.',
  ineligible: 'Not calculated — the quoted terms exclude this context.',
}

function RouteResultCard({ route, isRecommended, invoiceCurrency }) {
  const netPkr = formatPkr(route.estimated_net_pkr)
  const fxRate = formatFxRate(route.fx_rate_pkr, invoiceCurrency)
  const statusIcon = STATUS_ICONS[route.status] ?? '•'

  return (
    <article className={`route-result status-${route.status}`} aria-labelledby={`${route.quote_id}-title`}>
      <header className="route-result-head">
        <div>
          <h3 id={`${route.quote_id}-title`}>{route.route_name}</h3>
          {isRecommended && <span className="recommended-tag">Best supported estimate</span>}
        </div>
        <span className={`status-badge status-badge-${route.status}`}>
          <span className="status-icon" aria-hidden="true">
            {statusIcon}
          </span>
          {statusLabel(route.status)}
        </span>
      </header>

      <div className="route-net">
        <span className="route-net-label">Estimated net PKR</span>
        {netPkr ? (
          <strong className="route-net-value">{netPkr}</strong>
        ) : (
          <strong className="route-net-value route-net-missing">
            {NULL_NET_MESSAGES[route.status] ?? 'No supported estimate.'}
          </strong>
        )}
        <span className="route-net-caption">
          {netPkr
            ? 'Calculated by the backend from verified quote terms.'
            : 'A missing, unsupported, or ineligible term prevented a safe estimate.'}
        </span>
      </div>

      <dl className="route-math-summary">
        <div>
          <dt>Quoted conversion rate</dt>
          <dd>{fxRate ?? 'Not supported by the quote'}</dd>
        </div>
        <div>
          <dt>Fee components</dt>
          <dd>{route.itemized_fees.length}</dd>
        </div>
      </dl>

      <section className="route-section">
        <h4>Itemized fee maths</h4>
        <FeeBreakdown fees={route.itemized_fees} />
      </section>

      <TermIssues
        missingTerms={route.missing_terms}
        unsupportedTerms={route.unsupported_terms}
        showInsufficientSummary={route.status === 'insufficient_evidence'}
      />

      {route.conditions.length > 0 && (
        <div className="route-conditions">
          <h4>
            <span className="condition-icon" aria-hidden="true">
              !
            </span>
            Conditions stated in this quote
          </h4>
          <ul>
            {route.conditions.map((condition, index) => (
              <li key={`${condition}-${index}`}>{condition}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="route-section">
        <div className="evidence-section-heading">
          <h4>Extracted terms and exact evidence</h4>
          <span>Verified against this pasted quote</span>
        </div>
        <EvidenceList terms={route.extracted_terms} routeName={route.route_name} />
      </section>
    </article>
  )
}

export default RouteResultCard
