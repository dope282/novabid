import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken, type ApiUser } from './lib/api'

interface SessionCtx {
  user: ApiUser | null
  loading: boolean
  /** Түр төлөв: нэвтэрсэн эсэх */
  isAuthed: boolean
  credits: number
  tokens: number
  login: (email: string, password: string) => Promise<void>
  /** Google ID token-оор нэвтрэх / бүртгүүлэх */
  loginWithGoogle: (credential: string, referralCode?: string) => Promise<void>
  verify: (email: string, code: string) => Promise<void>
  logout: () => void
  /** Серверээс хэрэглэгчийн мэдээллийг дахин ачаалах (bid/topup дараа) */
  refresh: () => Promise<void>
  /** Гадны кодоос user-ийг шинэчлэх (login/verify хариунаас) */
  setUser: (u: ApiUser | null, token?: string) => void
}

const Ctx = createContext<SessionCtx | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((u: ApiUser | null, token?: string) => {
    if (token !== undefined) setToken(token)
    setUserState(u)
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUserState(null)
      return
    }
    try {
      const { user } = await api.me()
      setUserState(user)
    } catch {
      // token хүчингүй → цэвэрлэнэ
      setToken(null)
      setUserState(null)
    }
  }, [])

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login({ email, password })
    setToken(token)
    setUserState(user)
  }, [])

  const loginWithGoogle = useCallback(async (credential: string, referralCode?: string) => {
    const { token, user } = await api.googleLogin({ credential, referralCode })
    setToken(token)
    setUserState(user)
  }, [])

  const verify = useCallback(async (email: string, code: string) => {
    const { token, user } = await api.verify({ email, code })
    setToken(token)
    setUserState(user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUserState(null)
  }, [])

  const value = useMemo<SessionCtx>(
    () => ({
      user,
      loading,
      isAuthed: !!user,
      credits: user?.credits ?? 0,
      tokens: user?.tokens ?? 0,
      login,
      loginWithGoogle,
      verify,
      logout,
      refresh,
      setUser,
    }),
    [user, loading, login, loginWithGoogle, verify, logout, refresh, setUser],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUser(): SessionCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUser нь UserProvider дотор дуудагдах ёстой')
  return ctx
}
