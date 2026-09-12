function VerificationNotice({ notice }) {
  if (!notice) return null

  return (
    <section className="verification-notice" aria-labelledby="verification-title">
      <span className="verification-icon" aria-hidden="true">
        ⚑
      </span>
      <div>
        <h2 id="verification-title">Professional verification</h2>
        <p>{notice.tax_and_regulatory_guidance}</p>
        {notice.official_source_urls?.length > 0 && (
          <ul className="verification-sources">
            {notice.official_source_urls.map((url, index) => (
              <li key={`${url}-${index}`}>
                <a href={url} target="_blank" rel="noreferrer noopener">
                  Open official source {index + 1}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default VerificationNotice
