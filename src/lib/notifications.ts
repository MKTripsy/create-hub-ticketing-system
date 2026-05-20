import { supabase } from './supabase'

type NotificationType =
  | 'user_added'
  | 'user_edited'
  | 'user_deleted'
  | 'clock_in'
  | 'clock_out'
  | 'manual_entry'
  | 'attendance_edited'
  | 'attendance_deleted'
  | 'system'

export const createNotification = async (
  type: NotificationType,
  message: string,
  orphanageId?: number
) => {
  const { error } = await supabase
    .from('notifications')
    .insert({ type, message, orphanage_id: orphanageId || null })

  if (error) console.error('Notification error:', error)
}