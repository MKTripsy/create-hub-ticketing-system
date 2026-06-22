'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DailyAttendance, SpaceItem } from '@/lib/api/dashboard'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

type Props = {
  weeklyData: DailyAttendance[]
  spaces: SpaceItem[]
}

export default function WeeklyChart({ weeklyData, spaces }: Props) {
  const sortedSpaces = [...spaces].sort((a, b) => a.space_name.localeCompare(b.space_name))

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Weekly Attendance</h2>
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
    </div>
  )
}