'use client'

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'
import {
  HubUseRecord, HubUseSpace,
  fetchHubUseRecords, fetchAllSpaces,
  deleteHubUse, formatHubTime, formatHubDate
} from '@/lib/api/hubUse'
import HubUseModal from '@/components/hubuse/HubUseModal'

export default function HubUsePage() {
  const { admin, isLoading } = useAuth()
  const orphanageId = admin?.orphanage_id ?? null

  const [records, setRecords] = useState<HubUseRecord[]>([])
  const [allSpaces, setAllSpaces] = useState<HubUseSpace[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<HubUseRecord | undefined>(undefined)

  // Filters
  const [filterDate, setFilterDate] = useState('')
  const [filterSpace, setFilterSpace] = useState('')

  const load = async () => {
    if (orphanageId === null) return
    setLoading(true)
    const [recs, spaces] = await Promise.all([
      fetchHubUseRecords(orphanageId),
      fetchAllSpaces(orphanageId),
    ])
    setRecords(recs)
    setAllSpaces(spaces)
    setLoading(false)
  }

  useEffect(() => {
    if (isLoading || orphanageId === null) return
    load()
  }, [orphanageId, isLoading])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this hub use record?')) return
    const { error } = await deleteHubUse(id)
    if (error) { alert('Something went wrong.'); return }
    load()
  }

  const handleEdit = (record: HubUseRecord) => {
    setEditingRecord(record)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingRecord(undefined)
    setShowModal(true)
  }

  // Client-side filtering
  const filtered = records.filter(r => {
    if (filterDate && r.date !== filterDate) return false
    if (filterSpace && !r.spaces.some(s => s.id === parseInt(filterSpace))) return false
    return true
  })

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Hub Use</h1>
            <div className="flex gap-3">
              <button
                onClick={handleNew}
                className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium transition-colors"
              >
                New Record
              </button>
              <button
                onClick={load}
                className="text-[#FF6347] hover:text-[#414141] px-4 py-2 text-sm font-medium">
                ⟳ Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Component</label>
              <select
                value={filterSpace}
                onChange={e => setFilterSpace(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
              >
                <option value="">All Components</option>
                {allSpaces.map(s => (
                  <option key={s.id} value={s.id}>{s.space_name}</option>
                ))}
              </select>
            </div>
            {(filterDate || filterSpace) && (
              <button
                onClick={() => { setFilterDate(''); setFilterSpace('') }}
                className="text-sm text-gray-400 hover:text-gray-600 pb-2"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400">Loading hub use records...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">No records found</p>
              <p className="text-gray-300 text-sm">Try adjusting your filters or add a new record</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Opened</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Closed</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Components Open</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                          {formatHubDate(record.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatHubTime(record.time_opened)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatHubTime(record.time_closed)}
                        </td>
                        <td className="px-6 py-4">
                          {record.spaces.length === 0 ? (
                            <span className="text-gray-300 text-sm">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {record.spaces.map(s => (
                                <span key={s.id}
                                  className="inline-block bg-[#FF6347]/10 text-[#FF6347] text-xs font-medium px-2 py-0.5 rounded-full">
                                  {s.space_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {record.notes || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEdit(record)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
                Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && orphanageId !== null && (
        <HubUseModal
          orphanageId={orphanageId}
          allSpaces={allSpaces}
          record={editingRecord}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </AdminGuard>
  )
}