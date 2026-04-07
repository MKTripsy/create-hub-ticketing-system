'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/components/AdminGuard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

type StatCard = {
  label: string
  value: number
  color: string
  icon: string
}

type DailyAttendance = {
  day: string
  Arts: number
  Computer: number
}

type SpaceDistribution = {
  name: string
  value: number
}

type RecentLog = {
  id: number
  first_name: string
  last_name: string
  space_name: string
  time_started: string
  time_ended: string | null
}

const COLORS = ['#6366f1', '#f59e0b']

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [clockedInToday, setClockedInToday] = useState(0)
  const [clockedOutToday, setClockOutToday] = useState(0)
  const [activeNow, setActiveNow] = useState(0)
  const [weeklyData, setWeeklyData] = useState<DailyAttendance[]>([])
  const [spaceData, setSpaceData] = useState<SpaceDistribution[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])

  const today = new Date().toISOString().split('T')[0]

  const getWeekDates = () => {
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const fetchDashboardData = async () => {
    setLoading(true)

    // Total active users
    const { count: usersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
    setTotalUsers(usersCount ?? 0)

    // Today's sessions
    const { data: todaySessions } = await supabase
      .from('attendance_session')
      .select(`
        id,
        time_ended,
        spaces:accessed_space (
          space_name
        )
      `)
      .eq('date', today)

    const active = todaySessions?.filter(s => !s.time_ended).length ?? 0
    const completed = todaySessions?.filter(s => s.time_ended).length ?? 0

    setActiveNow(active)
    setClockedInToday(todaySessions?.length ?? 0)
    setClockOutToday(completed)

    // Space distribution for today
    const artsCount = todaySessions?.filter(
      s => (s.spaces as any)?.space_name === 'Arts Space'
    ).length ?? 0
    const computerCount = todaySessions?.filter(
      s => (s.spaces as any)?.space_name === 'Computer Space'
    ).length ?? 0

    setSpaceData([
      { name: 'Arts Space', value: artsCount },
      { name: 'Computer Space', value: computerCount },
    ])

    // Weekly attendance data
    const weekDates = getWeekDates()
    const weeklyAttendance = await Promise.all(
      weekDates.map(async (date) => {
        const { data: sessions } = await supabase
          .from('attendance_session')
          .select(`
            id,
            spaces:accessed_space (
              space_name
            )
          `)
          .eq('date', date)

        const arts = sessions?.filter(
          s => (s.spaces as any)?.space_name === 'Arts Space'
        ).length ?? 0
        const computer = sessions?.filter(
          s => (s.spaces as any)?.space_name === 'Computer Space'
        ).length ?? 0

        return {
          day: getDayLabel(date),
          Arts: arts,
          Computer: computer,
        }
      })
    )
    setWeeklyData(weeklyAttendance)

    // Recent logs
    const { data: recent } = await supabase
      .from('attendance_session')
      .select(`
        id,
        time_started,
        time_ended,
        users (
          first_name,
          last_name
        ),
        spaces:accessed_space (
          space_name
        )
      `)
      .eq('date', today)
      .order('time_started', { ascending: false })
      .limit(5)

    if (recent) {
      setRecentLogs(recent.map(r => ({
        id: r.id,
        first_name: (r.users as any)?.first_name,
        last_name: (r.users as any)?.last_name,
        space_name: (r.spaces as any)?.space_name,
        time_started: r.time_started,
        time_ended: r.time_ended,
      })))
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statCards: StatCard[] = [
    { label: 'Total Active Users', value: totalUsers, color: 'bg-blue-50 text-blue-600', icon: '👥' },
    { label: 'Clocked In Today', value: clockedInToday, color: 'bg-green-50 text-green-600', icon: '✅' },
    { label: 'Currently Active', value: activeNow, color: 'bg-purple-50 text-purple-600', icon: '🟢' },
    { label: 'Completed Today', value: clockedOutToday, color: 'bg-orange-50 text-orange-600', icon: '🏁' },
  ]

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="bg-[#cee4b8] text-black px-4 py-2 rounded-lg hover:bg-[#76bcad] hover:text-[#faf2f0] text-sm shadow"
            >
               Refresh
            </button>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${card.color} text-2xl mb-4`}>
                  {card.icon}
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">

            {/* Weekly Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Weekly Attendance
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Arts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Computer" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Space Distribution Pie Chart */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Today's Space Usage
              </h2>
              {spaceData.every(d => d.value === 0) ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-gray-300">No data for today</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={spaceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {spaceData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {spaceData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-xs text-gray-500">
                          {entry.name} ({entry.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Activity Today
              </h2>
              <a 
                href="/admin/attendance"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all 
              </a>
            </div>

            {recentLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300">No activity today yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 rounded-lg">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Space</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Clock In</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {log.first_name} {log.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.space_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatTime(log.time_started)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.time_ended ? formatTime(log.time_ended) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          log.time_ended
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {log.time_ended ? 'Completed' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </AdminGuard>
  )
}