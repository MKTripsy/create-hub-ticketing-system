'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

type Props = {
  children: React.ReactNode
  requireSuperadmin?: boolean
}

export default function AdminGuard({ children, requireSuperadmin = false }: Props) {
  const { admin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push('/admin/login')
    }
    if (!isLoading && admin && requireSuperadmin && admin.role !== 'superadmin') {
      router.push('/admin/dashboard')
    }
  }, [admin, isLoading, router, requireSuperadmin])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!admin) return null
  if (requireSuperadmin && admin.role !== 'superadmin') return null

  return <>{children}</>
}