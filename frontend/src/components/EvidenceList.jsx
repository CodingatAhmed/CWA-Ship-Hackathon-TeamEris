import { termLabel } from '../lib/format.js'

/** Evidence is always visible; it is never hidden behind a tooltip. */
function EvidenceList({ terms }) {
  if (!terms || terms.length === 0) {
    return (
      <p className="empty-note">No terms could be extracted with supporting evidence.</p>
    )
  }

  return (
    <ul className="evidence-list">
      {terms.map((term) => (
        <li key={`${term.name}-${term.value}`} className="evidence-item">
          <div className="evidence-head">
            <span className="evidence-term">{termLabel(term.name)}</span>
            <span className="evidence-value">{term.value}</span>
          </div>
          {term.evidence.map((excerpt, index) => (
            <blockquote key={`${excerpt.excerpt}-${index}`} className="evidence-quote">
              {excerpt.excerpt}
              <cite>
                From the quote you pasted for {excerpt.quote_id}
                {typeof excerpt.start_char === 'number' && typeof excerpt.end_char === 'number'
                  ? ` · characters ${excerpt.start_char}–${excerpt.end_char}`
                  : ''}
              </cite>
            </blockquote>
          ))}
        </li>
      ))}
    </ul>
  )
}

export default EvidenceList
