import RecommendationCard from './RecommendationCard.jsx'
import RouteResultCard from './RouteResultCard.jsx'
import VerificationNotice from './VerificationNotice.jsx'

function ComparisonResults({ result, onEditInputs }) {
  const recommendedId = result.recommendation?.quote_id ?? null

  return (
    <section className="results" aria-labelledby="recommendation-title">
      <RecommendationCard recommendation={result.recommendation} routes={result.routes} />

      <div className="results-toolbar">
        <h2 className="results-heading">Route by route</h2>
        <button type="button" className="button-ghost" onClick={onEditInputs}>
          Edit inputs
        </button>
      </div>

      <div className="route-results">
        {result.routes.map((route) => (
          <RouteResultCard
            key={route.quote_id}
            route={route}
            isRecommended={route.quote_id === recommendedId}
          />
        ))}
      </div>

      <VerificationNotice notice={result.verification_notice} />
    </section>
  )
}

export default ComparisonResults
