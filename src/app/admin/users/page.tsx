'use client'

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/AdminGuard'
import UserTable from '@/components/users/UserTable'
import QRModal from '@/components/users/QRModal'
import { useAuth } from '@/context/AuthContext'
import { fetchUsersByOrphanage, User } from '@/lib/api/users'

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { admin, isLoading } = useAuth()

  const loadUsers = async () => {
    if (!admin?.orphanage_id) return
    setLoading(true)
    const data = await fetchUsersByOrphanage(admin.orphanage_id)
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isLoading || !admin?.orphanage_id) return
    loadUsers()
    window.addEventListener('focus', loadUsers)
    return () => window.removeEventListener('focus', loadUsers)
  }, [admin?.orphanage_id, isLoading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading users...</p>
      </div>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
        <div className="max-w-6xl mx-auto">

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Hubbers: {users.length}</h1>
            <a
              href="/admin/users/add"
              className="bg-[#FF6347] text-[#FAF2F0] hover:bg-[#414141] px-4 py-2 rounded-lg font-medium"
            >
              Add Hubber
            </a>
          </div>

          {users.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400 text-lg mb-4">No hubbers added yet</p>
              <a
                href="/admin/users/add"
                className="bg-[#cee4B8] text-black px-4 py-2 rounded-lg hover:bg-[#76bcad] hover:text-white"
              >
                Add your first hubber
              </a>
            </div>
          ) : (
            <UserTable users={users} onViewQR={setSelectedUser} />
          )}

          {selectedUser && (
            <QRModal user={selectedUser} onClose={() => setSelectedUser(null)} />
          )}

        </div>
      </div>
    </AdminGuard>
  )
}
// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import { supabase } from '@/lib/supabase'
// import QRCode from 'react-qr-code'
// import { toPng } from 'html-to-image'
// import AdminGuard from '@/components/AdminGuard'
// import { useAuth } from '@/context/AuthContext'

// type Space = {
//   space_name: string
// }

// type User = {
//   id: number
//   custom_id: string
//   first_name: string
//   last_name: string
//   birthdate: string
//   grade_level: string
//   qr_code: string
//   is_active: boolean
//   photo_url: string | null
//   spaces: Space | null
// }

// export default function UserListPage() {

//   const [users, setUsers] = useState<User[]>([])
//   const [loading, setLoading] = useState(true)
//   const [selectedUser, setSelectedUser] = useState<User | null>(null)
//   const printRef = useRef<HTMLDivElement>(null)
//   const qrRef = useRef<HTMLDivElement>(null)
//   const { admin, isLoading } = useAuth()

//   // Fetch all users
//   const fetchUsers = async () => {
//     if (!admin?.orphanage_id) return 
//     setLoading(true)
//     const { data, error } = await supabase
//       .from('users')
//       .select(`
//         id,
//         custom_id,
//         first_name,
//         last_name,
//         birthdate,
//         grade_level,
//         qr_code,
//         is_active,
//         photo_url,
//         spaces:primary_space_id (
//           space_name
//         )
//       `)
//       .eq('orphanage_id', admin?.orphanage_id)
//       .order('id', { ascending: false })

//     if (error) {
//       console.error('Error fetching users:', error)
//     } else {
//       setUsers((data ?? []) as unknown as User[])
//     }
//     setLoading(false)
//   }

//   useEffect(() => {
//     if (isLoading || !admin?.orphanage_id) return
//     fetchUsers()

//     // Refetch when user navigates back to this page
//     window.addEventListener('focus', fetchUsers)
//     return () => window.removeEventListener('focus', fetchUsers)
//   }, [admin?.orphanage_id, isLoading])

//   const handlePrint = () => {
//     if (!selectedUser) return
//     const printWindow = window.open('', '_blank')
//     if (!printWindow) return
//     printWindow.document.write(`
//       <html>
//         <head>
//           <title>QR Code - ${selectedUser.custom_id}</title>
//           <style>
//             body { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: sans-serif; }
//           </style>
//         </head>
//         <body>
//           <h2>${selectedUser.first_name} ${selectedUser.last_name}</h2>
//           <p style="color: gray; font-size: 14px;">${selectedUser.custom_id}</p>
//           <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedUser.qr_code)}" width="200" height="200" />
//           <script>window.onload = () => window.print()</script>
//         </body>
//       </html>
//     `)
//     printWindow.document.close()
//   }

//   const handleDownloadPng = async () => {
//     if (!qrRef.current) return

//     try {
//       const dataUrl = await toPng(qrRef.current, { quality: 1.0 })
//       const link = document.createElement('a')
//       link.download = `${selectedUser?.custom_id}-qr.png`
//       link.href = dataUrl
//       link.click()
//     } catch (error) {
//       console.error('Error downloading QR:', error)
//       alert('Something went wrong. Please try again.')
//     }
//   }


//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <p className="text-gray-500">Loading users...</p>
//       </div>
//     )
//   }

//   return (
//     <AdminGuard>
//     <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
//       <div className="max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-gray-800">Hubbers: {users.length}</h1>
//           <a href="/admin/users/add"
//            className="bg-[#FF6347] text-[#FAF2F0] hover:bg-[#414141] px-4 py-2 rounded-lg font-medium"> Add Hubber</a>
//         </div>

//         {/* Empty state */}
//         {users.length === 0 ? (
//           <div className="bg-white rounded-xl shadow p-12 text-center">
//             <p className="text-gray-400 text-lg mb-4">No hubbers added yet</p>
//             <a href="/admin/users/add" className="bg-[#cee4B8] text-black px-4 py-2 rounded-lg hover:bg-[#76bcad] hover:text-white">
//               Add your first hubber
//             </a>
//           </div>
//         ) : (
//           <div className="bg-white rounded-xl shadow overflow-hidden">
//             <table className="w-full">
//               <thead className="bg-gray-50 border-b">
//                 <tr>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Profile Picture</th>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">ID</th>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Grade</th>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Component</th>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
//                   <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {users.map(user => (
//                   <tr key={user.id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4">
//                       {user.photo_url ? (
//                         <img
//                           src={user.photo_url}
//                           alt={user.first_name}
//                           className="w-10 h-10 rounded-full object-cover"
//                         />
//                       ) : (
//                         <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
//                           👤
//                         </div>
//                       )}
//                     </td>
//                     <td className="px-6 py-4 text-sm font-medium text-gray-800">
//                       {user.custom_id}
//                     </td>
//                     <td className="px-6 py-4 text-sm text-gray-800">
//                       {user.first_name} {user.last_name}
//                     </td>
//                     {/* <td className="px-6 py-4 text-sm text-gray-600">
//                       Grade {user.grade_level}
//                     </td> */}
//                     <td className="px-6 py-4 text-sm text-gray-600">
//                       {isNaN(parseInt(user.grade_level))
//                         ? user.grade_level
//                         : `Grade ${user.grade_level}`}
//                     </td>
//                     <td className="px-6 py-4 text-sm text-gray-600">
//                       {user.spaces?.space_name}
//                     </td>
//                     <td className="px-6 py-4">
//                       <span className={`text-xs px-2 py-1 rounded-full font-medium ${
//                         user.is_active
//                           ? 'bg-green-100 text-green-700'
//                           : 'bg-red-100 text-red-700'
//                       }`}>
//                         {user.is_active ? 'Active' : 'Inactive'}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4">
//                         <div className="flex gap-3">
//                             <button
//                             onClick={() => setSelectedUser(user)}
//                             className="text-blue-600 hover:text-blue-800 text-sm font-medium"
//                             >
//                             View QR
//                             </button>
//                         < a href={`/admin/users/${user.id}/edit`}
//                         className="text-green-600 hover:text-green-800 text-sm font-medium"
//                         >
//                         Edit
//                         </a>
//                     </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* QR Code Modal */}
//         {selectedUser && (
//           <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">

//               {/* Printable/downloadable area */}
//                   <div ref={qrRef} className="text-center p-4 bg-white">
//                     <h2 className="text-xl font-bold text-black mb-1">
//                       {selectedUser.first_name} {selectedUser.last_name}
//                     </h2>
//                     <p className="text-black text-sm mb-4">
//                       {selectedUser.custom_id}
//                     </p>
//                     <div className="flex justify-center mb-4">
//                       <QRCode value={selectedUser.qr_code} size={200} />
//                     </div>
//                     {/* <p className="text-black text-xs">
//                       {selectedUser.spaces?.space_name} — Grade {selectedUser.grade_level}
//                     </p> */}
//                     <p className="text-black text-xs">
//                       {selectedUser.spaces?.space_name} — {isNaN(parseInt(selectedUser.grade_level)) ? selectedUser.grade_level : `Grade ${selectedUser.grade_level}`}
//                     </p>
//                   </div>

//               {/* Buttons */}
//               <div className="flex gap-3 mt-4">
//               <button
//                 onClick={handleDownloadPng}
//                 className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
//               >
//                 Download PNG
//               </button>
//               <button
//                 onClick={handlePrint}
//                 className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
//               >
//               Print
//               </button>
//               <button
//                 onClick={() => setSelectedUser(null)}
//                 className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
//               >
//                 Close
//               </button>
//             </div>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   </AdminGuard>
//   )
// }