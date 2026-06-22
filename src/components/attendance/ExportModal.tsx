'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AttendanceLog, fetchAllAttendanceLogs, formatTime, formatDuration } from '@/lib/api/attendance'

type Props = {
  filteredLogs: AttendanceLog[]
  orphanageId: number
  onClose: () => void
}

export default function ExportModal({ filteredLogs, orphanageId, onClose }: Props) {
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered')
  const [exporting, setExporting] = useState(false)

  const getExportData = async (): Promise<AttendanceLog[]> => {
    if (exportScope === 'filtered') return filteredLogs
    return await fetchAllAttendanceLogs(orphanageId)
  }

  const exportCSV = async () => {
    setExporting(true)
    const data = await getExportData()
    const headers = ['Name', 'ID', 'Component', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Pre Survey', 'Post Survey']
    const rows = data.map(log => [
      `${log.users?.first_name} ${log.users?.last_name}`,
      log.users?.custom_id || '',
      log.spaces?.space_name || '',
      log.date,
      formatTime(log.time_started),
      log.time_ended ? formatTime(log.time_ended) : 'Active',
      formatDuration(log.time_started, log.time_ended),
      log.pre_surveys.join(' | ') || '—',
      log.post_surveys.join(' | ') || '—',
    ])
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    onClose()
  }

  const exportPDF = async () => {
    setExporting(true)
    const data = await getExportData()
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Attendance Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['Name', 'ID', 'Component', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Pre Survey', 'Post Survey']],
      body: data.map(log => [
        `${log.users?.first_name} ${log.users?.last_name}`,
        log.users?.custom_id || '',
        log.spaces?.space_name || '',
        log.date,
        formatTime(log.time_started),
        log.time_ended ? formatTime(log.time_ended) : 'Active',
        formatDuration(log.time_started, log.time_ended),
        log.pre_surveys.join(' | ') || '—',
        log.post_surveys.join(' | ') || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 99, 71] },
    })
    doc.save(`attendance-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })}.pdf`)
    setExporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Attendance</h3>
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">What to export:</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" value="all" checked={exportScope === 'all'}
                onChange={() => setExportScope('all')} className="w-4 h-4 accent-[#FF6347]" />
              <div>
                <p className="text-sm font-bold text-black">All records</p>
                <p className="text-xs text-gray-600">Export entire attendance history</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" value="filtered" checked={exportScope === 'filtered'}
                onChange={() => setExportScope('filtered')} className="w-4 h-4 accent-[#FF6347]" />
              <div>
                <p className="text-sm font-bold text-gray-800">Current Filters</p>
                <p className="text-xs text-gray-600">
                  Export only records shown with current filters ({filteredLogs.length} records)
                </p>
              </div>
            </label>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-3">Export format:</p>
        <div className="flex gap-3 mb-4">
          <button onClick={exportCSV} disabled={exporting}
            className="flex-1 bg-[#CEE4B8] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium disabled:opacity-50 text-sm">
            {exporting ? 'Exporting...' : 'CSV'}
          </button>
          <button onClick={exportPDF} disabled={exporting}
            className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50 text-sm">
            {exporting ? 'Exporting...' : 'PDF'}
          </button>
        </div>
        <button onClick={onClose} className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}