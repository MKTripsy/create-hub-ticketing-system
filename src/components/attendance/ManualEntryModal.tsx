'use client'

import { useState } from 'react'
import { AttendanceUser, AttendanceSpace, insertManualAttendance } from '@/lib/api/attendance'
import { createNotification } from '@/lib/notifications'
import { useAuth } from '@/context/AuthContext';

type Props = {
  users: AttendanceUser[]
  spaces: AttendanceSpace[]
  orphanageId: number
  onClose: () => void
  onSuccess: () => void
}

export default function ManualEntryModal({ users, spaces, orphanageId, onClose, onSuccess }: Props) {
  const { admin, isLoading } = useAuth()
  const [form, setForm] = useState({
    user_id: '',
    space_id: '',
    date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' }),
    time_started: '',
    time_ended: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.user_id || !form.space_id || !form.date || !form.time_started) {
      alert('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await insertManualAttendance({
        user_id: parseInt(form.user_id),
        space_id: parseInt(form.space_id),
        date: form.date,
        time_started: form.time_started,
        time_ended: form.time_ended || null,
      })
      if (error) throw error

      const user = users.find(u => u.id === parseInt(form.user_id))
      const userName = `${user?.first_name} ${user?.last_name}`
      if (!admin) return null
      await createNotification('manual_entry', `${admin.first_name} ${admin.last_name} added manual attendance entry for ${userName}`, orphanageId)

      alert('Manual entry added successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Manual entry error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Manual Attendance Entry</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User <span className="text-red-500">*</span></label>
            <select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]">
              <option value="">Select user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.custom_id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Component <span className="text-red-500">*</span></label>
            <select value={form.space_id} onChange={e => setForm({ ...form, space_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]">
              <option value="">Select Component</option>
              {spaces.map(space => (
                <option key={space.id} value={space.id}>{space.space_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time In <span className="text-red-500">*</span></label>
            <input type="time" value={form.time_started} onChange={e => setForm({ ...form, time_started: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Out</label>
            <input type="time" value={form.time_ended} onChange={e => setForm({ ...form, time_ended: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Entry'}
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}