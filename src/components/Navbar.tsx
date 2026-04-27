'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import AdminGuard from './AdminGuard'

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { admin, logout } = useAuth()

  // Don't show hamburger if not logged in
  if (!admin) return null

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard'},
    { href: '/admin/schedules', label: 'Schedules'},
    { href: '/admin/users', label: 'Users'},
    { href: '/admin/attendance', label: 'Attendance'},
    { href: '/scan', label: 'Scan'},
    { href: '/admin/settings', label: 'Settings'}
  ]

  const handleLogout = () => {
    setSidebarOpen(false)
    logout()
  }

  return (
    <AdminGuard>
      {/* Hamburger button — top left corner */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-20 bg-white shadow rounded-lg p-2 hover:bg-gray-100"
      >
        <div className="w-5 h-0.5 bg-gray-700 mb-1" />
        <div className="w-5 h-0.5 bg-gray-700 mb-1" />
        <div className="w-5 h-0.5 bg-gray-700" />
      </button>

      {/* Overlay — dims background when sidebar is open */}
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

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#FF6347]">
          <span className="font-bold text-white text-lg">Home of Hope</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Admin info */}
        <div className="px-6 py-4 border-b border-[#FAF2F0]">
          <p className="text-xs text-black mb-1">Logged in as</p>
          <p className="text-xl font-bold border-[#FF6347]">
            {admin.first_name} {admin.last_name}
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-[#EEEEC6] text-black'
                  : 'text-white hover:bg-[#CEE4B8] hover:text-black'
              }`}
            >
              <span></span>
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
            <span></span>
            Logout
          </button>
        </div>

      </div>
    </AdminGuard>
  )
}

//Navbar at the top
// 'use client' 

// import Link from 'next/link'
// import { useRouter, usePathname } from 'next/navigation'
// import { useAuth } from '@/context/AuthContext'

// export default function Navbar() {
// const router = useRouter()
// const pathname = usePathname()
// const { admin, logout } = useAuth()
// const isAdminRoute = pathname.startsWith('/admin')

//   // const handleLogout = async () => {
//   //   await fetch('/api/auth/logout', { method: 'POST' })
//   //   router.push('/')
//   // }

//   return (
//     <nav className="bg-cforange border-b border-gray-200 px-8 py-4" style={{ backgroundColor: '#FF6347' }}>
//       <div className="max-w-6xl mx-auto flex justify-between items-center">
        
//         {/* Logo/Brand */}
//         <Link 
//           href="/" 
//           className="text-lg font-bold text-gray-800"
//         >
//           Create Foundation Ticketing System
//         </Link>

//         {/* Navigation Links */}
//         <div className="flex items-center gap-6">
//           <Link
//             href="/admin/dashboard"
//             className="text-black hover:text-[#EEEEC6] text-sm font-medium"
//           >
//             Dashboard
//           </Link>
//           <Link
//             href="/admin/attendance"
//             className="text-black hover:text-[#EEEEC6] text-sm font-medium"
//           >
//             Attendance
//           </Link>
//           <Link
//             href="/admin/users"
//             className="text-black hover:text-[#EEEEC6] text-sm font-medium"
//           >
//             Users
//           </Link>
//           <Link
//             href="/scan"
//             className="text-black hover:text-[#EEEEC6] text-sm font-medium"
//           >
//             Scan
//           </Link>
//           <Link
//             href="/admin/settings"
//             className="text-black hover:text-[#EEEEC6] text-sm font-medium"
//           >
//             Settings
//           </Link>
//           {isAdminRoute && admin ? (
//             <div className="flex items-center gap-3">
//               <span className="text-sm text-gray-500">
//                  {admin.first_name}
//               </span>
//               <button
//                 onClick={logout}
//                 className=" bg-[#EEEEC6] text-black px-4 py-2 rounded-lg hover:bg-[#283e42] hover:text-white text-sm font-medium"
//               >
//           {/* {isAdminRoute ? (
//             <button
//               onClick={handleLogout}
//               className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-medium"
//               style={{ backgroundColor: '#EEEEC6' }}
//             > */}
//               Logout
//             </button>
//             </div>
//           ) : (
//             <Link
//               href="/"
//               className="bg-[#EEEEC6] text-black px-4 py-2 rounded-lg hover:bg-[#283e42] hover:text-white text-sm font-medium"
//             >
//               Home
//             </Link>)}
//         </div>
//       </div>
//     </nav>
//   )
// }