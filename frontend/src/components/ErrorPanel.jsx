import { ERROR_KIND } from '../api/client.js'

const TITLES = {
  [ERROR_KIND.VALIDATION]: 'Check the highlighted fields',
  [ERROR_KIND.CONFIGURATION]: 'The comparison service is not configured',
  [ERROR_KIND.RETRYABLE]: 'The service is temporarily unavailable',
  [ERROR_KIND.TIMEOUT]: 'The comparison took too long',
  [ERROR_KIND.NETWORK]: 'The comparison service could not be reached',
  [ERROR_KIND.UNEXPECTED]: 'The comparison could not be completed',
}

function ErrorPanel({ error, onRetry, onEditInputs }) {
  if (!error) return null

  const title = TITLES[error.kind] ?? TITLES[ERROR_KIND.UNEXPECTED]
  const isValidation = error.kind === ERROR_KIND.VALIDATION
  const isConfiguration = error.kind === ERROR_KIND.CONFIGURATION

  return (
    <section className="error-panel" role="alert" aria-labelledby="error-title">
      <span className="error-tag">Error</span>
      <h2 id="error-title">{title}</h2>
      <p>{error.message}</p>

      {isValidation && error.fieldMessages.length > 0 && (
        <ul className="error-details">
          {error.fieldMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {isConfiguration && (
        <p className="error-operator">
          This is a server setup step, not a problem with your inputs. The backend
          needs a supported <code>AI_PROVIDER</code> (<code>groq</code> or{' '}
          <code>openai</code>), a matching <code>AI_MODEL</code>, and a valid{' '}
          <code>AI_API_KEY</code> before any comparison can run.
        </p>
      )}

      <p className="error-preserved">Your inputs have been kept exactly as you entered them.</p>

      <div className="error-actions">
        {error.retryable && (
          <button type="button" className="button-primary" onClick={onRetry}>
            Retry comparison
          </button>
        )}
        <button type="button" className="button-ghost" onClick={onEditInputs}>
          Edit inputs
        </button>
      </div>
    </section>
  )
}

export default ErrorPanel
