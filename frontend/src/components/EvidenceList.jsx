import { useId } from 'react'
import { formatTermValue, termLabel } from '../lib/format.js'

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function offsetLabel(evidence) {
  const hasStart = Number.isInteger(evidence?.start_char)
  const hasEnd = Number.isInteger(evidence?.end_char)

  if (hasStart && hasEnd) {
    return `characters ${evidence.start_char}–${evidence.end_char}`
  }
  if (hasStart) return `starts at character ${evidence.start_char}`
  if (hasEnd) return `ends at character ${evidence.end_char}`
  return null
}

function readableEnum(value) {
  if (!hasValue(value)) return value
  const words = String(value).replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function TermMetadata({ term }) {
  const metadata = [
    ['Label', term.label],
    ['Currency', term.currency],
    ['Payer', readableEnum(term.payer)],
    ['Percentage base', readableEnum(term.percentage_base)],
    ['Evidence state', readableEnum(term.state)],
    ['Eligibility effect', readableEnum(term.eligibility_effect)],
    ['Condition', term.condition],
  ].filter(([, value]) => hasValue(value))

  if (metadata.length === 0) return null

  return (
    <dl className="evidence-metadata">
      {metadata.map(([label, value]) => (
        <div className="evidence-metadata-item" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EvidenceExcerpt({ evidence, termKey, index }) {
  const sourceUrl = safeSourceUrl(evidence?.source_url)
  const location = offsetLabel(evidence)
  const quoteId = hasValue(evidence?.quote_id)
    ? String(evidence.quote_id)
    : 'unknown quote'

  return (
    <blockquote
      className="evidence-quote"
      key={`${termKey}-excerpt-${quoteId}-${evidence?.start_char ?? 'start'}-${evidence?.end_char ?? 'end'}-${index}`}
    >
      {hasValue(evidence?.excerpt) ? evidence.excerpt : 'Evidence excerpt unavailable.'}
      <cite>
        From the pasted quote {quoteId}
        {location ? ` · ${location}` : ''}
        {sourceUrl && (
          <>
            {' · '}
            <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
              View evidence source
            </a>
          </>
        )}
      </cite>
    </blockquote>
  )
}

/** Evidence is always visible; offsets are provenance metadata, never slicing instructions. */
function EvidenceList({ terms }) {
  const headingPrefix = useId()
  const extractedTerms = Array.isArray(terms) ? terms : []

  if (extractedTerms.length === 0) {
    return (
      <p className="empty-note">No terms could be extracted with supporting evidence.</p>
    )
  }

  return (
    <ul className="evidence-list">
      {extractedTerms.map((term, termIndex) => {
        const extractedTerm = term && typeof term === 'object' ? term : {}
        const termKey = `${extractedTerm.name ?? 'term'}-${extractedTerm.label ?? 'label'}-${extractedTerm.value ?? 'value'}-${termIndex}`
        const headingId = `${headingPrefix}-term-${termIndex}`
        const evidenceItems = Array.isArray(extractedTerm.evidence)
          ? extractedTerm.evidence
          : []

        return (
          <li key={termKey} className="evidence-item" aria-labelledby={headingId}>
            <div className="evidence-head">
              <h5 className="evidence-term" id={headingId}>
                {termLabel(extractedTerm.name)}
              </h5>
              {hasValue(extractedTerm.value) && (
                <span className="evidence-value">{formatTermValue(extractedTerm)}</span>
              )}
            </div>

            <TermMetadata term={extractedTerm} />

            {evidenceItems.length > 0 ? (
              evidenceItems.map((evidence, evidenceIndex) => (
                <EvidenceExcerpt
                  key={`${termKey}-evidence-entry-${evidenceIndex}`}
                  evidence={evidence}
                  termKey={termKey}
                  index={evidenceIndex}
                />
              ))
            ) : (
              <p className="empty-note">No evidence excerpt was returned for this term.</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default EvidenceList
