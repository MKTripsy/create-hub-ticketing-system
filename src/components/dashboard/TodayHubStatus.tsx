'use client'

import { useEffect, useState } from 'react'
import { HubUseRecord, fetchHubUseRecords, formatHubTime } from '@/lib/api/hubUse'

type Props = {
  orphanageId: number
}

export default function TodayHubStatus({ orphanageId }: Props) {
  const [record, setRecord] = useState<HubUseRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })

  useEffect(() => {
    fetchHubUseRecords(orphanageId).then(records => {
      const todayRecords = records.filter(r => r.date === today)
      // Most recent = first in the list since fetchHubUseRecords orders by date desc
      setRecord(todayRecords[0] ?? null)
      setLoading(false)
    })
  }, [orphanageId])

  const isOpen = !!record?.time_opened && !record?.time_closed

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Hub Status</h2>

      {loading ? (
        <p className="text-sm text-gray-300">Loading...</p>
      ) : !record ? (
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <p className="text-sm text-gray-400">No hub use recorded for today.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Open/Closed indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className={`text-sm font-semibold ${isOpen ? 'text-green-600' : 'text-gray-500'}`}>
              {isOpen ? 'Currently Open' : 'Closed'}
            </span>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Opened</p>
              <p className="text-sm font-semibold text-gray-700">{formatHubTime(record.time_opened)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Closed</p>
              <p className="text-sm font-semibold text-gray-700">{formatHubTime(record.time_closed)}</p>
            </div>
          </div>

          {/* Components open */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Components Open</p>
            {record.spaces.length === 0 ? (
              <p className="text-sm text-gray-300">—</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {record.spaces.map(s => (
                  <span key={s.id}
                    className="inline-block bg-[#FF6347]/10 text-[#FF6347] text-xs font-medium px-2 py-0.5 rounded-full">
                    {s.space_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {record.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-600">{record.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}