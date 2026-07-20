'use client'

import { useEffect, useState } from 'react'
import { HubUseRecord, fetchHubUseRecords, formatHubTime, formatHubDate } from '@/lib/api/hubUse'

type Props = {
  orphanageId: number
}

function getWeekBounds(weekOffset: number): { start: string; end: string } {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() - weekOffset * 7)
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return {
    start: sunday.toLocaleDateString('sv-SE'),
    end: saturday.toLocaleDateString('sv-SE'),
  }
}

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week'
  const { start, end } = getWeekBounds(weekOffset)
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })
  return `${fmt(start)} – ${fmt(end)}`
}

export default function WeeklyHubUseTable({ orphanageId }: Props) {
  const [allRecords, setAllRecords] = useState<HubUseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    fetchHubUseRecords(orphanageId).then(records => {
      setAllRecords(records)
      setLoading(false)
    })
  }, [orphanageId])

  const { start, end } = getWeekBounds(weekOffset)
  const weekRecords = allRecords
    .filter(r => r.date >= start && r.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Weekly Hub Use</h2>
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
      </div>

      {loading ? (
        <p className="text-sm text-gray-300 text-center py-6">Loading...</p>
      ) : weekRecords.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-6">No hub use records for this week.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Opened</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Closed</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Components</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {weekRecords.map((record, i) => (
                <tr key={record.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-gray-50/50'
                  }`}
                >
                  <td className="py-2 px-3 text-gray-700 whitespace-nowrap font-medium">
                    {formatHubDate(record.date)}
                  </td>
                  <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                    {formatHubTime(record.time_opened)}
                  </td>
                  <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                    {formatHubTime(record.time_closed)}
                  </td>
                  <td className="py-2 px-3">
                    {record.spaces.length === 0 ? (
                      <span className="text-gray-300">—</span>
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
                  <td className="py-2 px-3 text-gray-500 max-w-[180px] truncate">
                    {record.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}