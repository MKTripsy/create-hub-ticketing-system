'use client'

import { NotificationItem, NOTIFICATION_TYPES, getNotificationStyle } from '@/lib/api/notifications'

type Props = {
  notifications: NotificationItem[]
  loading: boolean
}

export default function NotificationList({ notifications, loading }: Props) {
  if (loading) return <p className="text-gray-400 text-center py-12">Loading...</p>
  if (notifications.length === 0) return <p className="text-gray-400 text-center py-12">No notifications found</p>

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
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
    </div>
  )
}