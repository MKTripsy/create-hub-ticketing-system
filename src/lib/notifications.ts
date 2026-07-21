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
  | 'hub_use_added'
  | 'hub_use_edited'
  | 'hub_use_deleted'
  | 'task_created'
  | 'task_edited'
  | 'task_deleted'
  | 'task_completed'

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