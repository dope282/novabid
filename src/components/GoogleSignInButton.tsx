import { useEffect, useRef } from 'react'
import { useTheme } from '../theme'

/** Google Identity Services-ийн клиент талын хамгийн бага интерфейс */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (res: { credential: string }) => void }): void
      renderButton(el: HTMLElement, options: Record<string, unknown>): void
    }
  }
}
declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/** VITE_GOOGLE_CLIENT_ID тохируулаагүй бол Google нэвтрэлт унтраалттай */
export const googleEnabled = !!CLIENT_ID

let scriptPromise: Promise<void> | null = null

/** GIS скриптийг нэг л удаа ачаална */
function loadGis(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('gis')))
      if (window.google) resolve()
      return
    }
    const el = document.createElement('script')
    el.src = SCRIPT_SRC
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => {
      scriptPromise = null // дараа дахин оролдож болно
      reject(new Error('gis'))
    }
    document.head.appendChild(el)
  })
  return scriptPromise
}

/**
 * "Sign in with Google" товч. Google-ээс ирсэн ID token-ыг `onCredential`-руу дамжуулна —
 * баталгаажуулалт нь сервер дээр хийгдэнэ.
 */
export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void
  onError?: (message: string) => void
}) {
  const holder = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  // Callback-ууд render бүрт шинэ функц байж болох тул ref-т барина —
  // эс бөгөөс GIS товч дахин дахин үүснэ.
  const cbRef = useRef({ onCredential, onError })
  cbRef.current = { onCredential, onError }

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    loadGis()
      .then(() => {
        if (cancelled || !holder.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => cbRef.current.onCredential(res.credential),
        })
        holder.current.innerHTML = ''
        window.google.accounts.id.renderButton(holder.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'center',
          width: 320,
        })
      })
      .catch(() => {
        if (!cancelled) cbRef.current.onError?.('Google-тэй холбогдож чадсангүй')
      })

    return () => {
      cancelled = true
    }
  }, [theme])

  if (!CLIENT_ID) return null
  return <div ref={holder} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
}
