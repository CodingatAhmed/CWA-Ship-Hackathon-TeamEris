import { useCallback, useEffect, useRef, useState } from 'react'

import AnalysisProgress from '../components/AnalysisProgress.jsx'
import ComparisonForm from '../components/ComparisonForm.jsx'
import ComparisonResults from '../components/ComparisonResults.jsx'
import ErrorPanel from '../components/ErrorPanel.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkflowExplainer from '../components/WorkflowExplainer.jsx'
import { ApiError, ERROR_KIND, apiClient } from '../api/client.js'
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

const TOP_LEVEL_FIELDS = Object.freeze({
  invoice_amount: 'invoiceAmount',
  invoice_currency: 'invoiceCurrency',
  client_country: 'clientCountry',
  platform_or_context: 'platformOrContext',
})

const ROUTE_FIELDS = Object.freeze({
  route_name: 'routeName',
  pasted_text: 'pastedText',
})

function createNoErrors() {
  return { routes: [{}, {}] }
}

function validationErrorsFromApi(issues) {
  const errors = createNoErrors()

  for (const issue of issues ?? []) {
    const location = Array.isArray(issue.location) ? issue.location : []
    const routeRoot = location.indexOf('route_quotes')

    if (routeRoot >= 0) {
      const routeIndex = location[routeRoot + 1]
      const apiField = location[routeRoot + 2]
      const field = ROUTE_FIELDS[apiField]
      if (Number.isInteger(routeIndex) && errors.routes[routeIndex] && field) {
        errors.routes[routeIndex][field] = issue.message
      }
      continue
    }

    const field = TOP_LEVEL_FIELDS[location.at(-1)]
    if (field) errors[field] = issue.message
  }

  return errors
}

function contextFromPayload(payload) {
  return {
    invoiceAmount: payload.invoice_amount,
    invoiceCurrency: payload.invoice_currency,
    clientCountry: payload.client_country,
    platformOrContext: payload.platform_or_context,
  }
}

function HomePage() {
  const [form, setForm] = useState(createEmptyForm)
  const [status, setStatus] = useState(STATUS.INPUT)
  const [errors, setErrors] = useState(createNoErrors)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [submittedContext, setSubmittedContext] = useState(null)
  const [isDemo, setIsDemo] = useState(false)

  const inFlightRef = useRef(false)
  const resultsRef = useRef(null)

  useEffect(() => {
    if (status === STATUS.RESULTS && resultsRef.current) {
      resultsRef.current.focus()
    }
  }, [status])

  useEffect(() => {
    if (status !== STATUS.ERROR || error?.kind !== ERROR_KIND.VALIDATION) return

    const focusFrame = window.requestAnimationFrame(() => {
      const invalidField = document.querySelector('#comparison-form [aria-invalid="true"]')
      invalidField?.focus()
    })

    return () => window.cancelAnimationFrame(focusFrame)
  }, [error, errors, status])

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

    const payload = buildPayload(currentForm)
    inFlightRef.current = true
    setSubmittedContext(contextFromPayload(payload))
    setResult(null)
    setStatus(STATUS.ANALYSING)
    setError(null)

    try {
      const response = await apiClient.compareQuotes(payload)
      setResult(response)
      setStatus(STATUS.RESULTS)
    } catch (caught) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError('The comparison could not be completed. Please try again.', {
              kind: ERROR_KIND.UNEXPECTED,
            })

      if (apiError.kind === ERROR_KIND.VALIDATION) {
        setErrors(validationErrorsFromApi(apiError.validationIssues))
      }
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

  const dismissErrorForEditing = useCallback(() => {
    setError(null)
    setStatus((current) => (current === STATUS.ERROR ? STATUS.INPUT : current))
  }, [])

  const handleFieldChange = useCallback(
    (field, value) => {
      setForm((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
      dismissErrorForEditing()
    },
    [dismissErrorForEditing],
  )

  const handleRouteChange = useCallback(
    (index, field, value) => {
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
      setIsDemo(false)
      dismissErrorForEditing()
    },
    [dismissErrorForEditing],
  )

  const handleLoadDemo = useCallback(() => {
    setForm(createDemoForm())
    setErrors(createNoErrors())
    setError(null)
    setResult(null)
    setSubmittedContext(null)
    setIsDemo(true)
    setStatus(STATUS.INPUT)
  }, [])

  const handleClear = useCallback(() => {
    setForm(createEmptyForm())
    setErrors(createNoErrors())
    setError(null)
    setResult(null)
    setSubmittedContext(null)
    setIsDemo(false)
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
              <p className="eyebrow">Payment-route clarity for Pakistan</p>
              <h1 id="page-title">Know what reaches you before choosing a payout route.</h1>
              <p className="hero-intro">
                Built for Pakistani freelancers, remote workers, and small agencies receiving an
                overseas invoice. Paste the two quotes actually available to you and compare their
                supported estimated net PKR—not a generic provider list.
              </p>
              <div className="hero-trust-row" aria-label="Product safeguards">
                <span>Evidence attached</span>
                <span>Decimal maths</span>
                <span>No money moved</span>
              </div>
            </div>

            <WorkflowExplainer />
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
            isDemo={isDemo}
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
            <ComparisonResults
              result={result}
              submittedContext={submittedContext}
              isDemo={isDemo}
              onEditInputs={handleEditInputs}
            />
          </div>
        )}
      </main>

      <footer>
        <p>
          PayoutPath compares information you supply; it does not move money or claim provider
          affiliation. Verify any tax or regulatory information with a qualified professional and
          current official sources.
        </p>
      </footer>
    </div>
  )
}

export default HomePage
