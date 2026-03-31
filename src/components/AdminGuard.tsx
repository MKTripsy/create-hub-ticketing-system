'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push('/admin/login')
    }
  }, [admin, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!admin) return null

  return <>{children}</>
}