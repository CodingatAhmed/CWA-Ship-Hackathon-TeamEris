function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="PayoutPath PK home">
        <span className="brand-mark" aria-hidden="true">
          PP
        </span>
        <span>PayoutPath</span>
        <span className="brand-country">PK</span>
      </a>
      <span className="milestone-chip">Built for Pakistan-based earners</span>
    </header>
  )
}

export default SiteHeader
