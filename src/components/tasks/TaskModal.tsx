'use client'

import { useState } from 'react'
import { Task, TaskStatus, insertTask, updateTask } from '@/lib/api/tasks'

type AdminOption = {
  id: number
  first_name: string
  last_name: string
  email: string | null
}

type Props = {
  orphanageId: number
  createdBy: number
  allAdmins: AdminOption[]
  task?: Task
  onClose: () => void
  onSuccess: (taskId: number, isNew: boolean, prevStatus?: TaskStatus) => void
}

export default function TaskModal({
  orphanageId, createdBy, allAdmins, task, onClose, onSuccess
}: Props) {
  const isEdit = !!task

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'To Do')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(task?.assignees.map(a => a.id) ?? [])
  )
  const [submitting, setSubmitting] = useState(false)

  const toggleAssignee = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!title.trim()) { alert('Please enter a task title.'); return }
    setSubmitting(true)
    try {
      const assigneeIds = Array.from(selectedIds)
      const prevStatus = task?.status

      if (isEdit) {
        const { error } = await updateTask({
          id: task!.id, title, description, dueDate, status, assigneeIds
        })
        if (error) throw error
        onSuccess(task!.id, false, prevStatus)
      } else {
        const { error, taskId } = await insertTask({
          orphanageId, createdBy, title, description, dueDate, status, assigneeIds
        })
        if (error || !taskId) throw error
        onSuccess(taskId, true)
      }
      onClose()
    } catch (err) {
      console.error('Task save error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const statusOptions: TaskStatus[] = ['To Do', 'Doing', 'Done']
  const statusColors: Record<TaskStatus, string> = {
    'To Do': 'bg-gray-100 text-gray-700',
    'Doing': 'bg-blue-50 text-blue-600',
    'Done': 'bg-green-50 text-green-600',
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {isEdit ? 'Edit Task' : 'New Task'}
        </h3>

        <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] resize-none text-sm"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-2">
              {statusOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    status === s
                      ? `${statusColors[s]} border-current`
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            {allAdmins.length === 0 ? (
              <p className="text-xs text-gray-400">No admins found for this hub.</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                {allAdmins.map(admin => (
                  <label key={admin.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      selectedIds.has(admin.id)
                        ? 'border-[#FF6347] bg-[#FF6347]/5 text-[#FF6347] font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(admin.id)}
                      onChange={() => toggleAssignee(admin.id)}
                      className="accent-[#FF6347]"
                    />
                    {admin.first_name} {admin.last_name}
                    {!admin.email && (
                      <span className="text-xs text-gray-300 ml-auto">no email</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}