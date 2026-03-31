'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

type Admin = {
  id: number
  username: string
  first_name: string
  last_name: string
}

type AuthContextType = {
  admin: Admin | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('admin')
    if (stored) {
      setAdmin(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) return false

      // Store in localStorage
      localStorage.setItem('admin', JSON.stringify(data.admin))
      setAdmin(data.admin)
      return true

    } catch {
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('admin')
    setAdmin(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}