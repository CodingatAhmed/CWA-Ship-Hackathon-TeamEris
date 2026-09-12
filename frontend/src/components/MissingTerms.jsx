import { termLabel } from '../lib/format.js'

function MissingTerms({ missingTerms }) {
  if (!missingTerms || missingTerms.length === 0) return null

  return (
    <div className="missing-terms">
      <h4>
        <span className="missing-icon" aria-hidden="true">
          ?
        </span>
        Missing terms
      </h4>
      <ul>
        {missingTerms.map((term) => (
          <li key={term.name}>
            <strong>{termLabel(term.name)}</strong>
            <span>{term.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MissingTerms
