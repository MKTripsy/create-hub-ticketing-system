export type Space = {
  id: number
  space_name: string
}

export type User = {
  id: number
  custom_id: string
  first_name: string
  last_name: string
  grade_level: string
  space_id: number
  spaces: Space | null
}

export type TimeSlot = {
  id: number
  label: string
  start_time: string
  end_time: string
}

export type SurveyOption = {
  id: number
  label: string
}

export type AttendanceSession = {
  id: number
  time_started: string
}

export type ScanState =
  | 'idle'
  | 'scanning'
  | 'manual'
  | 'pre_survey'
  | 'post_survey'
  | 'clocked_in'
  | 'clocked_out'
  | 'not_found'
  | 'not_available'
  | 'already_clocked_in'