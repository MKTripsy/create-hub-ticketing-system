'use client'

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'
import { NotificationItem, fetchNotificationsList } from '@/lib/api/notifications'
import NotificationFilters from '@/components/notifications/NotificationFilters'
import NotificationList from '@/components/notifications/NotificationList'
import NotificationExport from '@/components/notifications/NotificationExport'

export default function NotificationsPage() {
  const { admin, isLoading } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const loadNotifications = async () => {
    if (!admin?.orphanage_id) return
    setLoading(true)
    const data = await fetchNotificationsList(
      admin.orphanage_id, filterType, filterDateFrom, filterDateTo
    )
    setNotifications(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isLoading || !admin?.orphanage_id) return
    loadNotifications()
  }, [admin?.orphanage_id, isLoading])

  const handleReset = () => {
    setFilterType('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setTimeout(loadNotifications, 50)
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
            <NotificationExport
              notifications={notifications}
              filterType={filterType}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
            />
          </div>

          <NotificationFilters
            filterType={filterType}
            filterDateFrom={filterDateFrom}
            filterDateTo={filterDateTo}
            onFilterType={setFilterType}
            onFilterDateFrom={setFilterDateFrom}
            onFilterDateTo={setFilterDateTo}
            onApply={loadNotifications}
            onReset={handleReset}
          />

          <p className="text-sm text-gray-500 mb-3">
            {notifications.length} activity log{notifications.length !== 1 ? 's' : ''} found
          </p>

          <NotificationList notifications={notifications} loading={loading} />

        </div>
      </div>
    </AdminGuard>
  )
}