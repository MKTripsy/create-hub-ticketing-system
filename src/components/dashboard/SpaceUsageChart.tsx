'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { SpaceDistribution } from '@/lib/api/dashboard'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

type Props = {
  spaceData: SpaceDistribution[]
}

export default function SpaceUsageChart({ spaceData }: Props) {
  const sortedData = [...spaceData].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Today's Component Usage</h2>
      {spaceData.every(d => d.value === 0) ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-300">No data for today</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sortedData} cx="50%" cy="50%"
                innerRadius={60} outerRadius={80} dataKey="value">
                {sortedData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {sortedData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs text-gray-500">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}