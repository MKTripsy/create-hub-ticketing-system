'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/components/AdminGuard'

type AttendanceLog = {
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
  pre_survey: string | null
  post_survey: string | null
}

type User = {
  id: number
  first_name: string
  last_name: string
  custom_id: string
}

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [filterSpace, setFilterSpace] = useState('')
  const [searchName, setSearchName] = useState('')
  const [spaces, setSpaces] = useState<{ id: number; space_name: string }[]>([])
  const [showManualModal, setShowManualModal] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [manualForm, setManualForm] = useState({
    user_id: '',
    space_id: '',
    date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' }),
    time_started: '',
    time_ended: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)

    // Fetch attendance sessions
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
      .order('time_started', { ascending: false })

    if (filterDate) query = query.eq('date', filterDate)
    if (filterSpace) query = query.eq('accessed_space', parseInt(filterSpace))

    const { data, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      setLoading(false)
      return
    }

    // Fetch survey responses for each session
    const logsWithSurveys = await Promise.all(
      (data ?? []).map(async (log) => {
        const { data: surveys } = await supabase
          .from('survey_responses')
          .select(`
            type,
            survey_options (
              label
            )
          `)
          .eq('session_id', log.id)

        const preSurvey = surveys?.find(s => s.type === 'pre')
        const postSurvey = surveys?.find(s => s.type === 'post')

        return {
          ...log,
          pre_survey: (preSurvey?.survey_options as any)?.label || null,
          post_survey: (postSurvey?.survey_options as any)?.label || null,
        }
      })
    )

    setLogs(logsWithSurveys as unknown as AttendanceLog[])
    setLoading(false)
  }

  const fetchSpaces = async () => {
    const { data } = await supabase
      .from('spaces')
      .select('id, space_name')
      .eq('is_active', true)
    if (data) setSpaces(data)
  }

  useEffect(() => {
    fetchSpaces()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [filterDate, filterSpace])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return

    // Delete survey responses first
    await supabase
      .from('survey_responses')
      .delete()
      .eq('session_id', id)

    // Delete attendance session
    const { error } = await supabase
      .from('attendance_session')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Something went wrong. Please try again.')
      return
    }

    fetchLogs()
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, custom_id')
      .eq('is_active', true)
      .order('first_name')
    if (data) setUsers(data)
  }

  useEffect(() => {
    fetchSpaces()
    fetchUsers()
  }, [])

  const handleManualEntry = async () => {
    if (!manualForm.user_id || !manualForm.space_id || !manualForm.date || !manualForm.time_started) {
      alert('Please fill in all required fields.')
      return
    }

    setSubmitting(true)

    try {
      const timeStarted = `${manualForm.date}T${manualForm.time_started}`
      const timeEnded = manualForm.time_ended
        ? `${manualForm.date}T${manualForm.time_ended}`
        : null

      const { error } = await supabase
        .from('attendance_session')
        .insert({
          user_id: parseInt(manualForm.user_id),
          accessed_space: parseInt(manualForm.space_id),
          date: manualForm.date,
          time_started: timeStarted,
          time_ended: timeEnded,
          availability_id: null,
        })

      if (error) throw error

      alert('Manual entry added successfully!')
      setShowManualModal(false)
      setManualForm({
        user_id: '',
        space_id: '',
        date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' }),
        time_started: '',
        time_ended: '',
      })
      fetchLogs()

    } catch (error) {
      console.error('Manual entry error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter by name
  const filteredLogs = logs.filter(log => {
    if (!searchName) return true
    const fullName = `${log.users?.first_name} ${log.users?.last_name}`.toLowerCase()
    return fullName.includes(searchName.toLowerCase())
  })

  // const formatTime = (timestamp: string) => {
  //   return new Date(timestamp).toLocaleTimeString([], {
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   })
  // }

  const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila'
  })
}

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Still clocked in'
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Attendance Logs</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowManualModal(true)}
                className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium"
              >
                 Manual Entry
              </button>
              <button
                onClick={fetchLogs}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                 Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4">

            {/* Search by name */}
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-black mb-1">
                Search by name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="e.g. Juan"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by date */}
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-black mb-1">
                Filter by date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by component (space) */}
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-black mb-1">
                Filter by Component
              </label>
              <select
                value={filterSpace}
                onChange={e => setFilterSpace(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Components</option>
                {spaces.map(space => (
                  <option key={space.id} value={space.id}>
                    {space.space_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterDate('')
                  setFilterSpace('')
                  setSearchName('')
                }}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                Clear Filters
              </button>
            </div>

          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">No attendance records found</p>
              <p className="text-gray-300 text-sm">
                Try adjusting your filters or check a different date
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Clock In</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pre Survey</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Post Survey</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {log.users?.first_name} {log.users?.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.users?.custom_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.spaces?.space_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.date}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTime(log.time_started)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.time_ended
                            ? formatTime(log.time_ended)
                            : <span className="text-green-600 font-medium">Active</span>
                          }
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDuration(log.time_started, log.time_ended)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.pre_survey || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.post_survey || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary footer */}
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
                Showing {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}
              </div>

            </div>
          )}
        </div>
      </div>
      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Manual Attendance Entry
            </h3>

            <div className="space-y-4">

              {/* User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualForm.user_id}
                  onChange={e => setManualForm({ ...manualForm, user_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.custom_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Space */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualForm.space_id}
                  onChange={e => setManualForm({ ...manualForm, space_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                >
                  <option value="">Select Component</option>
                  {spaces.map(space => (
                    <option key={space.id} value={space.id}>
                      {space.space_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>

              {/* Time In */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time In <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={manualForm.time_started}
                  onChange={e => setManualForm({ ...manualForm, time_started: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>

              {/* Time Out */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Out <span className="text-red-500 text-xs">*</span>
                </label>
                <input
                  type="time"
                  value={manualForm.time_ended}
                  onChange={e => setManualForm({ ...manualForm, time_ended: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleManualEntry}
                disabled={submitting}
                className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Entry'}
              </button>
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminGuard>
  )
}