import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { api, ApiError } from '../lib/api'
import { useUser } from '../user'

type Mode = 'login' | 'register' | 'verify'

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--nb-surface)',
  border: '0.5px solid var(--nb-line)',
  borderRadius: 8,
  padding: '13px 14px',
  font: "500 14px 'Golos Text'",
  color: 'var(--nb-ink)',
  outline: 'none',
}

const labelStyle: CSSProperties = {
  font: "700 9px 'JetBrains Mono'",
  letterSpacing: '.12em',
  color: 'var(--nb-ink-2)',
  marginBottom: 6,
  display: 'block',
}

export function Login() {
  const navigate = useNavigate()
  const { login, verify } = useUser()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('bat.erdene@gmail.com')
  const [password, setPassword] = useState('12345678')
  const [name, setName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/')
      } else if (mode === 'register') {
        const res = await api.register({ email, password, name, referralCode: referralCode || undefined })
        setDevCode(res.devVerifyCode ?? null)
        if (res.devVerifyCode) setCode(res.devVerifyCode)
        setMode('verify')
      } else {
        await verify(email, code)
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа. Сервер асаалттай юу?')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? 'Нэвтрэх' : mode === 'register' ? 'Бүртгэл үүсгэх' : 'Имэйлээ шалгана уу'

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '48px 24px 64px', maxWidth: 440 }}>
        <div
          style={{
            background: 'var(--nb-bg)',
            border: '0.5px solid var(--nb-line)',
            borderRadius: 20,
            padding: '32px 28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
            <span
              style={{
                width: 34,
                height: 34,
                background: 'var(--nb-blue)',
                borderRadius: 9,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                font: "800 17px 'Rubik', sans-serif",
              }}
            >
              N
            </span>
            <span style={{ font: "700 17px 'Rubik', sans-serif", letterSpacing: '.04em' }}>NOVABID</span>
          </div>

          <div style={{ font: "800 24px/1.2 'Golos Text'", letterSpacing: '-.01em', marginBottom: 6 }}>
            {title}
          </div>
          <div style={{ font: "400 13px/1.5 'Golos Text'", color: 'var(--nb-ink-2)', marginBottom: 22 }}>
            {mode === 'verify'
              ? `${email} руу 6 оронтой код илгээлээ.`
              : 'Лот бүр 1₮-өөс эхэлнэ. Bid хийхийн тулд бүртгүүлээрэй.'}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'verify' ? (
              <div>
                <label style={labelStyle}>БАТАЛГААЖУУЛАХ КОД</label>
                <input
                  style={{ ...inputStyle, font: "700 20px 'Rubik', sans-serif", letterSpacing: '.3em', textAlign: 'center' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoFocus
                />
                {devCode && (
                  <div style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--nb-amber)', marginTop: 6 }}>
                    DEV код: {devCode} (имэйл илгээгч холбогдоогүй тул шууд харуулав)
                  </div>
                )}
              </div>
            ) : (
              <>
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle}>НЭР</label>
                    <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Таны нэр" />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>ИМЭЙЛ</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label style={labelStyle}>НУУЦ ҮГ</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8-аас дээш тэмдэгт"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle}>
                      УРИЛГЫН КОД <span style={{ color: 'var(--nb-ink-3)' }}>· ЗААВАЛ БИШ</span>
                    </label>
                    <input
                      style={inputStyle}
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="BAT-24KH"
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <div
                style={{
                  font: "500 12px 'Golos Text'",
                  color: 'var(--nb-red)',
                  background: 'rgba(229,72,77,.1)',
                  border: '0.5px solid rgba(229,72,77,.3)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="nb-btn nb-btn-primary" style={{ padding: '14px 0', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Түр хүлээнэ үү…' : mode === 'login' ? 'Нэвтрэх' : mode === 'register' ? 'Бүртгүүлэх' : 'Баталгаажуулах'}
            </button>
          </form>

          {mode !== 'verify' && (
            <div style={{ textAlign: 'center', font: "400 13px 'Golos Text'", color: 'var(--nb-ink-2)', marginTop: 18 }}>
              {mode === 'login' ? 'Шинэ хэрэглэгч үү? ' : 'Бүртгэлтэй юу? '}
              <button
                onClick={() => {
                  setError(null)
                  setMode(mode === 'login' ? 'register' : 'login')
                }}
                style={{ background: 'none', border: 'none', color: 'var(--nb-blue)', font: "600 13px 'Golos Text'", padding: 0 }}
              >
                {mode === 'login' ? 'Бүртгүүлэх' : 'Нэвтрэх'}
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', font: "500 11px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 16 }}>
          Demo: bat.erdene@gmail.com / 12345678
        </div>
      </div>
    </PageShell>
  )
}
