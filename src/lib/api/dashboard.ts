import { supabase } from '@/lib/supabase'

export type SpaceItem = { id: number; space_name: string }
export type DailyAttendance = { day: string; [key: string]: number | string }
export type SpaceDistribution = { name: string; value: number }
export type Notification = { id: number; type: string; message: string; created_at: string }

export type SurveyOptionCount = { label: string; count: number }
export type SurveyQuestionSummary = {
  question_id: number
  question_text: string
  answer_type: 'multiple_choice' | 'open_ended'
  survey_type: 'pre' | 'post'
  option_counts: SurveyOptionCount[]   // multiple choice
  open_responses: string[]             // open ended
}

const getWeekDates = (weekOffset = 0) => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - dayOfWeek - weekOffset * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
    return date.toISOString().split('T')[0]
  })
}

export const getWeekBounds = (weekOffset = 0): { start: string; end: string } => {
  const dates = getWeekDates(weekOffset)
  return { start: dates[0], end: dates[6] }
}

const getDayLabel = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export const fetchDashboardSpaces = async (orphanageId: number): Promise<SpaceItem[]> => {
  const { data } = await supabase
    .from('spaces')
    .select('id, space_name')
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)
    .order('id') 
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
  spacesData: SpaceItem[],
  weekOffset = 0
): Promise<DailyAttendance[]> => {
  const weekDates = getWeekDates(weekOffset)
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

export const fetchWeeklySurveyData = async (
  spaceIds: number[],
  weekOffset = 0
): Promise<SurveyQuestionSummary[]> => {
  const { start, end } = getWeekBounds(weekOffset)

  // 1. Get all sessions in this week's date range
  const { data: sessions } = await supabase
    .from('attendance_session')
    .select('id')
    .in('accessed_space', spaceIds.length > 0 ? spaceIds : [0])
    .gte('date', start)
    .lte('date', end)

  if (!sessions || sessions.length === 0) return []
  const sessionIds = sessions.map(s => s.id)

  // 2. Get all survey responses for those sessions, joining questions and options
  const { data: responses } = await supabase
    .from('survey_responses')
    .select(`
      session_id,
      text_response,
      survey_questions (
        id,
        question_text,
        answer_type,
        survey_type
      ),
      survey_question_options (
        label
      )
    `)
    .in('session_id', sessionIds)

  if (!responses) return []

  // 3. Aggregate by question
  const questionMap = new Map<number, SurveyQuestionSummary>()

  for (const r of responses as any[]) {
    const q = r.survey_questions
    if (!q) continue

    if (!questionMap.has(q.id)) {
      questionMap.set(q.id, {
        question_id: q.id,
        question_text: q.question_text,
        answer_type: q.answer_type,
        survey_type: q.survey_type,
        option_counts: [],
        open_responses: [],
      })
    }

    const summary = questionMap.get(q.id)!

    if (q.answer_type === 'open_ended') {
      if (r.text_response) summary.open_responses.push(r.text_response)
    } else {
      const label = r.survey_question_options?.label
      if (label) {
        const existing = summary.option_counts.find(o => o.label === label)
        if (existing) existing.count++
        else summary.option_counts.push({ label, count: 1 })
      }
    }
  }

  // Sort option_counts by count descending
  const result = Array.from(questionMap.values())
  result.forEach(q => {
    q.option_counts.sort((a, b) => b.count - a.count)
  })

  return result
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