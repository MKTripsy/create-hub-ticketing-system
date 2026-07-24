import { supabase } from '@/lib/supabase'

export type TaskStatus = 'To Do' | 'Doing' | 'Done'

export type TaskAssignee = {
  id: number
  first_name: string
  last_name: string
  email: string | null
}

export type Task = {
  id: number
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null 
  status: TaskStatus
  orphanage_id: number
  created_by: number
  created_at: string
  creator: {
    id: number
    first_name: string
    last_name: string
    email: string | null
  } | null
  assignees: TaskAssignee[]
}

export const fetchTasks = async (orphanageId: number): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, title, description, due_date, due_time, status,
      orphanage_id, created_by, created_at,
      creator:created_by ( id, first_name, last_name, email )
    `)
    .eq('orphanage_id', orphanageId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const tasksWithAssignees = await Promise.all(
    data.map(async (task: any) => {
      const { data: assigneeRows } = await supabase
        .from('task_assignees')
        .select('admins ( id, first_name, last_name, email )')
        .eq('task_id', task.id)

      const assignees = (assigneeRows || [])
        .map((r: any) => r.admins)
        .filter(Boolean)

      return { ...task, assignees }
    })
  )

  return tasksWithAssignees as Task[]
}

export const insertTask = async (payload: {
  orphanageId: number
  createdBy: number
  title: string
  description: string
  dueDate: string
  dueTime: string
  status: TaskStatus
  assigneeIds: number[]
}) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      orphanage_id: payload.orphanageId,
      created_by: payload.createdBy,
      title: payload.title,
      description: payload.description || null,
      due_date: payload.dueDate || null,
      due_time: payload.dueTime || null, 
      status: payload.status,
    })
    .select('id')
    .single()

  if (error || !data) return { error, taskId: null }

  if (payload.assigneeIds.length > 0) {
    const { error: assigneeError } = await supabase
      .from('task_assignees')
      .insert(payload.assigneeIds.map(adminId => ({ task_id: data.id, admin_id: adminId })))
    if (assigneeError) return { error: assigneeError, taskId: null }
  }

  return { error: null, taskId: data.id }
}

export const updateTask = async (payload: {
  id: number
  title: string
  description: string
  dueDate: string
  dueTime: string
  status: TaskStatus
  assigneeIds: number[]
}) => {
  const { error } = await supabase
    .from('tasks')
    .update({
      title: payload.title,
      description: payload.description || null,
      due_date: payload.dueDate || null,
      due_time: payload.dueTime || null,
      status: payload.status,
    })
    .eq('id', payload.id)

  if (error) return { error }

  // Replace assignees
  await supabase.from('task_assignees').delete().eq('task_id', payload.id)
  if (payload.assigneeIds.length > 0) {
    const { error: assigneeError } = await supabase
      .from('task_assignees')
      .insert(payload.assigneeIds.map(adminId => ({ task_id: payload.id, admin_id: adminId })))
    if (assigneeError) return { error: assigneeError }
  }

  return { error: null }
}

export const updateTaskStatus = async (id: number, status: TaskStatus) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
  return { error }
}

export const deleteTask = async (id: number) => {
  await supabase.from('task_assignees').delete().eq('task_id', id)
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  return { error }
}

export const fetchAllAdmins = async (orphanageId: number) => {
  const { data } = await supabase
    .from('admins')
    .select('id, first_name, last_name, email')
    .or(`orphanage_id.eq.${orphanageId},role.eq.superadmin`)
    .order('first_name')
  return data || []
}

export const formatDueDate = (date: string | null, time: string | null): string => {
  if (!date) return '—'
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  return `${dateStr}`
}

export const formatDueTime = (time: string | null): string => {
  if (!time) return '-'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export const isDueToday = (date: string | null): boolean => {
  if (!date) return false
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })
  return date === today
}

export const isOverdue = (date: string | null, time: string | null, status: TaskStatus): boolean => {
  if (!date || status === 'Done') return false
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T')
  const dueDateTime = time ? `${date}T${time}` : `${date}T23:59:59`
  return now > dueDateTime
}