import { supabase } from '@/lib/supabase'

export type NotificationItem = {
  id: number
  type: string
  message: string
  created_at: string
}

export const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'clock_in', label: 'Clock In' },
  { value: 'clock_out', label: 'Clock Out' },
  { value: 'user_added', label: 'User Added' },
  { value: 'user_edited', label: 'User Edited' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'manual_entry', label: 'Manual Entry' },
  { value: 'attendance_edited', label: 'Attendance Edited' },
  { value: 'attendance_deleted', label: 'Attendance Deleted' },
  // { value: 'system', label: 'System' },
]

export const getNotificationStyle = (type: string) => {
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

export const fetchNotificationsList = async (
  orphanageId: number,
  filterType: string,
  filterDateFrom: string,
  filterDateTo: string
): Promise<NotificationItem[]> => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('orphanage_id', orphanageId)
    .order('created_at', { ascending: false })

  if (filterType !== 'all') query = query.eq('type', filterType)
  if (filterDateFrom) query = query.gte('created_at', `${filterDateFrom}T00:00:00`)
  if (filterDateTo) query = query.lte('created_at', `${filterDateTo}T23:59:59`)

  const { data } = await query
  return data || []
}