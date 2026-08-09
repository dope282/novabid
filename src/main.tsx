import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ThemeProvider } from './theme'
import { AdminAuthProvider } from './admin/auth'
import { UserProvider } from './user'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AdminAuthProvider>
        <UserProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </UserProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
