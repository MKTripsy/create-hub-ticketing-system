'use client'

import { useState } from 'react'

type Props = {
  onStartScan: () => void
  onManualSearch: (id: string) => void
}

export default function IdleScreen({ onStartScan, onManualSearch }: Props) {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')
  const [manualId, setManualId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!manualId.trim()) return
    setLoading(true)
    await onManualSearch(manualId)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Attendance System
        </h1>
        <p className="text-gray-500 text-center mb-6">
          Scan QR code or enter ID to clock in or out
        </p>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'qr'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Scan QR Code
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Enter ID
          </button>
        </div>

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <button
            onClick={onStartScan}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
          >
            Start Scanning
          </button>
        )}

        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter User ID
            </label>
            <input
              type="text"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. HOH-26-0001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !manualId.trim()}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search User'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}