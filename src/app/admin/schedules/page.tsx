'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'

type Space = {
  id: number
  space_name: string
}

type TimeSlot = {
  id: number
  label: string
  start_time: string
  end_time: string
}

type ScheduleEntry = {
  user_id: number
  first_name: string
  last_name: string
  custom_id: string
  day: string
}

export default function SchedulesPage() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [activeSpace, setActiveSpace] = useState<number | null>(null)
  const [scheduleData, setScheduleData] = useState<Record<number, Record<string, ScheduleEntry[]>>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>('All')
  const [spaceDays, setSpaceDays] = useState<string[]>([])
  const { admin } = useAuth()

  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


  // Fetch spaces only on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('spaces')
        .select('id, space_name')
        .eq('is_active', true)
        .eq('orphanage_id', admin?.orphanage_id)

      if (data) {
        setSpaces(data)
        if (data.length > 0) setActiveSpace(data[0].id)
      }
      setLoading(false)
    }
    fetchData()
  }, [admin?.orphanage_id])

  // Fetch schedule data when active space changes
  useEffect(() => {
    if (!activeSpace) return

    const fetchSchedule = async () => {
      setLoading(true)

      // Fetch space operating days AND time slots together
      const [daysRes, slotsRes, availRes] = await Promise.all([
        supabase
          .from('space_operating_days')
          .select('day')
          .eq('space_id', activeSpace)
          .order('id'),
        supabase
          .from('time_slots')
          .select('*')
          .eq('is_active', true)
          .eq('space_id', activeSpace)  // ← filter by space
          .order('start_time'),
        supabase
          .from('availability')
          .select(`
            user_id,
            day,
            time_slot_id,
            users (
              first_name,
              last_name,
              custom_id
            )
          `)
          .eq('space_id', activeSpace)
      ])

      if (daysRes.data) {
        const sorted = daysRes.data
          .map(d => d.day)
          .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        setSpaceDays(sorted)
        setSelectedDay('All')
      }

      // Set time slots for this space
      const currentSlots = slotsRes.data || []
      setTimeSlots(currentSlots)

      if (!availRes.data) { setLoading(false); return }

      // Organize data using currentSlots directly
      // (not timeSlots state since it may not have updated yet)
      const organized: Record<number, Record<string, ScheduleEntry[]>> = {}

      currentSlots.forEach(slot => {
        organized[slot.id] = {}
      })

      availRes.data.forEach((entry: any) => {
        const slotId = entry.time_slot_id
        const day = entry.day

        if (!organized[slotId]) organized[slotId] = {}
        if (!organized[slotId][day]) organized[slotId][day] = []

        organized[slotId][day].push({
          user_id: entry.user_id,
          first_name: entry.users?.first_name,
          last_name: entry.users?.last_name,
          custom_id: entry.users?.custom_id,
          day
        })
      })

      setScheduleData(organized)
      setLoading(false)
    }

    fetchSchedule()
  }, [activeSpace]) 
  // Fetch spaces and time slots
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const [spacesRes, timeSlotsRes] = await Promise.all([
  //       supabase.from('spaces').select('id, space_name').eq('is_active', true)
  //       // supabase.from('time_slots').select('*').eq('is_active', true).order('start_time')
  //     ])

  //     if (spacesRes.data) {
  //       setSpaces(spacesRes.data)
  //       if (spacesRes.data.length > 0) setActiveSpace(spacesRes.data[0].id)
  //     }
  //     if (timeSlotsRes.data) setTimeSlots(timeSlotsRes.data)
  //     setLoading(false)
  //   }
  //   fetchData()
  // }, [])

  // // Fetch schedule data when active space changes
  // useEffect(() => {
  //   if (!activeSpace) return

  //   const fetchSchedule = async () => {
  //     setLoading(true)

  //     // Fetch space operating days
  //     const { data: daysData } = await supabase
  //       .from('space_operating_days')
  //       .select('day')
  //       .eq('space_id', activeSpace)
  //       .order('id')

  //     if (daysData) {
  //       const sorted = daysData
  //         .map(d => d.day)
  //         .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
  //       setSpaceDays(sorted)
  //       setSelectedDay('All')
  //     }

  //     // Fetch availability for this space
  //     const { data: availData } = await supabase
  //       .from('availability')
  //       .select(`
  //         user_id,
  //         day,
  //         time_slot_id,
  //         users (
  //           first_name,
  //           last_name,
  //           custom_id
  //         )
  //       `)
  //       .eq('space_id', activeSpace)

  //     if (!availData) { setLoading(false); return }

  //     // Organize data: { time_slot_id: { day: [users] } }
  //     const organized: Record<number, Record<string, ScheduleEntry[]>> = {}

  //     timeSlots.forEach(slot => {
  //       organized[slot.id] = {}
  //     })

  //     availData.forEach((entry: any) => {
  //       const slotId = entry.time_slot_id
  //       const day = entry.day

  //       if (!organized[slotId]) organized[slotId] = {}
  //       if (!organized[slotId][day]) organized[slotId][day] = []

  //       organized[slotId][day].push({
  //         user_id: entry.user_id,
  //         first_name: entry.users?.first_name,
  //         last_name: entry.users?.last_name,
  //         custom_id: entry.users?.custom_id,
  //         day
  //       })
  //     })

  //     setScheduleData(organized)
  //     setLoading(false)
  //   }

  //   fetchSchedule()
  // }, [activeSpace, timeSlots])

  const filteredDays = selectedDay === 'All' ? spaceDays : [selectedDay]

  if (loading && spaces.length === 0) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Loading schedules...</p>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Schedules</h1>

          {/* Space Tabs */}
          <div className="flex border-b mb-6 overflow-x-auto">
            {spaces.map(space => (
              <button
                key={space.id}
                onClick={() => setActiveSpace(space.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeSpace === space.id
                    ? 'border-[#FF6347] text-[#FF6347]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {space.space_name}
              </button>
            ))}
          </div>

          {/* Day Filter */}
          {/* <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setSelectedDay('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === 'All'
                  ? 'bg-[#FF6347] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Days
            </button>
            {spaceDays.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedDay === day
                    ? 'bg-[#FF6347] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div> */}

          {/* Schedule Grid */}
          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {/* Time column header */}
                      <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border border-gray-200 w-32">
                        Time
                      </th>
                      {/* Day column headers */}
                      {filteredDays.map(day => (
                        <th
                          key={day}
                          className="bg-gray-50 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border border-gray-200"
                        >
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(slot => (
                      <tr key={slot.id}>
                        {/* Time slot label */}
                        <td className="px-4 py-3 text-xs font-medium text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap align-top">
                          {slot.label}
                        </td>
                        {/* Users per day */}
                        {filteredDays.map(day => {
                          const users = scheduleData[slot.id]?.[day] || []
                          return (
                            <td
                              key={day}
                              className="px-3 py-3 border border-gray-200 align-top min-w-32"
                            >
                              {users.length === 0 ? (
                                <span className="text-gray-200 text-xs">—</span>
                              ) : (
                                <div className="space-y-1">
                                  {users.map(user => (
                                    <div
                                      key={user.user_id}
                                      className="bg-[#FF6347] rounded px-2 py-1"
                                    >
                                      <p className="text-xs font-medium text-[#FAF2F0]">
                                        {user.first_name} {user.last_name}
                                      </p>
                                      <p className="text-xs text-[#FAF2F0]">
                                        {user.custom_id}
                                      </p>
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
              </div>

              {/* Empty state */}
              {timeSlots.every(slot =>
                filteredDays.every(day => !scheduleData[slot.id]?.[day]?.length)
              ) && (
                <div className="p-12 text-center">
                  <p className="text-gray-400 text-lg mb-2">No schedules found</p>
                  <p className="text-gray-300 text-sm">
                    No users are assigned to this component yet
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </AdminGuard>
  )
}