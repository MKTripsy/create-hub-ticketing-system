import { supabase } from '@/lib/supabase'

export type AttendanceLog = {
  id: number
  date: string
  time_started: string
  time_ended: string | null
  users: {
    first_name: string
    last_name: string
    custom_id: string
    grade_level: string
  } | null
  spaces: {
    space_name: string
  } | null
  pre_surveys: string[]
  post_surveys: string[]
}

export type AttendanceUser = {
  id: number
  first_name: string
  last_name: string
  custom_id: string
}

export type AttendanceSpace = {
  id: number
  space_name: string
}

// ── Fetch helpers ─────────────────────────────────────

export const fetchAttendanceSpaces = async (orphanageId: number): Promise<AttendanceSpace[]> => {
  const { data } = await supabase
    .from('spaces')
    .select('id, space_name')
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)
  return data || []
}

export const fetchAttendanceUsers = async (orphanageId: number): Promise<AttendanceUser[]> => {
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, custom_id')
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)
    .order('first_name')
  return data || []
}

export const fetchSurveyResponses = async (sessionId: number) => {
  const { data: responses } = await supabase
    .from('survey_responses')
    .select(`
      question_id,
      option_id,
      text_response,
      survey_questions (
        question_text,
        answer_type,
        survey_type
      ),
      survey_question_options (
        label
      )
    `)
    .eq('session_id', sessionId)

  const preSurveys: string[] = []
  const postSurveys: string[] = []

  if (responses) {
    responses.forEach((r: any) => {
      const surveyType = r.survey_questions?.survey_type
      const questionText = r.survey_questions?.question_text
      const answerType = r.survey_questions?.answer_type
      const answerText = answerType === 'open_ended'
        ? r.text_response || ''
        : r.survey_question_options?.label || ''
      const formatted = `${questionText}: ${answerText}`
      if (surveyType === 'pre') preSurveys.push(formatted)
      else if (surveyType === 'post') postSurveys.push(formatted)
    })
  }

  return { preSurveys, postSurveys }
}

export const fetchAttendanceLogs = async (
  orphanageId: number,
  filterDate: string,
  filterSpace: string
): Promise<AttendanceLog[]> => {
  const { data: spacesData } = await supabase
    .from('spaces')
    .select('id')
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)

  const spaceIds = spacesData?.map(s => s.id) || []
  if (spaceIds.length === 0) return []

  let query = supabase
    .from('attendance_session')
    .select(`
      id,
      date,
      time_started,
      time_ended,
      users (
        first_name,
        last_name,
        custom_id,
        grade_level
      ),
      spaces:accessed_space (
        space_name
      )
    `)
    .in('accessed_space', spaceIds)
    .order('time_started', { ascending: false })

  if (filterDate) query = query.eq('date', filterDate)
  if (filterSpace) query = query.eq('accessed_space', parseInt(filterSpace))

  const { data, error } = await query
  if (error || !data) return []

  const logsWithSurveys = await Promise.all(
    data.map(async (log) => {
      const { preSurveys, postSurveys } = await fetchSurveyResponses(log.id)
      return { ...log, pre_surveys: preSurveys, post_surveys: postSurveys }
    })
  )

  return logsWithSurveys as unknown as AttendanceLog[]
}

export const fetchAllAttendanceLogs = async (orphanageId: number): Promise<AttendanceLog[]> => {
  const { data: spacesData } = await supabase
    .from('spaces')
    .select('id')
    .eq('is_active', true)
    .eq('orphanage_id', orphanageId)

  const spaceIds = spacesData?.map(s => s.id) || []
  if (spaceIds.length === 0) return []

  const { data, error } = await supabase
    .from('attendance_session')
    .select(`
      id,
      date,
      time_started,
      time_ended,
      users (
        first_name,
        last_name,
        custom_id,
        grade_level
      ),
      spaces:accessed_space (
        space_name
      )
    `)
    .in('accessed_space', spaceIds)
    .order('time_started', { ascending: false })

  if (error || !data) return []

  const logsWithSurveys = await Promise.all(
    data.map(async (log) => {
      const { preSurveys, postSurveys } = await fetchSurveyResponses(log.id)
      return { ...log, pre_surveys: preSurveys, post_surveys: postSurveys }
    })
  )

  return logsWithSurveys as unknown as AttendanceLog[]
}

// ── Mutations ─────────────────────────────────────────

export const insertManualAttendance = async (payload: {
  user_id: number
  space_id: number
  date: string
  time_started: string
  time_ended: string | null
}) => {
  const { error } = await supabase
    .from('attendance_session')
    .insert({
      user_id: payload.user_id,
      accessed_space: payload.space_id,
      date: payload.date,
      time_started: `${payload.date}T${payload.time_started}`,
      time_ended: payload.time_ended ? `${payload.date}T${payload.time_ended}` : null,
      availability_id: null,
    })
  return { error }
}

export const updateAttendanceRecord = async (
  id: number,
  payload: {
    user_id: number
    space_id: number
    date: string
    time_started: string
    time_ended: string
  }
) => {
  const { error } = await supabase
    .from('attendance_session')
    .update({
      user_id: payload.user_id,
      accessed_space: payload.space_id,
      date: payload.date,
      time_started: `${payload.date}T${payload.time_started}`,
      time_ended: payload.time_ended ? `${payload.date}T${payload.time_ended}` : null,
    })
    .eq('id', id)
  return { error }
}

export const deleteAttendanceRecord = async (id: number) => {
  await supabase.from('survey_responses').delete().eq('session_id', id)
  const { error } = await supabase.from('attendance_session').delete().eq('id', id)
  return { error }
}

// ── Format helpers ────────────────────────────────────

export const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila'
  })
}

export const formatDuration = (start: string, end: string | null) => {
  if (!end) return 'Still clocked in'
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}