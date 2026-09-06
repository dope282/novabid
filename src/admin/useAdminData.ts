import { useCallback, useEffect, useRef, useState } from 'react'

/** Админ өгөгдөл татах туслах hook — loading/error/refetch */
export function useAdminData<T>(fetcher: () => Promise<T>): {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Component unmount хийгдсэн эсэх — хуучирсан хариуг setState хийхгүйн тулд
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // fetcher нь ихэвчлэн inline функц тул ref-т хадгалж, refetch-ийг тогтвортой байлгана
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useCallback(async () => {
    setError(null)
    try {
      const d = await fetcherRef.current()
      if (alive.current) setData(d)
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Ачаалж чадсангүй')
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
