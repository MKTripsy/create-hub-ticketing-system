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
import TodayHubStatus from '@/components/dashboard/TodayHubStatus'
import WeeklyHubUseTable from '@/components/dashboard/WeeklyHubUseTable'

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
  const orphanageId = admin?.orphanage_id ?? null

  const loadDashboard = async () => {
    if (!orphanageId) return
    setLoading(true)

    const spacesData = await fetchDashboardSpaces(orphanageId)
    setSpaces(spacesData)

    const ids = spacesData.map(s => s.id)
    setSpaceIds(ids)

    const [users, todaySessions, weekly] = await Promise.all([
      fetchTotalUsers(orphanageId),
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
    if (!orphanageId) return
    const data = await fetchNotifications(orphanageId)
    setNotifications(data)
  }

  useEffect(() => {
    if (isLoading || !orphanageId) return
    loadDashboard()
    loadNotifications()
  }, [orphanageId, isLoading])

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
              className="text-[#FF6347] hover:text-[#414141] px-4 py-2 text-m font-medium">
              ⟳ Refresh
            </button>
          </div>

          {/* Attendance stat cards */}
          <StatCards
            totalUsers={totalUsers}
            activeNow={activeNow}
            completedToday={completedToday}
          />

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            <WeeklyChart weeklyData={weeklyData} spaces={spaces} spaceIds={spaceIds} />
            <SpaceUsageChart spaceData={spaceData} />
          </div>

          {/* Hub Use */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">Hub Use</h2>

          {orphanageId !== null && (
            <>
              {/* Today's status + weekly table side by side on large screens */}
              <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <TodayHubStatus orphanageId={orphanageId} />
                </div>
                <div className="lg:col-span-2">
                  <WeeklyHubUseTable orphanageId={orphanageId} />
                </div>
              </div>

              {/* Survey stat cards */}
              {spaceIds.length > 0 && (
                <div className="mb-8">
                  <SurveyStatCards spaceIds={spaceIds} />
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </AdminGuard>
  )
}