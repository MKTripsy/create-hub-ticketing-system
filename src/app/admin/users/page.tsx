'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'
// import { useReactToPrint } from 'react-to-print'

// type User = {
//   id: number
//   custom_id: string
//   first_name: string
//   last_name: string
//   birthdate: string
//   grade_level: string
//   qr_code: string
//   is_active: boolean
//   spaces: {
//     space_name: string
//   } | null
// }

type Space = {
  space_name: string
}

type User = {
  id: number
  custom_id: string
  first_name: string
  last_name: string
  birthdate: string
  grade_level: string
  qr_code: string
  is_active: boolean
  spaces: Space | null
}

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Fetch all users
  const fetchUsers = async () => {
  setLoading(true)
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      custom_id,
      first_name,
      last_name,
      birthdate,
      grade_level,
      qr_code,
      is_active,
      spaces (
        space_name
      )
    `)
    .order('id', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
  } else {
    setUsers((data ?? []) as unknown as User[])
  }
  setLoading(false)
}

useEffect(() => {
  fetchUsers()

  // Refetch when user navigates back to this page
  window.addEventListener('focus', fetchUsers)
  return () => window.removeEventListener('focus', fetchUsers)
}, [])

  // Print QR code
//   const handlePrint = useReactToPrint({
//   documentTitle: 'QR Code',
//   onBeforePrint: () => Promise.resolve(),
//     })
const handlePrint = () => {
  const printContent = printRef.current
  if (!printContent) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>QR Code - ${selectedUser?.custom_id}</title>
        <style>
          body { 
            display: flex; 
            flex-direction: column;
            justify-content: center; 
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: sans-serif;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <a
            href="/admin/users/add"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
            Add User
          </a>
        </div>

        {/* Empty state */}
        {users.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">No users added yet</p>
            <a href="/admin/users/add" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Add your first user
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Grade</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Space</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {user.custom_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      Grade {user.grade_level}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.spaces?.space_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* QR Code Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">

              {/* Printable area */}
              <div ref={printRef} className="text-center p-4">
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  {selectedUser.custom_id}
                </p>
                <div className="flex justify-center mb-4">
                  <QRCode value={selectedUser.qr_code} size={200} />
                </div>
                <p className="text-gray-400 text-xs">
                  {selectedUser.spaces?.space_name} — Grade {selectedUser.grade_level}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                   Print QR
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}