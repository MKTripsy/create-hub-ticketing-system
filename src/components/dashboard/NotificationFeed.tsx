'use client'

import { Notification, getNotificationStyle } from '@/lib/api/dashboard'

type Props = {
  notifications: Notification[]
  onRefresh: () => void
}

export default function NotificationFeed({ notifications, onRefresh }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
        <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600">
          Refresh
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No notifications yet</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map(note => (
            <div key={note.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${getNotificationStyle(note.type)}`}>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800">{note.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(note.created_at).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
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
  )
}