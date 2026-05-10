import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import config from '../config/global.config'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  userType: 'PATIENT' | 'DOCTOR'
  specialty?: string
  avatarUrl?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  userType: 'PATIENT' | 'DOCTOR' | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem(config.TOKEN_KEY)
    const storedUser = localStorage.getItem(config.USER_KEY)
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const login = (token: string, user: User) => {
    localStorage.setItem(config.TOKEN_KEY, token)
    localStorage.setItem(config.USER_KEY, JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem(config.TOKEN_KEY)
    localStorage.removeItem(config.USER_KEY)
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }

  const updateUser = (updated: Partial<User>) => {
    if (!user) return
    const newUser = { ...user, ...updated }
    localStorage.setItem(config.USER_KEY, JSON.stringify(newUser))
    setUser(newUser)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      userType: user?.userType || null,
      isAuthenticated: !!token,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
