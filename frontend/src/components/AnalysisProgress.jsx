const STAGES = [
  'Reading route terms',
  'Checking source evidence',
  'Calculating estimated net PKR',
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
          <p>Extraction is grounded in the exact text you pasted. This usually takes a few seconds.</p>
        </div>
      </div>

      <ul className="analysis-stages">
        {STAGES.map((stage) => (
          <li key={stage}>
            <span className="stage-pulse" aria-hidden="true" />
            {stage}
          </li>
        ))}
      </ul>

      <p className="analysis-note">
        No result is shown until the comparison service returns evidence-backed terms.
      </p>
    </section>
  )
}

export default AnalysisProgress
