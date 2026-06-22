import { supabase } from '@/lib/supabase'

export type SpaceItem = { id: number; space_name: string }
export type DailyAttendance = { day: string; [key: string]: number | string }
export type SpaceDistribution = { name: string; value: number }
export type Notification = { id: number; type: string; message: string; created_at: string }

const getWeekDates = () => {
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

const getDayLabel = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export const fetchDashboardSpaces = async (orphanageId: number): Promise<SpaceItem[]> => {
  const { data } = await supabase
    .from('spaces')
    .select('id, space_name')
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)
  return data || []
}

export const fetchTotalUsers = async (orphanageId: number): Promise<number> => {
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)
  return count ?? 0
}

export const fetchTodaySessions = async (spaceIds: number[], today: string) => {
  const { data } = await supabase
    .from('attendance_session')
    .select(`id, time_ended, spaces:accessed_space ( space_name )`)
    .eq('date', today)
    .in('accessed_space', spaceIds.length > 0 ? spaceIds : [0])
  return data || []
}

export const fetchWeeklyAttendance = async (
  spaceIds: number[],
  spacesData: SpaceItem[]
): Promise<DailyAttendance[]> => {
  const weekDates = getWeekDates()
  return await Promise.all(
    weekDates.map(async (date) => {
      const { data: sessions } = await supabase
        .from('attendance_session')
        .select(`id, spaces:accessed_space ( space_name )`)
        .eq('date', date)
        .in('accessed_space', spaceIds.length > 0 ? spaceIds : [0])

      const dayCounts: Record<string, number> = {}
      spacesData.forEach(space => {
        dayCounts[space.space_name] = sessions?.filter(
          s => (s.spaces as any)?.space_name === space.space_name
        ).length ?? 0
      })
      return { day: getDayLabel(date), ...dayCounts }
    })
  )
}

export const fetchNotifications = async (orphanageId: number): Promise<Notification[]> => {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('orphanage_id', orphanageId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

export const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'user_added': return 'bg-green-50'
    case 'user_edited': return 'bg-blue-50'
    case 'user_deleted': return 'bg-red-50'
    case 'clock_in': return 'bg-green-50'
    case 'clock_out': return 'bg-gray-50'
    case 'manual_entry': return 'bg-yellow-50'
    case 'attendance_edited': return 'bg-blue-50'
    case 'attendance_deleted': return 'bg-red-50'
    case 'system': return 'bg-purple-50'
    default: return 'bg-gray-50'
  }
}