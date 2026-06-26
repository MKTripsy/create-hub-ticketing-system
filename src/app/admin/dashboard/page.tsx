'use client'

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/context/AuthContext'
import {
  SpaceItem, DailyAttendance, SpaceDistribution, Notification,
  fetchDashboardSpaces, fetchTotalUsers, fetchTodaySessions,
  fetchWeeklyAttendance, fetchNotifications
} from '@/lib/api/dashboard'
import StatCards from '@/components/dashboard/StatCards'
import WeeklyChart from '@/components/dashboard/WeeklyChart'
import SpaceUsageChart from '@/components/dashboard/SpaceUsageChart'
import NotificationFeed from '@/components/dashboard/NotificationFeed'
import SurveyStatCards from '@/components/dashboard/SurveyStatCards'

export default function DashboardPage() {
  const { admin, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [activeNow, setActiveNow] = useState(0)
  const [completedToday, setCompletedToday] = useState(0)
  const [weeklyData, setWeeklyData] = useState<DailyAttendance[]>([])
  const [spaceData, setSpaceData] = useState<SpaceDistribution[]>([])
  const [spaces, setSpaces] = useState<SpaceItem[]>([])
  const [spaceIds, setSpaceIds] = useState<number[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })

  const loadDashboard = async () => {
    if (!admin?.orphanage_id) return
    setLoading(true)

    const spacesData = await fetchDashboardSpaces(admin.orphanage_id)
    setSpaces(spacesData)

    const ids = spacesData.map(s => s.id)
    setSpaceIds(ids)

    const [users, todaySessions, weekly] = await Promise.all([
      fetchTotalUsers(admin.orphanage_id),
      fetchTodaySessions(ids, today),
      fetchWeeklyAttendance(ids, spacesData),
    ])

    setTotalUsers(users)
    setActiveNow(todaySessions.filter(s => !s.time_ended).length)
    setCompletedToday(todaySessions.filter(s => s.time_ended).length)
    setWeeklyData(weekly)
    setSpaceData(spacesData.map(space => ({
      name: space.space_name,
      value: todaySessions.filter(s => (s.spaces as any)?.space_name === space.space_name).length
    })))

    setLoading(false)
  }

  const loadNotifications = async () => {
    if (!admin?.orphanage_id) return
    const data = await fetchNotifications(admin.orphanage_id)
    setNotifications(data)
  }

  useEffect(() => {
    if (isLoading || !admin?.orphanage_id) return
    loadDashboard()
    loadNotifications()
  }, [admin?.orphanage_id, isLoading])

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
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
            <button onClick={loadDashboard}
              className="bg-[#FF6347] text-[#FAF2F0] hover:bg-[#717171] px-4 py-2 rounded-lg text-sm shadow">
              Refresh
            </button>
          </div>

          <StatCards
            totalUsers={totalUsers}
            activeNow={activeNow}
            completedToday={completedToday}
          />

          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            <WeeklyChart weeklyData={weeklyData} spaces={spaces} spaceIds={spaceIds} />
            <SpaceUsageChart spaceData={spaceData} />
          </div>

          {/* Hub Use */}
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Hub Use</h2>
          </div>
          <div className="mb-8">
            {spaceIds.length > 0 && <SurveyStatCards spaceIds={spaceIds} />}
          </div>

        </div>
      </div>
    </AdminGuard>
  )
}