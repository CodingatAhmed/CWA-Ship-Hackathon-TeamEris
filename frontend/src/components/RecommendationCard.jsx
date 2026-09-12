import { formatPkr } from '../lib/format.js'

function RecommendationCard({ recommendation, routes }) {
  if (!recommendation) {
    return (
      <section className="recommendation recommendation-none" aria-labelledby="recommendation-title">
        <p className="eyebrow">Result</p>
        <h2 id="recommendation-title">No safe winner can be determined.</h2>
        <p className="recommendation-body">
          None of the routes had enough supported evidence to produce a comparable estimated net
          amount, so no route is recommended. Review the missing terms below, then ask each
          provider for the specific figures and compare again.
        </p>
      </section>
    )
  }

  const winner = routes.find((route) => route.quote_id === recommendation.quote_id)
  const netPkr = winner ? formatPkr(winner.estimated_net_pkr) : null

  return (
    <section className="recommendation" aria-labelledby="recommendation-title">
      <p className="eyebrow">Result</p>
      <h2 id="recommendation-title">Best estimated net amount from the evidence provided.</h2>

      <div className="recommendation-figure">
        <span className="recommendation-route">{winner?.route_name ?? recommendation.quote_id}</span>
        {netPkr ? (
          <span className="recommendation-amount">{netPkr}</span>
        ) : (
          <span className="recommendation-amount muted-amount">Estimated net not available</span>
        )}
        <span className="recommendation-caption">Estimated amount reaching you, before tax.</span>
      </div>

      <p className="recommendation-body">{recommendation.summary}</p>

      <div className="recommendation-conditions">
        <h3>This holds only if</h3>
        <ul>
          {recommendation.conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default RecommendationCard
