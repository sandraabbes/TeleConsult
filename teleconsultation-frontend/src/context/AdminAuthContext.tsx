import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AdminUser {
  id: string
  email: string
  role: string
}

interface AdminAuthContextType {
  adminUser: AdminUser | null
  adminToken: string | null
  isAdminAuthenticated: boolean
  adminLogin: (token: string, user: AdminUser) => void
  adminLogout: () => void
}

const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY)
    const storedUser = localStorage.getItem(ADMIN_USER_KEY)
    if (storedToken && storedUser) {
      setAdminToken(storedToken)
      setAdminUser(JSON.parse(storedUser))
    }
  }, [])

  const login = (token: string, user: AdminUser) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user))
    setAdminToken(token)
    setAdminUser(user)
  }

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    setAdminToken(null)
    setAdminUser(null)
    window.location.href = '/admin/login'
  }

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      adminToken,
      isAdminAuthenticated: !!adminToken,
      adminLogin: login,
      adminLogout: logout,
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return context
}
