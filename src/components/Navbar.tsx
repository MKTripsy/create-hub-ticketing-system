'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
const router = useRouter()
const pathname = usePathname()
const { admin, logout } = useAuth()
const isAdminRoute = pathname.startsWith('/admin')

  // const handleLogout = async () => {
  //   await fetch('/api/auth/logout', { method: 'POST' })
  //   router.push('/')
  // }

  return (
    <nav className="bg-cforange border-b border-gray-200 px-8 py-4" style={{ backgroundColor: '#FF6347' }}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        
        {/* Logo/Brand */}
        <Link 
          href="/" 
          className="text-lg font-bold text-gray-800"
        >
          Create Foundation Ticketing System
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/admin/attendance"
            className="text-black hover:text-[#EEEEC6] text-sm font-medium"
          >
            Attendance
          </Link>
          <Link
            href="/admin/users"
            className="text-black hover:text-[#EEEEC6] text-sm font-medium"
          >
            Users
          </Link>
          <Link
            href="/scan"
            className="text-black hover:text-[#EEEEC6] text-sm font-medium"
          >
            Scan
          </Link>
          {isAdminRoute && admin ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                 {admin.first_name}
              </span>
              <button
                onClick={logout}
                className=" bg-[#EEEEC6] text-black px-4 py-2 rounded-lg hover:bg-[#283e42] hover:text-white text-sm font-medium"
              >
          {/* {isAdminRoute ? (
            <button
              onClick={handleLogout}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-medium"
              style={{ backgroundColor: '#EEEEC6' }}
            > */}
              Logout
            </button>
            </div>
          ) : (
            <Link
              href="/"
              className="bg-[#EEEEC6] text-black px-4 py-2 rounded-lg hover:bg-[#283e42] hover:text-white text-sm font-medium"
            >
              Home
            </Link>)}
        </div>
      </div>
    </nav>
  )
}