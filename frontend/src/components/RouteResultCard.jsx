import EvidenceList from './EvidenceList.jsx'
import FeeBreakdown from './FeeBreakdown.jsx'
import MissingTerms from './MissingTerms.jsx'
import { formatPkr, statusLabel } from '../lib/format.js'

const STATUS_ICONS = {
  ready: '✓',
  conditional: '!',
  insufficient_evidence: '?',
  ineligible: '×',
}

function RouteResultCard({ route, isRecommended }) {
  const netPkr = formatPkr(route.estimated_net_pkr)
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
          <strong className="route-net-value route-net-missing">Not enough evidence.</strong>
        )}
      </div>

      <section className="route-section">
        <h4>Itemized deductions</h4>
        <FeeBreakdown fees={route.itemized_fees} />
      </section>

      <MissingTerms missingTerms={route.missing_terms} />

      {route.conditions.length > 0 && (
        <div className="route-conditions">
          <h4>
            <span className="condition-icon" aria-hidden="true">
              !
            </span>
            Conditions stated in this quote
          </h4>
          <ul>
            {route.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="route-section">
        <h4>Extracted terms and evidence</h4>
        <EvidenceList terms={route.extracted_terms} />
      </section>
    </article>
  )
}

export default RouteResultCard
