import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAdminAuth } from './auth'

/** Нэвтрээгүй (эсвэл админ биш) бол login руу шилжүүлнэ */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthed, loading } = useAdminAuth()
  const location = useLocation()

  // Токен шалгаж дуустал хүлээнэ
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--nb-bg)', color: 'var(--nb-ink-2)' }}>
        Шалгаж байна…
      </div>
    )
  }

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
