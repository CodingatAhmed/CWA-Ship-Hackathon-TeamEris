function AssumptionsPanel({ assumptions: suppliedAssumptions }) {
  const assumptions = Array.isArray(suppliedAssumptions)
    ? suppliedAssumptions.filter(
        (assumption) => typeof assumption === 'string' && assumption.trim().length > 0,
      )
    : []

  return (
    <section className="assumptions-panel" aria-labelledby="assumptions-panel-title">
      <h2 id="assumptions-panel-title">Calculation assumptions</h2>

      {assumptions.length > 0 ? (
        <ul className="assumptions-panel__list">
          {assumptions.map((assumption, index) => (
            <li key={`${assumption}-${index}`}>{assumption}</li>
          ))}
        </ul>
      ) : (
        <p className="assumptions-panel__empty">
          Calculation assumptions were not provided for this result.
        </p>
      )}
    </section>
  )
}

export default AssumptionsPanel
