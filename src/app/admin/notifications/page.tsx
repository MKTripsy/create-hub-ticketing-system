'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Notification = {
  id: number
  type: string
  message: string
  created_at: string
}

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'clock_in', label: 'Clock In' },
  { value: 'clock_out', label: 'Clock Out' },
  { value: 'user_added', label: 'User Added' },
  { value: 'user_edited', label: 'User Edited' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'manual_entry', label: 'Manual Entry' },
  { value: 'attendance_edited', label: 'Attendance Edited' },
  { value: 'attendance_deleted', label: 'Attendance Deleted' },
  { value: 'system', label: 'System' },
]

const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'user_added': return 'bg-green-50 text-green-700'
    case 'user_edited': return 'bg-blue-50 text-blue-700'
    case 'user_deleted': return 'bg-red-50 text-red-700'
    case 'clock_in': return 'bg-green-50 text-green-700'
    case 'clock_out': return 'bg-gray-50 text-gray-700'
    case 'manual_entry': return 'bg-yellow-50 text-yellow-700'
    case 'attendance_edited': return 'bg-blue-50 text-blue-700'
    case 'attendance_deleted': return 'bg-red-50 text-red-700'
    case 'system': return 'bg-purple-50 text-purple-700'
    default: return 'bg-gray-50 text-gray-700'
  }
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'user_added': return '👤'
    case 'user_edited': return '✏️'
    case 'user_deleted': return '🗑️'
    case 'clock_in': return '✅'
    case 'clock_out': return '🚪'
    case 'manual_entry': return '📝'
    case 'attendance_edited': return '🔧'
    case 'attendance_deleted': return '❌'
    case 'system': return '⚙️'
    default: return '🔔'
  }
}

export default function NotificationsPage() {
  const { admin, isLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const fetchNotifications = async () => {
    if (!admin?.orphanage_id) return
    setLoading(true)

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('orphanage_id', admin.orphanage_id)
      .order('created_at', { ascending: false })

    if (filterType !== 'all') {
      query = query.eq('type', filterType)
    }

    if (filterDateFrom) {
      query = query.gte('created_at', `${filterDateFrom}T00:00:00`)
    }

    if (filterDateTo) {
      query = query.lte('created_at', `${filterDateTo}T23:59:59`)
    }

    const { data } = await query
    if (data) setNotifications(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isLoading || !admin?.orphanage_id) return
    fetchNotifications()
  }, [admin?.orphanage_id, isLoading])

  const handleExportCSV = () => {
    if (notifications.length === 0) {
      alert('No notifications to export.')
      return
    }

    const headers = ['ID', 'Type', 'Message', 'Date & Time']
    const rows = notifications.map(n => [
      n.id,
      n.type,
      `"${n.message.replace(/"/g, '""')}"`,  // escape quotes
      new Date(n.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `notifications-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    if (notifications.length === 0) {
        alert('No notifications to export.')
        return
    }

    const doc = new jsPDF()

    // Title
    doc.setFontSize(16)
    doc.text('Notifications Report', 14, 15)

    // Subtitle with filters info
    doc.setFontSize(10)
    doc.setTextColor(120)
    const filterInfo = [
        filterType !== 'all' ? `Type: ${NOTIFICATION_TYPES.find(t => t.value === filterType)?.label}` : null,
        filterDateFrom ? `From: ${filterDateFrom}` : null,
        filterDateTo ? `To: ${filterDateTo}` : null,
    ].filter(Boolean).join('  |  ')
    doc.text(filterInfo || 'All notifications', 14, 23)
    doc.text(`Exported: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, 14, 29)
    doc.text(`Total: ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`, 14, 35)

    // Table
    autoTable(doc, {
        startY: 40,
        head: [['Type', 'Message', 'Date & Time']],
        body: notifications.map(n => [
        NOTIFICATION_TYPES.find(t => t.value === n.type)?.label || n.type,
        n.message,
        new Date(n.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [255, 99, 71] },  // #FF6347
        columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 110 },
        2: { cellWidth: 45 },
        },
    })

    const dateStr = new Date().toISOString().split('T')[0]
    doc.save(`notifications-${dateStr}.pdf`)
    }

  const handleReset = () => {
    setFilterType('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
        <div className="max-w-4xl mx-auto">

          {/* Header */}
            <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
                <div className="flex gap-2">
                    <button
                    onClick={handleExportCSV}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-medium"
                    >
                    Export CSV
                    </button>
                    <button
                    onClick={handleExportPDF}
                    className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium"
                    >
                    Export PDF
                    </button>
                </div>
            </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Type filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                >
                  {NOTIFICATION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>

              {/* Date to */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={fetchNotifications}
                  className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium"
                >
                  Apply
                </button>
                <button
                  onClick={() => { handleReset(); setTimeout(fetchNotifications, 50) }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Count */}
          <p className="text-sm text-gray-500 mb-3">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} found
          </p>

          {/* Notifications List */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {loading ? (
              <p className="text-gray-400 text-center py-12">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No notifications found</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(note => (
                  <div key={note.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getNotificationStyle(note.type)}`}>
                          {NOTIFICATION_TYPES.find(t => t.value === note.type)?.label || note.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{note.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(note.created_at).toLocaleString('en-PH', {
                          timeZone: 'Asia/Manila',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminGuard>
  )
}