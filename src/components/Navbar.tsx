'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import AdminGuard from './AdminGuard'
import Image from 'next/image'
import CFLogo from '@/app/images/CFLogoBOnyx.png'

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { admin, logout } = useAuth()

  if (!admin) return null

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/schedules', label: 'Schedules' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/attendance', label: 'Attendance' },
    { href: '/scan', label: 'Scan' },
    { href: '/admin/notifications', label: 'Notifications' }, 
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

        {/* Admin info */}
        <div className="px-6 py-4 border-b border-[#FAF2F0]">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
          <Image src={CFLogo} alt="Create Hub Logo" className="w-auto h-auto" />

          {/* Orphanage name */}
          <p className="text-xs text-black mt-2 mb-0.5">
            {admin.orphanage_name || 'Current Hub'}
          </p>

          {/* Role badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            admin.role === 'superadmin'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-white text-gray-700'
          }`}>
            {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </span>

          <p className="text-xs text-black mt-2 mb-1">Logged in as</p>
          <p className="text-xl font-bold">
            {admin.first_name} {admin.last_name}
          </p>
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