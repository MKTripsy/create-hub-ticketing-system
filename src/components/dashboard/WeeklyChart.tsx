'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DailyAttendance, SpaceItem, fetchWeeklyAttendance } from '@/lib/api/dashboard'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

type Props = {
  weeklyData: DailyAttendance[]
  spaces: SpaceItem[]
  spaceIds: number[]
}

function getWeekBounds(weekOffset: number): { sunday: Date; saturday: Date } {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() - weekOffset * 7)
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return { sunday, saturday }
}

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week'
  const { sunday, saturday } = getWeekBounds(weekOffset)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(sunday)} – ${fmt(saturday)}`
}

// ─── Export helpers ───────────────────────────────────────────────────────

function downloadCSV(weeklyData: DailyAttendance[], spaces: SpaceItem[], weekOffset: number) {
  const sortedSpaces = [...spaces].sort((a, b) => a.space_name.localeCompare(b.space_name))
  const { sunday, saturday } = getWeekBounds(weekOffset)
  const fmt = (d: Date) => d.toLocaleDateString('sv-SE')

  const header = ['Day', ...sortedSpaces.map(s => s.space_name), 'Total']
  const rows = weeklyData.map(row => {
    const spaceCounts = sortedSpaces.map(s => String(row[s.space_name] ?? 0))
    const total = sortedSpaces.reduce((sum, s) => sum + ((row[s.space_name] as number) ?? 0), 0)
    return [row.day as string, ...spaceCounts, String(total)]
  })

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weekly_attendance_${fmt(sunday)}_to_${fmt(saturday)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPDF(weeklyData: DailyAttendance[], spaces: SpaceItem[], weekOffset: number) {
  const sortedSpaces = [...spaces].sort((a, b) => a.space_name.localeCompare(b.space_name))
  const { sunday, saturday } = getWeekBounds(weekOffset)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const title = `Weekly Attendance — ${fmt(sunday)} to ${fmt(saturday)}`

  const headerCells = ['Day', ...sortedSpaces.map(s => s.space_name), 'Total']
    .map(h => `<th>${h}</th>`).join('')

  const bodyRows = weeklyData.map(row => {
    const spaceCells = sortedSpaces.map(s =>
      `<td>${row[s.space_name] ?? 0}</td>`
    ).join('')
    const total = sortedSpaces.reduce((sum, s) => sum + ((row[s.space_name] as number) ?? 0), 0)
    return `<tr><td>${row.day}</td>${spaceCells}<td><strong>${total}</strong></td></tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 24px; color: #222; }
    h2 { font-size: 15px; margin-bottom: 4px; }
    p.sub { color: #666; margin: 0 0 12px; font-size: 10px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #FF6347; color: #fff; padding: 6px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <p class="sub">Generated ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Pop-up blocked. Please allow pop-ups and try again.'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 400)
}

// ─── Component ────────────────────────────────────────────────────────────

export default function WeeklyChart({ weeklyData: initialData, spaces, spaceIds }: Props) {
  const sortedSpaces = [...spaces].sort((a, b) => a.space_name.localeCompare(b.space_name))

  const [weekOffset, setWeekOffset] = useState(0)
  const [weeklyData, setWeeklyData] = useState<DailyAttendance[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    if (weekOffset === 0) { setWeeklyData(initialData); return }
    setLoading(true)
    fetchWeeklyAttendance(spaceIds, spaces, weekOffset)
      .then(setWeeklyData)
      .finally(() => setLoading(false))
  }, [weekOffset])

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Weekly Attendance</h2>
        <div className="flex items-center gap-3">

          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 text-lg leading-none"
            >
              ‹
            </button>
            <span className="text-sm text-gray-600 w-36 text-center">{getWeekLabel(weekOffset)}</span>
            <button
              onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 text-lg leading-none"
            >
              ›
            </button>
          </div>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="bg-[#FF6347] text-white px-3 py-1.5 rounded-lg hover:bg-[#414141] text-xs font-medium"
            >
              Export
            </button>
            {showExportMenu && (
              <>
                {/* backdrop to close on outside click */}
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { downloadCSV(weeklyData, spaces, weekOffset); setShowExportMenu(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => { downloadPDF(weeklyData, spaces, weekOffset); setShowExportMenu(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[250px]">
          <p className="text-gray-300 text-sm">Loading...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            {sortedSpaces.map((space, index) => (
              <Bar key={space.id} dataKey={space.space_name}
                fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}