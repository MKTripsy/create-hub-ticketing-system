'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import AdminGuard from './AdminGuard'
import Image from 'next/image'
import CFLogo from '@/app/images/CREATE FOUNDATION logo B Snow.svg'

function AdminAvatar({ photoUrl, firstName, lastName, size = 'md' }: {
  photoUrl?: string | null
  firstName: string
  lastName: string
  size?: 'sm' | 'md'
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm'

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClass} rounded-full object-cover border-2 border-white/40 flex-shrink-0`}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { admin, logout } = useAuth()

  if (!admin) return null

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/scan', label: 'Scan' },
    { href: '/admin/users', label: 'Hubbers' },
    { href: '/admin/attendance', label: 'Attendance' },
    { href: '/admin/hubuse', label: 'Hub Use' },
    { href: '/admin/schedules', label: 'Schedules' },
    { href: '/admin/notifications', label: 'Activity Logs' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  const handleLogout = () => {
    setSidebarOpen(false)
    logout()
  }

  return (
    <AdminGuard>
      {/* Hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-20 bg-white shadow rounded-lg p-2 hover:bg-gray-100"
      >
        <div className="w-5 h-0.5 bg-gray-700 mb-1" />
        <div className="w-5 h-0.5 bg-gray-700 mb-1" />
        <div className="w-5 h-0.5 bg-gray-700" />
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 z-50 shadow-xl flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ backgroundColor: '#FF6347' }}>

        {/* Logo */}
        <div className="px-6 py-4 border-b border-[#FAF2F0]">
          <Image src={CFLogo} alt="Create Hub Logo" className="w-[60%] h-auto mx-auto block" />
          <p className="text-xl text-white font-bold mt-2 mb-0.5">
            {admin.orphanage_name || 'Current Hub'}
          </p>
        </div>

        {/* Admin info with photo */}
        <div className="px-6 py-4 border-b border-[#FAF2F0]">
          <div className="flex items-center gap-3">
            <AdminAvatar
              photoUrl={admin.photo_url}
              firstName={admin.first_name}
              lastName={admin.last_name}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-white font-bold truncate">
                {admin.first_name} {admin.last_name}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                admin.role === 'superadmin'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-white text-gray-700'
              }`}>
                {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href as any}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-[#EEEEC6] text-black'
                  : 'text-white hover:bg-[#CEE4B8] hover:text-black'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-[#FF6347]">
          <button
            onClick={handleLogout}
            className="flex items-center bg-[#414141] gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white hover:bg-red-50 hover:text-[#FF0000] w-full"
          >
            Logout
          </button>
        </div>
      </div>
    </AdminGuard>
  )
}