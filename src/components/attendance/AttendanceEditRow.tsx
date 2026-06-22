'use client'

import { AttendanceLog, AttendanceUser, AttendanceSpace } from '@/lib/api/attendance'

type EditForm = {
  user_id: string
  space_id: string
  date: string
  time_started: string
  time_ended: string
}

type Props = {
  log: AttendanceLog
  editForm: EditForm
  users: AttendanceUser[]
  spaces: AttendanceSpace[]
  onFormChange: (form: EditForm) => void
  onSave: () => void
  onCancel: () => void
}

export default function AttendanceEditRow({
  log, editForm, users, spaces, onFormChange, onSave, onCancel
}: Props) {
  return (
    <>
      <td className="px-4 py-2">
        <select value={editForm.user_id}
          onChange={e => onFormChange({ ...editForm, user_id: e.target.value })}
          className="w-full border border-[#FF6347] rounded px-2 py-1 text-xs text-black focus:outline-none">
          <option value="">Select user</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-xs text-gray-400">{log.users?.custom_id}</td>
      <td className="px-4 py-2">
        <select value={editForm.space_id}
          onChange={e => onFormChange({ ...editForm, space_id: e.target.value })}
          className="w-full border border-[#FF6347] rounded px-2 py-1 text-xs text-black focus:outline-none">
          <option value="">Select space</option>
          {spaces.map(space => (
            <option key={space.id} value={space.id}>{space.space_name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <input type="date" value={editForm.date}
          onChange={e => onFormChange({ ...editForm, date: e.target.value })}
          className="w-full border border-[#FF6347] rounded px-2 py-1 text-xs text-black focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="time" value={editForm.time_started}
          onChange={e => onFormChange({ ...editForm, time_started: e.target.value })}
          className="w-full border border-[#FF6347] rounded px-2 py-1 text-xs text-black focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="time" value={editForm.time_ended}
          onChange={e => onFormChange({ ...editForm, time_ended: e.target.value })}
          className="w-full border border-[#FF6347] rounded px-2 py-1 text-xs text-black focus:outline-none" />
      </td>
      <td className="px-4 py-2 text-xs text-gray-400">—</td>
      <td className="px-4 py-2 text-xs text-gray-400">—</td>
      <td className="px-4 py-2 text-xs text-gray-400">—</td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button onClick={onSave} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xs font-medium">Cancel</button>
        </div>
      </td>
    </>
  )
}