import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, type ApiUser } from '../lib/api'

interface AdminAuth {
  isAuthed: boolean
  loading: boolean
  email: string | null
  /** Имэйл+нууц үгээр нэвтэрнэ. Админ биш бол алдаа шиднэ. */
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AdminAuth | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Хуудас ачаалахад одоо байгаа token-оор админ эсэхийг шалгана
  useEffect(() => {
    let alive = true
    async function check() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const { user } = await api.me()
        if (alive && user.isAdmin) setUser(user)
      } catch {
        /* token хүчингүй */
      } finally {
        if (alive) setLoading(false)
      }
    }
    void check()
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<AdminAuth>(
    () => ({
      isAuthed: !!user?.isAdmin,
      loading,
      email: user?.email ?? null,
      login: async (email, password) => {
        const { token, user } = await api.login({ email, password })
        if (!user.isAdmin) throw new Error('Энэ бүртгэл админ эрхгүй байна')
        setToken(token)
        setUser(user)
      },
      logout: () => {
        setToken(null)
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdminAuth(): AdminAuth {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAdminAuth нь AdminAuthProvider дотор дуудагдах ёстой')
  return ctx
}
