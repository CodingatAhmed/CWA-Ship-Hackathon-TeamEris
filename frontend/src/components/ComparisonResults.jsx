import AssumptionsPanel from './AssumptionsPanel.jsx'
import ComparisonContext from './ComparisonContext.jsx'
import RecommendationCard from './RecommendationCard.jsx'
import RouteResultCard from './RouteResultCard.jsx'
import VerificationNotice from './VerificationNotice.jsx'
import WorkflowExplainer from './WorkflowExplainer.jsx'

function ComparisonResults({ result, submittedContext, isDemo, onEditInputs }) {
  const recommendedId = result.recommendation?.quote_id ?? null

  return (
    <section className="results" aria-labelledby="recommendation-title">
      {isDemo && (
        <p className="demo-result-banner">
          Fictional demonstration — route names, wording, fees, and rates are illustrative, not
          current provider prices.
        </p>
      )}

      <RecommendationCard
        recommendation={result.recommendation}
        recommendationReason={result.recommendation_reason}
        routes={result.routes}
      />

      <ComparisonContext context={submittedContext} />
      <WorkflowExplainer />

      <div className="results-toolbar">
        <div>
          <p className="eyebrow">Auditable detail</p>
          <h2 className="results-heading">Route by route</h2>
        </div>
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
            invoiceCurrency={submittedContext?.invoiceCurrency}
          />
        ))}
      </div>

      <AssumptionsPanel assumptions={result.calculation_assumptions} />
      <VerificationNotice notice={result.verification_notice} />
    </section>
  )
}

export default ComparisonResults
