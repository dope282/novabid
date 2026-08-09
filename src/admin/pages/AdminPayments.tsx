import { api } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'

type PillColor = 'green' | 'amber' | 'red' | 'blue' | 'gray'

const STATUS: Record<string, { label: string; color: PillColor }> = {
  success: { label: 'АМЖИЛТТАЙ', color: 'green' },
  pending: { label: 'ХҮЛЭЭГДЭЖ БУЙ', color: 'amber' },
  failed: { label: 'АМЖИЛТГҮЙ', color: 'red' },
}

const METHOD_COLOR: Record<string, PillColor> = {
  QPay: 'blue',
  Referral: 'green',
  Refund: 'red',
  Кредит: 'amber',
  Token: 'green',
}

export function AdminPayments() {
  const { data, loading, error } = useAdminData(api.adminPayments)
  const adminPayments = data?.payments ?? []

  const totalIn = adminPayments
    .filter((p) => p.status === 'success' && p.method === 'QPay')
    .reduce((s, p) => s + Number(p.amount.replace(/[^\d]/g, '')), 0)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Төлбөр / Гүйлгээ</h1>
        <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
          {loading ? (
            'Ачаалж байна…'
          ) : error ? (
            error
          ) : (
            <>
              QPay нийт орлого:{' '}
              <b className="nb-tnum" style={{ color: 'var(--nb-ink)' }}>
                {totalIn.toLocaleString('en-US')}₮
              </b>
            </>
          )}
        </p>
      </div>

      <div className="nb-card nb-table-wrap">
        <table className="nb-table">
          <thead>
            <tr>
              <th>Гүйлгээ №</th>
              <th>Хэрэглэгч</th>
              <th>Зүйл</th>
              <th>Суваг</th>
              <th>Дүн</th>
              <th>Төлөв</th>
              <th>Огноо</th>
            </tr>
          </thead>
          <tbody>
            {adminPayments.map((p) => {
              const st = STATUS[p.status] ?? { label: p.status.toUpperCase(), color: 'gray' as PillColor }
              return (
                <tr key={p.id}>
                  <td style={{ font: "700 11px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.user}</td>
                  <td style={{ color: 'var(--nb-ink-2)' }}>{p.item}</td>
                  <td>
                    <Pill label={p.method.toUpperCase()} color={METHOD_COLOR[p.method] ?? 'gray'} />
                  </td>
                  <td
                    className="nb-tnum"
                    style={{
                      font: "700 13px 'JetBrains Mono'",
                      color: p.amount.startsWith('−') || p.amount.startsWith('-') ? 'var(--nb-red)' : 'var(--nb-ink)',
                    }}
                  >
                    {p.amount}
                  </td>
                  <td>
                    <Pill label={st.label} color={st.color} />
                  </td>
                  <td style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{p.date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
