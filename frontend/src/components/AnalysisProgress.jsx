const STAGES = [
  ['AI extraction', 'Reading only the terms stated in each route quote'],
  ['Evidence verification', 'Checking excerpts against the same pasted quote'],
  ['Decimal fee maths', 'Calculating supported fees and estimated net PKR'],
  ['Conditional ranking', 'Comparing only routes with supported estimates'],
]

/**
 * A looping indicator only. No stage is ever marked complete, because the
 * frontend cannot know what the server has finished until it responds.
 */
function AnalysisProgress({ routeCount }) {
  return (
    <section className="analysis-panel" aria-live="polite" aria-busy="true">
      <div className="analysis-head">
        <span className="analysis-spinner" aria-hidden="true" />
        <div>
          <h2>Comparing {routeCount} routes</h2>
          <p>
            One live request is processing both quotes. Provider response time can vary.
          </p>
        </div>
      </div>

      <ul className="analysis-stages">
        {STAGES.map(([stage, detail]) => (
          <li key={stage}>
            <span className="stage-pulse" aria-hidden="true" />
            <span>
              <strong>{stage}</strong>
              <small>{detail}</small>
            </span>
          </li>
        ))}
      </ul>

      <p className="analysis-note">
        These are the requested workflow phases, not live completion markers. No phase is shown
        as finished until the API returns the complete evidence-backed result.
      </p>
    </section>
  )
}

export default AnalysisProgress
