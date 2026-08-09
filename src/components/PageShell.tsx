import type { ReactNode } from 'react'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'

/** Вэб хуудасны бүрхүүл — header + контент + footer */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="nb-site">
      <SiteHeader />
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  )
}
