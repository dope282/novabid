import { createBrowserRouter } from 'react-router-dom'
import { Home } from './pages/Home'
import { AuctionDetail } from './pages/AuctionDetail'
import { AuctionResult } from './pages/AuctionResult'
import { Login } from './pages/Login'
import { Wallet } from './pages/Wallet'
import { Tokens } from './pages/Tokens'
import { Shop } from './pages/Shop'
import { Profile } from './pages/Profile'
import { Referral } from './pages/Referral'
import { Placeholder } from './pages/Placeholder'
import { NotFound } from './pages/NotFound'
import { AdminLayout } from './admin/AdminLayout'
import { AdminLogin } from './admin/AdminLogin'
import { RequireAdmin } from './admin/RequireAdmin'
import { AdminOverview } from './admin/pages/AdminOverview'
import { AdminAuctions } from './admin/pages/AdminAuctions'
import { AdminUsers } from './admin/pages/AdminUsers'
import { AdminPayments } from './admin/pages/AdminPayments'
import { AdminPolls } from './admin/pages/AdminPolls'
import { AdminShop } from './admin/pages/AdminShop'
import { AdminPacks } from './admin/pages/AdminPacks'

export const router = createBrowserRouter(
  [
    { path: '/', element: <Home /> },
    { path: '/lot/:id', element: <AuctionDetail /> },
    { path: '/lot/:id/win', element: <AuctionResult outcome="win" /> },
    { path: '/lot/:id/consolation', element: <AuctionResult outcome="consolation" /> },
    { path: '/shop', element: <Shop /> },
    { path: '/wallet', element: <Wallet /> },
    { path: '/tokens', element: <Tokens /> },
    { path: '/profile', element: <Profile /> },
    { path: '/referral', element: <Referral /> },
    { path: '/how', element: <Placeholder title="Хэрхэн ажилладаг вэ?" /> },
    { path: '/login', element: <Login /> },

    // --- Admin ---
    { path: '/admin/login', element: <AdminLogin /> },
    {
      path: '/admin',
      element: (
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      ),
      children: [
        { index: true, element: <AdminOverview /> },
        { path: 'auctions', element: <AdminAuctions /> },
        { path: 'users', element: <AdminUsers /> },
        { path: 'payments', element: <AdminPayments /> },
        { path: 'packs', element: <AdminPacks /> },
        { path: 'polls', element: <AdminPolls /> },
        { path: 'shop', element: <AdminShop /> },
      ],
    },

    // Танихгүй бүх зам
    { path: '*', element: <NotFound /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)
