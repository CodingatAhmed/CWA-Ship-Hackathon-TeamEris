function VerificationNotice({ notice }) {
  if (!notice) return null

  return (
    <section className="verification-notice" aria-label="Verification notice">
      <span className="verification-icon" aria-hidden="true">
        ⚑
      </span>
      <div>
        <p>{notice.tax_and_regulatory_guidance}</p>
        {notice.official_source_urls?.length > 0 && (
          <ul className="verification-sources">
            {notice.official_source_urls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer noopener">
                  {url}
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
