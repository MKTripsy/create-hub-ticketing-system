'use client'

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'
import { createNotification } from '@/lib/notifications'
import {
  AttendanceLog, AttendanceUser, AttendanceSpace,
  fetchAttendanceLogs, fetchAttendanceSpaces, fetchAttendanceUsers,
  updateAttendanceRecord, deleteAttendanceRecord, formatTime
} from '@/lib/api/attendance'
import AttendanceFilters from '@/components/attendance/AttendanceFilters'
import AttendanceTable from '@/components/attendance/AttendanceTable'
import ManualEntryModal from '@/components/attendance/ManualEntryModal'
import ExportModal from '@/components/attendance/ExportModal'

type EditForm = {
  user_id: string
  space_id: string
  date: string
  time_started: string
  time_ended: string
}

export default function AttendanceLogsPage() {
  const { admin, isLoading } = useAuth()

  // Data
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [users, setUsers] = useState<AttendanceUser[]>([])
  const [spaces, setSpaces] = useState<AttendanceSpace[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchName, setSearchName] = useState('')
  // The Line below sets the default Date filter to the Current date. To re-implement that,
  // Uncomment the line below, then comment const [filterDate, setFilterDate] = useState('') 
  // const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDate, setFilterDate] = useState('')
  const [filterSpace, setFilterSpace] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    user_id: '', space_id: '', date: '', time_started: '', time_ended: ''
  })

  // Modals
  const [showManualModal, setShowManualModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Resolved orphanage ID (never null when guards pass)
  const orphanageId = admin?.orphanage_id ?? null

  // Fetch spaces and users
  useEffect(() => {
    if (isLoading || orphanageId === null) return
    fetchAttendanceSpaces(orphanageId).then(setSpaces)
    fetchAttendanceUsers(orphanageId).then(setUsers)
  }, [orphanageId, isLoading])

  // Fetch logs
  useEffect(() => {
    if (isLoading || orphanageId === null) return
    setLoading(true)
    fetchAttendanceLogs(orphanageId, filterDate, filterSpace)
      .then(data => { setLogs(data); setLoading(false) })
  }, [filterDate, filterSpace, orphanageId, isLoading])

  // Filter by name client-side
  const filteredLogs = logs.filter(log => {
    if (!searchName) return true
    const fullName = `${log.users?.first_name} ${log.users?.last_name}`.toLowerCase()
    return fullName.includes(searchName.toLowerCase())
  })

  const refreshLogs = () => {
    if (orphanageId === null) return
    fetchAttendanceLogs(orphanageId, filterDate, filterSpace).then(setLogs)
  }

  const handleEditStart = (log: AttendanceLog) => {
    setEditingId(log.id)
    setEditForm({
      user_id: users.find(u =>
        u.first_name === log.users?.first_name &&
        u.last_name === log.users?.last_name
      )?.id.toString() || '',
      space_id: spaces.find(s => s.space_name === log.spaces?.space_name)?.id.toString() || '',
      date: log.date,
      time_started: new Date(log.time_started).toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila'
      }),
      time_ended: log.time_ended
        ? new Date(log.time_ended).toLocaleTimeString('en-PH', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila'
          })
        : '',
    })
  }

  const handleEditSave = async (id: number) => {
    if (orphanageId === null) return
    if (!editForm.user_id || !editForm.space_id || !editForm.date || !editForm.time_started) {
      alert('Please fill in all required fields.')
      return
    }
    const { error } = await updateAttendanceRecord(id, {
      user_id: parseInt(editForm.user_id),
      space_id: parseInt(editForm.space_id),
      date: editForm.date,
      time_started: editForm.time_started,
      time_ended: editForm.time_ended,
    })
    if (error) { alert('Something went wrong.'); return }
    setEditingId(null)
    if (!admin) return null
    await createNotification('attendance_edited', `${admin.first_name} ${admin.last_name} edited attendance record #${id}`, orphanageId)
    refreshLogs()
  }

  const handleDelete = async (id: number) => {
    if (orphanageId === null) return
    if (!confirm('Are you sure you want to delete this attendance record?')) return
    const { error } = await deleteAttendanceRecord(id)
    if (error) { alert('Something went wrong.'); return }
    if (!admin) return null
    await createNotification('attendance_deleted', `${admin.first_name} ${admin.last_name} deleted attendance record #${id}`, orphanageId)
    refreshLogs()
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Attendance Logs</h1>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(true)}
                className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
                Export
              </button>
              <button onClick={() => setShowManualModal(true)}
                className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
                Manual Entry
              </button>
              <button
                onClick={refreshLogs}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <AttendanceFilters
            searchName={searchName}
            filterDate={filterDate}
            filterSpace={filterSpace}
            spaces={spaces}
            onSearchName={setSearchName}
            onFilterDate={setFilterDate}
            onFilterSpace={setFilterSpace}
            onClear={() => { setSearchName(''); setFilterDate(''); setFilterSpace('') }}
          />

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400">Loading logs...</p>
            </div>
          ) : (
            <AttendanceTable
              logs={filteredLogs}
              users={users}
              spaces={spaces}
              editingId={editingId}
              editForm={editForm}
              onEditStart={handleEditStart}
              onEditFormChange={setEditForm}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showManualModal && orphanageId !== null && (
        <ManualEntryModal
          users={users}
          spaces={spaces}
          orphanageId={orphanageId}
          onClose={() => setShowManualModal(false)}
          onSuccess={refreshLogs}
        />
      )}

      {showExportModal && orphanageId !== null && (
        <ExportModal
          filteredLogs={filteredLogs}
          orphanageId={orphanageId}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </AdminGuard>
  )
}