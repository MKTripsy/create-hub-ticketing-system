'use client'

import { useState } from 'react'
import AdminGuard from '@/components/AdminGuard'
import TimeSlotSettings from '@/components/settings/TimeSlotSettings'
import SurveyOptionSettings from '@/components/settings/SurveyOptionSettings'
import SpaceSettings from '@/components/settings/SpaceSettings'
import AdminAccountSettings from '@/components/settings/AdminAccountSettings'
import HubManagementSettings from '@/components/settings/HubManagementSettings'
import { useAuth } from '@/context/AuthContext'

type Tab = 'timeslots' | 'survey' | 'spaces' | 'account' | 'hubs'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('timeslots')
  const { admin } = useAuth()

  const tabs: { id: Tab; label: string }[] = [
    { id: 'timeslots', label: 'Time Slots' },
    { id: 'spaces', label: 'Components' },
    { id: 'survey', label: 'Survey' },
    // Only show Account tab to superadmin
    ...(admin?.role === 'superadmin' ? [
      { id: 'account' as Tab, label: 'Account' },
      { id: 'hubs' as Tab, label: 'Manage Hubs' }, 
    ] : []),
  ]

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
          <div className="flex border-b mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#FF6347] text-[#FF6347]'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            {activeTab === 'timeslots' && <TimeSlotSettings />}
            {activeTab === 'spaces' && <SpaceSettings />}
            {activeTab === 'survey' && <SurveyOptionSettings />}
            {activeTab === 'account' && admin?.role === 'superadmin' && <AdminAccountSettings />}
            {activeTab === 'hubs' && admin?.role === 'superadmin' && <HubManagementSettings />}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}