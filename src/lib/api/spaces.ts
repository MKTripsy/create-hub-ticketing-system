import { supabase } from '@/lib/supabase'

export type Space = {
  id: number
  space_name: string
  grades: string[]
}

export type TimeSlot = {
  id: number
  label: string
  start_time?: string
  end_time?: string
}

export type SpaceTimeslotLimit = {
  time_slot_id: number
  max_users: number
  day_counts: Record<string, number>
}

export type SpaceScheduleData = {
  days: string[]
  slots: TimeSlot[]
  limits: SpaceTimeslotLimit[]
}

export const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const sortDays = (days: string[]) =>
  [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))

export async function fetchSpacesWithGrades(orphanage_id: number): Promise<Space[]> {
  const { data: spacesData } = await supabase
    .from('spaces')
    .select('*')
    .eq('is_active', true)
    .eq('orphanage_id', orphanage_id)

  if (!spacesData) return []

  return Promise.all(
    spacesData.map(async (space) => {
      const { data: gradesData } = await supabase
        .from('space_grades')
        .select('grade')
        .eq('space_id', space.id)
      return { ...space, grades: gradesData?.map((g: { grade: string }) => g.grade) || [] }
    })
  )
}

export async function fetchSpaceSchedule(
  spaceId: number,
  excludeUserId?: number
): Promise<SpaceScheduleData> {
  const [daysRes, slotsRes, limitsRes] = await Promise.all([
    supabase.from('space_operating_days').select('day').eq('space_id', spaceId).order('id'),
    supabase.from('time_slots').select('*').eq('is_active', true).eq('space_id', spaceId).order('start_time'),
    supabase.from('space_timeslot_limits').select('time_slot_id, max_users').eq('space_id', spaceId),
  ])

  const days = daysRes.data ? sortDays(daysRes.data.map((d: { day: string }) => d.day)) : []
  const slots = slotsRes.data || []

  const limits = await Promise.all(
    (limitsRes.data || []).map(async (limit) => {
      let query = supabase
        .from('availability')
        .select('user_id, day')
        .eq('time_slot_id', limit.time_slot_id)
        .eq('space_id', spaceId)

      if (excludeUserId !== undefined) {
        query = query.neq('user_id', excludeUserId)
      }

      const { data: rows } = await query

      const day_counts: Record<string, number> = {}
      rows?.forEach((row: { user_id: number; day: string }) => {
        day_counts[row.day] = (day_counts[row.day] ?? 0) + 1
      })

      return { time_slot_id: limit.time_slot_id, max_users: limit.max_users, day_counts }
    })
  )

  return { days, slots, limits }
}