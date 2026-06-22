'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { NotificationItem, NOTIFICATION_TYPES } from '@/lib/api/notifications'

type Props = {
  notifications: NotificationItem[]
  filterType: string
  filterDateFrom: string
  filterDateTo: string
}

export default function NotificationExport({
  notifications, filterType, filterDateFrom, filterDateTo
}: Props) {
  const handleExportCSV = () => {
    if (notifications.length === 0) { alert('No logs to export.'); return }
    const headers = ['ID', 'Type', 'Message', 'Date & Time']
    const rows = notifications.map(n => [
      n.id,
      n.type,
      `"${n.message.replace(/"/g, '""')}"`,
      new Date(n.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ActivityLogs-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    if (notifications.length === 0) { alert('No activity logs to export.'); return }
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Activity Logs Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    const filterInfo = [
      filterType !== 'all' ? `Type: ${NOTIFICATION_TYPES.find(t => t.value === filterType)?.label}` : null,
      filterDateFrom ? `From: ${filterDateFrom}` : null,
      filterDateTo ? `To: ${filterDateTo}` : null,
    ].filter(Boolean).join('  |  ')
    doc.text(filterInfo || 'All Activity Logs', 14, 23)
    doc.text(`Exported: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, 14, 29)
    doc.text(`Total: ${notifications.length} log${notifications.length !== 1 ? 's' : ''}`, 14, 35)
    autoTable(doc, {
      startY: 40,
      head: [['Type', 'Message', 'Date & Time']],
      body: notifications.map(n => [
        NOTIFICATION_TYPES.find(t => t.value === n.type)?.label || n.type,
        n.message,
        new Date(n.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [255, 99, 71] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 110 }, 2: { cellWidth: 45 } },
    })
    doc.save(`ActivityLogs-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="flex gap-2">
      <button onClick={handleExportCSV}
        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-medium">
        Export CSV
      </button>
      <button onClick={handleExportPDF}
        className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
        Export PDF
      </button>
    </div>
  )
}