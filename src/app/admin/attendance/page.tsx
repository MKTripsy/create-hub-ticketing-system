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

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [filterSpace, setFilterSpace] = useState('')
  const [searchName, setSearchName] = useState('')
  const [spaces, setSpaces] = useState<{ id: number; space_name: string }[]>([])

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

  // Filter by name
  const filteredLogs = logs.filter(log => {
    if (!searchName) return true
    const fullName = `${log.users?.first_name} ${log.users?.last_name}`.toLowerCase()
    return fullName.includes(searchName.toLowerCase())
  })

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
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
            <h1 className="text-2xl font-bold text-gray-800">
              Attendance Logs
            </h1>
            <button
              onClick={fetchLogs}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
            >
              🔄 Refresh
            </button>
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

            {/* Filter by space */}
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-black mb-1">
                Filter by space
              </label>
              <select
                value={filterSpace}
                onChange={e => setFilterSpace(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Spaces</option>
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
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Space</th>
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
    </AdminGuard>
  )
}