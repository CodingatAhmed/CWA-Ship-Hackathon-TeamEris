import { useCallback, useEffect, useRef, useState } from 'react'

import AnalysisProgress from '../components/AnalysisProgress.jsx'
import ComparisonForm from '../components/ComparisonForm.jsx'
import ComparisonResults from '../components/ComparisonResults.jsx'
import ErrorPanel from '../components/ErrorPanel.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { ApiError, ERROR_KIND, apiClient } from '../api/client.js'
import { MOCK_COMPARE_RESPONSE, MOCK_ENABLED } from '../data/mockResponse.js'
import {
  buildPayload,
  createDemoForm,
  createEmptyForm,
  hasErrors,
  validateForm,
} from '../lib/comparison.js'
import './HomePage.css'

const STATUS = Object.freeze({
  INPUT: 'input',
  ANALYSING: 'analysing',
  RESULTS: 'results',
  ERROR: 'error',
})

const NO_ERRORS = { routes: [{}, {}] }

function HomePage() {
  const [form, setForm] = useState(createEmptyForm)
  const [status, setStatus] = useState(STATUS.INPUT)
  const [errors, setErrors] = useState(NO_ERRORS)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const inFlightRef = useRef(false)
  const resultsRef = useRef(null)

  useEffect(() => {
    if (status === STATUS.RESULTS && resultsRef.current) {
      resultsRef.current.focus()
    }
  }, [status])

  const runComparison = useCallback(async (currentForm) => {
    if (inFlightRef.current) return

    const validation = validateForm(currentForm)
    setErrors(validation)

    if (hasErrors(validation)) {
      setError(
        new ApiError('Some fields still need attention before the comparison can run.', {
          kind: ERROR_KIND.VALIDATION,
        }),
      )
      setStatus(STATUS.ERROR)
      return
    }

    inFlightRef.current = true
    setStatus(STATUS.ANALYSING)
    setError(null)

    try {
      const payload = buildPayload(currentForm)
      const response = MOCK_ENABLED
        ? MOCK_COMPARE_RESPONSE
        : await apiClient.compareQuotes(payload)

      setResult(response)
      setStatus(STATUS.RESULTS)
    } catch (caught) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError('The comparison could not be completed. Please try again.', {
              kind: ERROR_KIND.UNEXPECTED,
            })

      setError(apiError)
      setStatus(STATUS.ERROR)
    } finally {
      inFlightRef.current = false
    }
  }, [])

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      runComparison(form)
    },
    [form, runComparison],
  )

  const handleRetry = useCallback(() => {
    runComparison(form)
  }, [form, runComparison])

  const handleFieldChange = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }, [])

  const handleRouteChange = useCallback((index, field, value) => {
    setForm((current) => ({
      ...current,
      routes: current.routes.map((route, routeIndex) =>
        routeIndex === index ? { ...route, [field]: value } : route,
      ),
    }))
    setErrors((current) => ({
      ...current,
      routes: current.routes.map((routeErrors, routeIndex) =>
        routeIndex === index ? { ...routeErrors, [field]: undefined } : routeErrors,
      ),
    }))
  }, [])

  const handleLoadDemo = useCallback(() => {
    setForm(createDemoForm())
    setErrors(NO_ERRORS)
    setError(null)
    setStatus(STATUS.INPUT)
  }, [])

  const handleClear = useCallback(() => {
    setForm(createEmptyForm())
    setErrors(NO_ERRORS)
    setError(null)
    setResult(null)
    setStatus(STATUS.INPUT)
  }, [])

  const handleEditInputs = useCallback(() => {
    setError(null)
    setStatus(STATUS.INPUT)
  }, [])

  const showForm = status === STATUS.INPUT || status === STATUS.ERROR
  const serverFieldMessages =
    status === STATUS.ERROR && error?.kind === ERROR_KIND.VALIDATION
      ? (error.fieldMessages ?? [])
      : []

  return (
    <div className="app-shell">
      <SiteHeader />

      <main>
        {showForm && (
          <section className="hero" aria-labelledby="page-title">
            <div className="hero-copy">
              <p className="eyebrow">A clearer path from quote to payout</p>
              <h1 id="page-title">Know what reaches you before choosing a route.</h1>
              <p className="hero-intro">
                Enter your invoice context, paste two payout quotes, and see the estimated net
                PKR for each route with the exact wording every figure came from.
              </p>
            </div>

            <aside className="how-panel" aria-label="How the comparison works">
              <h2>How it works</h2>
              <ol>
                <li>AI reads each pasted quote and extracts only stated terms.</li>
                <li>Every term is checked against the text you actually pasted.</li>
                <li>Fees and the net PKR are calculated with exact decimal maths.</li>
              </ol>
              <p className="how-note">
                Missing or unclear terms stay visible. Nothing is invented to fill a gap.
              </p>
            </aside>
          </section>
        )}

        {status === STATUS.ERROR && (
          <ErrorPanel error={error} onRetry={handleRetry} onEditInputs={handleEditInputs} />
        )}

        {showForm && (
          <ComparisonForm
            form={form}
            errors={errors}
            isSubmitting={status === STATUS.ANALYSING}
            serverFieldMessages={serverFieldMessages}
            onFieldChange={handleFieldChange}
            onRouteChange={handleRouteChange}
            onSubmit={handleSubmit}
            onLoadDemo={handleLoadDemo}
            onClear={handleClear}
          />
        )}

        {status === STATUS.ANALYSING && <AnalysisProgress routeCount={form.routes.length} />}

        {status === STATUS.RESULTS && result && (
          <div ref={resultsRef} tabIndex={-1} className="results-wrap">
            <ComparisonResults result={result} onEditInputs={handleEditInputs} />
          </div>
        )}
      </main>

      <footer>
        <p>
          Verify any tax or regulatory information with a qualified professional and current
          official sources.
        </p>
      </footer>
    </div>
  )
}

export default HomePage
