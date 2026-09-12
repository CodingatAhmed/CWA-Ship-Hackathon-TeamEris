import SiteHeader from '../components/SiteHeader.jsx'
import SupportCard from '../components/SupportCard.jsx'
import './HomePage.css'

const plannedInputs = [
  'Invoice amount and currency',
  'Client country and payment context',
  'At least two pasted route quotes',
]

const plannedResults = [
  'Terms grounded in evidence excerpts',
  'Missing terms and itemized fees',
  'Estimated net PKR and a conditional recommendation',
]

function HomePage() {
  return (
    <div className="app-shell">
      <SiteHeader />

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow">A clearer path from quote to payout</p>
            <h1 id="page-title">Know what reaches you before choosing a route.</h1>
            <p className="hero-intro">
              PayoutPath PK is being prepared to compare messy payout quotes for
              Pakistani freelancers with evidence-first extraction and transparent
              fee estimates.
            </p>
          </div>

          <aside className="status-panel" aria-label="Current product status">
            <div className="status-heading">
              <span className="status-dot" aria-hidden="true" />
              Foundation in progress
            </div>
            <p>
              Comparison is not connected yet. The API contract and real-AI
              integration boundary are ready for the next build phases.
            </p>
            <div className="status-track" aria-hidden="true">
              <span />
            </div>
            <small>1 of 5 build phases prepared</small>
          </aside>
        </section>

        <section className="support-grid" aria-label="Planned product support">
          <SupportCard
            number="01"
            title="What you will provide"
            description="The comparison flow will start with your real invoice context."
            items={plannedInputs}
          />
          <SupportCard
            number="02"
            title="What you will receive"
            description="Results will preserve uncertainty instead of inventing missing facts."
            items={plannedResults}
          />
        </section>

        <section className="ai-requirement" aria-labelledby="ai-title">
          <div>
            <p className="eyebrow">Mandatory product capability</p>
            <h2 id="ai-title">Real AI extraction, grounded in the text you paste.</h2>
          </div>
          <p>
            A later adapter will call a real AI API with structured output and
            schema validation. No demo extractor or placeholder comparison is
            running in this setup milestone.
          </p>
        </section>
      </main>

      <footer>
        <p>
          Any tax or regulatory information must be verified with a qualified
          professional and current official sources.
        </p>
      </footer>
    </div>
  )
}

export default HomePage

