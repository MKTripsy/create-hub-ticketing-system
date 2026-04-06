'use client'

import { useState } from 'react'
import AdminGuard from '@/components/AdminGuard'
import TimeSlotSettings from '@/components/settings/TimeSlotSettings'
import SurveyOptionSettings from '@/components/settings/SurveyOptionSettings'
import SpaceSettings from '@/components/settings/SpaceSettings'
import OperatingDaysSettings from '@/components/settings/OperatingDaysSettings'
import AdminAccountSettings from '@/components/settings/AdminAccountSettings'

type Tab = 'timeslots' | 'survey' | 'spaces' | 'days' | 'account'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('timeslots')

  const tabs: { id: Tab; label: string }[] = [
  { id: 'timeslots', label: 'Time Slots' },
  { id: 'survey', label: 'Survey Options' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'days', label: 'Operating Days' },
  { id: 'account', label: 'Account' },
]

  return (
    <AdminGuard>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

          {/* Tabs */}
          <div className="flex border-b mb-6 overflow-x-auto">
            {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
                {tab.label}
            </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow p-6">
            {activeTab === 'timeslots' && <TimeSlotSettings />}
            {activeTab === 'survey' && <SurveyOptionSettings />}
            {activeTab === 'spaces' && <SpaceSettings />}
            {activeTab === 'days' && <OperatingDaysSettings />}
            {activeTab === 'account' && <AdminAccountSettings />}
          </div>

        </div>
      </div>
    </AdminGuard>
  )
}