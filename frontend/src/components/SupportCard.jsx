function SupportCard({ number, title, description, items }) {
  return (
    <article className="support-card">
      <span className="card-number" aria-hidden="true">
        {number}
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default SupportCard

