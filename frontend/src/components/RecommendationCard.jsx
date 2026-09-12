import { formatPkr, statusLabel } from '../lib/format.js'

function RouteSnapshot({ route, isWinner }) {
  const netPkr = formatPkr(route.estimated_net_pkr)

  return (
    <li className={isWinner ? 'decision-route decision-route-winner' : 'decision-route'}>
      <div>
        <span className="decision-route-name">{route.route_name}</span>
        <span className="decision-route-status">{statusLabel(route.status)}</span>
      </div>
      <strong>{netPkr ?? 'No supported net'}</strong>
    </li>
  )
}

function RecommendationCard({ recommendation, recommendationReason, routes }) {
  if (!recommendation) {
    return (
      <section
        className="recommendation recommendation-none"
        aria-labelledby="recommendation-title"
      >
        <p className="eyebrow">Comparison result</p>
        <h2 id="recommendation-title">No safe winner can be determined.</h2>
        <p className="recommendation-body">{recommendationReason}</p>
        <p className="decision-safety-note">
          No route is promoted when the evidence produces a tie or fewer than two comparable
          estimates.
        </p>

        <ul className="decision-routes" aria-label="Route estimate summary">
          {routes.map((route) => (
            <RouteSnapshot key={route.quote_id} route={route} isWinner={false} />
          ))}
        </ul>
      </section>
    )
  }

  const winner = routes.find((route) => route.quote_id === recommendation.quote_id)
  const netPkr = winner ? formatPkr(winner.estimated_net_pkr) : null

  return (
    <section className="recommendation" aria-labelledby="recommendation-title">
      <p className="eyebrow">Comparison result</p>
      <h2 id="recommendation-title">Best estimated net amount from the evidence provided.</h2>

      <div className="recommendation-figure">
        <span className="recommendation-route">{winner?.route_name ?? recommendation.quote_id}</span>
        {netPkr ? (
          <span className="recommendation-amount">{netPkr}</span>
        ) : (
          <span className="recommendation-amount muted-amount">Estimated net not available</span>
        )}
        <span className="recommendation-caption">
          Estimated from the supplied quote only — not a guaranteed received amount.
        </span>
      </div>

      <p className="recommendation-body">
        The deterministic ranking policy compared only routes with supported net estimates.{' '}
        {recommendation.summary}
      </p>

      {recommendation.conditions.length > 0 && (
        <div className="recommendation-conditions">
          <h3>This result has stated conditions</h3>
          <ul>
            {recommendation.conditions.map((condition, index) => (
              <li key={`${condition}-${index}`}>{condition}</li>
            ))}
          </ul>
        </div>
      )}

      <ul className="decision-routes" aria-label="Route estimate summary">
        {routes.map((route) => (
          <RouteSnapshot
            key={route.quote_id}
            route={route}
            isWinner={route.quote_id === recommendation.quote_id}
          />
        ))}
      </ul>
    </section>
  )
}

export default RecommendationCard
