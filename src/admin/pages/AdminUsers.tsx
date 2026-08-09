import { useState } from 'react'
import { api } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'

export function AdminUsers() {
  const [q, setQ] = useState('')
  const { data, loading, error } = useAdminData(api.adminUsers)
  const adminUsers = data?.users ?? []
  const rows = adminUsers.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Хэрэглэгчид</h1>
          <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
            {loading ? 'Ачаалж байна…' : error ? error : `${rows.length} / ${adminUsers.length} хэрэглэгч`}
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Нэр эсвэл имэйлээр хайх…"
          style={{
            width: 260,
            maxWidth: '100%',
            background: 'var(--nb-surface)',
            border: '0.5px solid var(--nb-line)',
            borderRadius: 8,
            padding: '11px 14px',
            font: "500 13px 'Golos Text'",
            color: 'var(--nb-ink)',
            outline: 'none',
          }}
        />
      </div>

      <div className="nb-card nb-table-wrap">
        <table className="nb-table">
          <thead>
            <tr>
              <th>Хэрэглэгч</th>
              <th>Имэйл</th>
              <th>Кредит</th>
              <th>Token</th>
              <th>Ялалт</th>
              <th>Төлөв</th>
              <th>Элссэн</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.email}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'rgba(51,70,230,.1)',
                        color: 'var(--nb-blue-ink)',
                        display: 'grid',
                        placeItems: 'center',
                        font: "800 12px 'Rubik', sans-serif",
                        flex: 'none',
                      }}
                    >
                      {u.name[0]}
                    </span>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--nb-ink-2)' }}>{u.email}</td>
                <td className="nb-tnum">{u.credits}</td>
                <td className="nb-tnum" style={{ color: 'var(--nb-green)', fontWeight: 700 }}>{u.tokens}</td>
                <td className="nb-tnum">{u.wins}</td>
                <td>
                  {u.verified ? (
                    <Pill label="БАТАЛГААЖСАН" color="green" />
                  ) : (
                    <Pill label="ХҮЛЭЭГДЭЖ БУЙ" color="amber" />
                  )}
                </td>
                <td style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
