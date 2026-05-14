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
  primary_space_id: number
  photo_url: string | null
  spaces: Space | null
}

export type TimeSlot = {
  id: number
  label: string
  start_time: string
  end_time: string
}

export type SurveyQuestionOption = {
  id: number
  question_id: number
  label: string
  order_index: number
}

export type SurveyQuestion = {
  id: number
  space_id: number
  question_text: string
  answer_type: 'radio' | 'checkbox' | 'open_ended'
  survey_type: 'pre' | 'post'
  order_index: number
  is_active: boolean
  options: SurveyQuestionOption[]
}

export type SurveyOption = {
  id: number
  label: string
}

export type AttendanceSession = {
  id: number
  time_started: string
  accessed_space?: number
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