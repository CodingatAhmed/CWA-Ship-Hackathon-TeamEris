import { formatMoney } from '../lib/format.js'

function FeeBreakdown({ fees }) {
  if (!fees || fees.length === 0) {
    return <p className="empty-note">No deductions could be itemized from this quote.</p>
  }

  return (
    <div className="fee-table-wrap">
      <table className="fee-table">
        <caption className="visually-hidden">Itemized deductions for this route</caption>
        <thead>
          <tr>
            <th scope="col">Deduction</th>
            <th scope="col">Amount</th>
            <th scope="col">How it was calculated</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((fee, index) => (
            <tr key={`${fee.label}-${index}`}>
              <th scope="row">{fee.label}</th>
              <td className="fee-amount">{formatMoney(fee.amount, fee.currency) ?? '—'}</td>
              <td className="fee-note">{fee.calculation_note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FeeBreakdown
