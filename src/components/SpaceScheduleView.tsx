'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type TimeSlot = {
  id: number
  label: string
}

type ScheduleEntry = {
  user_id: number
  first_name: string
  last_name: string
}

type Props = {
  spaceId: number
  operatingDays: string[]
  excludeUserId?: number // for edit page — exclude current user
}

export default function SpaceScheduleView({ spaceId, operatingDays, excludeUserId }: Props) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [scheduleData, setScheduleData] = useState<Record<number, Record<string, ScheduleEntry[]>>>({})
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!spaceId || operatingDays.length === 0) return

    const fetchSchedule = async () => {
      setLoading(true)

      // Fetch time slots
      const { data: slotsData } = await supabase
        .from('time_slots')
        .select('id, label')
        .eq('is_active', true)
        .order('start_time')

      if (!slotsData) { setLoading(false); return }
      setTimeSlots(slotsData)

      // Fetch availability for this space
      let query = supabase
        .from('availability')
        .select(`
          user_id,
          day,
          time_slot_id,
          users (
            first_name,
            last_name
          )
        `)
        .eq('space_id', spaceId)

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId)
      }

      const { data: availData } = await query

      if (!availData) { setLoading(false); return }

      // Organize data
      const organized: Record<number, Record<string, ScheduleEntry[]>> = {}

      slotsData.forEach(slot => {
        organized[slot.id] = {}
        operatingDays.forEach(day => {
          organized[slot.id][day] = []
        })
      })

      availData.forEach((entry: any) => {
        const slotId = entry.time_slot_id
        const day = entry.day

        if (!organized[slotId]?.[day]) return

        organized[slotId][day].push({
          user_id: entry.user_id,
          first_name: entry.users?.first_name,
          last_name: entry.users?.last_name,
        })
      })

      setScheduleData(organized)
      setLoading(false)
    }

    fetchSchedule()
  }, [spaceId, operatingDays, excludeUserId])

  if (operatingDays.length === 0) return null

  return (
    <div className="mt-6">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-sm font-semibold text-gray-600">
          Current Component Schedule
        </h3>
        <span className="text-gray-400 text-sm">
          {isOpen ? '▲ Hide' : '▼ Show'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <p className="text-gray-400 text-sm py-4 text-center">Loading schedule...</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3 text-gray-500 font-medium whitespace-nowrap">
                    Time
                  </th>
                  {operatingDays.map(day => (
                    <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium">
                      {day.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot.id} className="border-t">
                    <td className="py-2 pr-3 text-gray-600 font-medium whitespace-nowrap">
                      {slot.label}
                    </td>
                    {operatingDays.map(day => {
                      const users = scheduleData[slot.id]?.[day] || []
                      return (
                        <td key={day} className="py-2 px-2 align-top">
                          {users.length === 0 ? (
                            <span className="text-gray-200">—</span>
                          ) : (
                            <div className="space-y-1">
                              {users.map(user => (
                                <div
                                  key={user.user_id}
                                  className="bg-[#FF6347] rounded px-1 py-0.5 text-[#FAF2F0] whitespace-nowrap"
                                >
                                  {user.first_name} {user.last_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}