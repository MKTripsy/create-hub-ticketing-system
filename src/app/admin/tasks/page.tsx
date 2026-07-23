'use client'

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'
import {
  Task, TaskStatus,
  fetchTasks, fetchAllAdmins,
  updateTaskStatus, deleteTask,
  formatDueDate, isDueToday, isOverdue
} from '@/lib/api/tasks'
import TaskModal from '@/components/tasks/TaskModal'
import { createNotification } from '@/lib/notifications'

const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'Doing', 'Done']

const statusColors: Record<TaskStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-600',
  'Doing': 'bg-blue-50 text-blue-600',
  'Done': 'bg-green-50 text-green-600',
}

async function sendTaskNotification(
  type: 'created' | 'completed',
  task: Task
) {
  console.log('sendTaskNotification called:', type, task.title)
  try {
    await fetch('/api/tasks/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        task: {
          title: task.title,
          description: task.description,
          due_date: task.due_date
            ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })
            : null,
          status: task.status,
        },
        assignees: task.assignees.map(a => ({
          name: `${a.first_name} ${a.last_name}`,
          email: a.email,
        })),
        creator: task.creator
          ? {
              name: `${task.creator.first_name} ${task.creator.last_name}`,
              email: task.creator.email,
            }
          : null,
      })
    })
    console.log('notify fetch completed')
  } catch (err) {
    console.error('Notification error:', err)
  }
}

export default function TasksPage() {
  const { admin, isLoading } = useAuth()
  const orphanageId = admin?.orphanage_id ?? null

  const [tasks, setTasks] = useState<Task[]>([])
  const [allAdmins, setAllAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')

  const load = async () => {
    if (!orphanageId) return
    setLoading(true)
    const [t, a] = await Promise.all([
      fetchTasks(orphanageId),
      fetchAllAdmins(orphanageId),
    ])
    setTasks(t)
    setAllAdmins(a)
    setLoading(false)
  }

  useEffect(() => {
    if (isLoading || !orphanageId) return
    load()
  }, [orphanageId, isLoading])

  const handleNew = () => {
    setEditingTask(undefined)
    setShowModal(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    const task = tasks.find(t => t.id === id)  // ← move this up
    const { error } = await deleteTask(id)
    if (error) { alert('Something went wrong.'); return }
    await createNotification('task_deleted', `${admin?.first_name} ${admin?.last_name} deleted task "${task?.title}"`, orphanageId ?? undefined)
    load() 
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return
    if (!orphanageId) return
    const { error } = await updateTaskStatus(task.id, newStatus)
    if (error) { alert('Something went wrong.'); return }

    const refreshed = await fetchTasks(orphanageId)
    setTasks(refreshed)

    // Log all status changes
    await createNotification(
        newStatus === 'Done' ? 'task_completed' : 'task_edited',
        `${admin?.first_name} ${admin?.last_name} changed task "${task.title}" to ${newStatus}`,
        orphanageId
    )

    // Email only on Done
    if (newStatus === 'Done') {
        const updatedTask = refreshed.find(t => t.id === task.id)
        if (updatedTask) await sendTaskNotification('completed', updatedTask)
    }
   }

    const handleModalSuccess = async (taskId: number, isNew: boolean, prevStatus?: TaskStatus) => {
        await load()
        const refreshed = await fetchTasks(orphanageId!)
        const updatedTask = refreshed.find(t => t.id === taskId)

        if (isNew) {
            if (updatedTask) await sendTaskNotification('created', updatedTask)
            await createNotification('task_created', `${admin?.first_name} ${admin?.last_name} created task "${updatedTask?.title}" assigned to ${updatedTask?.assignees.map(a => `${a.first_name} ${a.last_name}`).join(', ') || 'no one'}`, orphanageId ?? undefined)
        } else {
            await createNotification('task_edited', `${admin?.first_name} ${admin?.last_name} edited task "${updatedTask?.title}"`, orphanageId ?? undefined)
            if (updatedTask?.status === 'Done' && prevStatus !== 'Done') {
            await sendTaskNotification('completed', updatedTask)
            }
        }
    }

  const filtered = filterStatus
    ? tasks.filter(t => t.status === filterStatus)
    : tasks

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
            <div className="flex gap-3">
              <button onClick={handleNew}
                className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
                + New Task
              </button>
              <button onClick={load}
                className="text-[#FF6347] hover:text-[#414141] px-4 py-2 text-sm font-bold">
                ⟳ Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 font-medium">Filter by status:</span>
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filterStatus === ''
                  ? 'bg-[#FF6347] text-white border-[#FF6347]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              All
            </button>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  filterStatus === s
                    ? 'bg-[#FF6347] text-white border-[#FF6347]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400">Loading tasks...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">No tasks found</p>
              <p className="text-gray-300 text-sm">Create a new task to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Task</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created By</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(task => {
                      const overdue = isOverdue(task.due_date, task.status)
                      const dueToday = isDueToday(task.due_date) && task.status !== 'Done'
                      return (
                        <tr key={task.id} className="hover:bg-gray-50">

                          {/* Title + description */}
                          <td className="px-6 py-4 max-w-[220px]">
                            <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                            )}
                          </td>

                          {/* Assignees */}
                          <td className="px-6 py-4">
                            {task.assignees.length === 0 ? (
                              <span className="text-gray-300 text-sm">—</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {task.assignees.map(a => (
                                  <span key={a.id} className="text-xs text-gray-600">
                                    {a.first_name} {a.last_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Due date */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${
                              overdue ? 'text-red-500 font-medium' :
                              dueToday ? 'text-orange-500 font-medium' :
                              'text-gray-600'
                            }`}>
                              {formatDueDate(task.due_date)}
                              {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                              {dueToday && <span className="ml-1 text-xs">(Today)</span>}
                            </span>
                          </td>

                          {/* Status dropdown */}
                          <td className="px-6 py-4">
                            <select
                              value={task.status}
                              onChange={e => handleStatusChange(task, e.target.value as TaskStatus)}
                              className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF6347] ${statusColors[task.status]}`}
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>

                          {/* Creator */}
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {task.creator
                              ? `${task.creator.first_name} ${task.creator.last_name}`
                              : '—'}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex gap-3">
                              <button onClick={() => handleEdit(task)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(task.id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
                Showing {filtered.length} task{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && orphanageId !== null && admin && (
        <TaskModal
          orphanageId={orphanageId}
          createdBy={admin.id}
          allAdmins={allAdmins}
          task={editingTask}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </AdminGuard>
  )
}