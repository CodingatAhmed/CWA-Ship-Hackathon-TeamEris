import { termLabel } from '../lib/format.js'

function IssueList({ issues }) {
  return (
    <ul className="term-issues__list">
      {issues.map((issue, index) => (
        <li className="term-issues__item" key={`${issue.name}-${index}`}>
          <div className="term-issues__detail">
            <strong>{termLabel(issue.name)}</strong>
            <p>{issue.reason}</p>
          </div>
          <span
            className={
              issue.affects_calculation
                ? 'term-issues__impact term-issues__impact--blocking'
                : 'term-issues__impact term-issues__impact--nonblocking'
            }
          >
            {issue.affects_calculation
              ? 'Blocks this estimate'
              : 'Does not block this estimate'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TermIssues({
  missingTerms = [],
  unsupportedTerms = [],
  showInsufficientSummary = false,
}) {
  const missing = Array.isArray(missingTerms) ? missingTerms : []
  const unsupported = Array.isArray(unsupportedTerms) ? unsupportedTerms : []
  const missingNames = missing.map((term) => termLabel(term.name)).join(', ')

  return (
    <section className="term-issues" aria-label="Term issues">
      {showInsufficientSummary && missing.length > 0 && (
        <p className="term-issues__insufficient-summary">
          We could not compare this route because the pasted quote does not state:{' '}
          {missingNames}.
        </p>
      )}

      {showInsufficientSummary && missing.length === 0 && unsupported.length > 0 && (
        <p className="term-issues__insufficient-summary">
          We could not safely compare this route because one or more quoted terms were unsupported
          or conflicting.
        </p>
      )}

      {missing.length > 0 && (
        <section className="term-issues__group term-issues__group--missing">
          <h4>Missing terms</h4>
          <IssueList issues={missing} />
        </section>
      )}

      {unsupported.length > 0 && (
        <section className="term-issues__group term-issues__group--unsupported">
          <h4>Unsupported or conflicting terms</h4>
          <IssueList issues={unsupported} />
        </section>
      )}

      {missing.length === 0 && unsupported.length === 0 && (
        <p className="term-issues__empty">No missing or unsupported terms were reported.</p>
      )}
    </section>
  )
}

export default TermIssues
