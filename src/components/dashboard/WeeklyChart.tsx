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

function getWeekLabel(weekOffset: number): string {
  const start = new Date()
  start.setDate(start.getDate() - 6 - weekOffset * 7)
  const end = new Date()
  end.setDate(end.getDate() - weekOffset * 7)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return weekOffset === 0 ? 'This Week' : `${fmt(start)} – ${fmt(end)}`
}

export default function WeeklyChart({ weeklyData: initialData, spaces, spaceIds }: Props) {
  const sortedSpaces = [...spaces].sort((a, b) => a.space_name.localeCompare(b.space_name))

  const [weekOffset, setWeekOffset] = useState(0)
  const [weeklyData, setWeeklyData] = useState<DailyAttendance[]>(initialData)
  const [loading, setLoading] = useState(false)

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            ‹
          </button>
          <span className="text-sm text-gray-600 w-36 text-center">{getWeekLabel(weekOffset)}</span>
          <button
            onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
          >
            ›
          </button>
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
            <YAxis tick={{ fontSize: 12 }} />
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