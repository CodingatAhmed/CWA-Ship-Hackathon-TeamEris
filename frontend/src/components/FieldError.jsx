function FieldError({ id, message }) {
  if (!message) return null

  return (
    <p className="field-error" id={id} role="alert">
      <span aria-hidden="true">!</span>
      {message}
    </p>
  )
}

export default FieldError
