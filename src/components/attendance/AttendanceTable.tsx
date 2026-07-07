'use client'

import { AttendanceLog, AttendanceUser, AttendanceSpace, formatTime, formatDuration } from '@/lib/api/attendance'
import AttendanceEditRow from './AttendanceEditRow'
import { useState } from 'react'

type EditForm = {
  user_id: string
  space_id: string
  date: string
  time_started: string
  time_ended: string
}

type Props = {
  logs: AttendanceLog[]
  users: AttendanceUser[]
  spaces: AttendanceSpace[]
  editingId: number | null
  editForm: EditForm
  onEditStart: (log: AttendanceLog) => void
  onEditFormChange: (form: EditForm) => void
  onEditSave: (id: number) => void
  onEditCancel: () => void
  onDelete: (id: number) => void
}

export default function AttendanceTable({
  logs, users, spaces, editingId, editForm,
  onEditStart, onEditFormChange, onEditSave, onEditCancel, onDelete
}: Props) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center">
        <p className="text-gray-400 text-lg mb-2">No attendance records found</p>
        <p className="text-gray-300 text-sm">Try adjusting your filters or check a different date</p>
      </div>
    )
  }

  function SurveyCell({ responses }: { responses: string[] }) {
    const [expanded, setExpanded] = useState(false)

    if (responses.length === 0) return <span className="text-gray-300">—</span>

    const preview = expanded ? responses : responses.slice(0, 1)

    return (
      <div className="space-y-1">
        {preview.map((s, i) => <p key={i} className="text-xs">{s}</p>)}
        {responses.length > 1 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-[#FF6347] hover:underline"
          >
            {expanded ? 'Hide' : `+${responses.length - 1} more`}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Component</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">In</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Out</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pre Survey</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Post Survey</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(log => (
              <tr key={log.id} className={`hover:bg-gray-50 ${editingId === log.id ? 'bg-blue-50' : ''}`}>
                {editingId === log.id ? (
                  <AttendanceEditRow
                    log={log}
                    editForm={editForm}
                    users={users}
                    spaces={spaces}
                    onFormChange={onEditFormChange}
                    onSave={() => onEditSave(log.id)}
                    onCancel={onEditCancel}
                  />
                ) : (
                  <>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {log.users?.first_name} {log.users?.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.users?.custom_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.spaces?.space_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatTime(log.time_started)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.time_ended
                        ? formatTime(log.time_ended)
                        : <span className="text-green-600 font-medium">Active</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDuration(log.time_started, log.time_ended)}
                    </td>
                    {/* Pre Survey */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <SurveyCell responses={log.pre_surveys} />
                    </td>
                    {/* Post Survey */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <SurveyCell responses={log.post_surveys} />
                    </td>
                    {/* <td className="px-6 py-4 text-sm text-gray-600">
                      {log.pre_surveys.length === 0
                        ? <span className="text-gray-300">—</span>
                        : <div className="space-y-1">{log.pre_surveys.map((s, i) => <p key={i} className="text-xs">{s}</p>)}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.post_surveys.length === 0
                        ? <span className="text-gray-300">—</span>
                        : <div className="space-y-1">{log.post_surveys.map((s, i) => <p key={i} className="text-xs">{s}</p>)}</div>}
                    </td> */}
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button onClick={() => onEditStart(log)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                        <button onClick={() => onDelete(log.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
        Showing {logs.length} record{logs.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}