const WORKFLOW_STEPS = [
  {
    title: 'AI extracts stated terms',
    description:
      'The server sends each pasted quote to one AI extractor, which returns only terms supported by that quote.',
  },
  {
    title: 'Server verifies same-quote evidence',
    description:
      'Every supporting excerpt is checked verbatim against the quote it came from before a value can be used.',
  },
  {
    title: 'Python Decimal calculates',
    description:
      'Deterministic Python code applies supported fees and rates to estimate the net amount in PKR.',
  },
  {
    title: 'Deterministic policy ranks supported routes',
    description:
      'Only comparable, evidence-backed estimates can produce a conditional recommendation; otherwise no winner is asserted.',
  },
]

function WorkflowExplainer() {
  return (
    <section className="workflow-explainer" aria-labelledby="workflow-explainer-title">
      <div className="workflow-explainer__header">
        <h2 id="workflow-explainer-title">How the comparison works</h2>
        <p>
          One request runs this backend workflow. These are system responsibilities,
          not separate AI agents or live progress updates.
        </p>
      </div>

      <ol className="workflow-explainer__steps">
        {WORKFLOW_STEPS.map((step) => (
          <li className="workflow-explainer__step" key={step.title}>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default WorkflowExplainer
