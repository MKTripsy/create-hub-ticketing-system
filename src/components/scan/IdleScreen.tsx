'use client'

import { useState, useEffect } from 'react'

type Props = {
  onStartScan: () => void
  onManualSearch: (id: string) => void
}

export default function IdleScreen({ onStartScan, onManualSearch }: Props) {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')
  const [manualId, setManualId] = useState('')
  const [loading, setLoading] = useState(false)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electronAPI)
  }, [])

  const handleSearch = async () => {
    if (!manualId.trim()) return
    setLoading(true)
    await onManualSearch(manualId)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
       {isElectron && (
          <button
            onClick={() => window.dispatchEvent(new Event('kiosk-exit-requested'))}
            className="fixed top-4 right-4 z-50 bg-[#FF6347] text-[#FAF2F0] hover:bg-[#717171] text-xs px-3 py-1.5 rounded-lg shadow border border-gray-200 transition-colors"
          >
            Exit Kiosk
          </button>
        )}
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
                ? 'border-[#FF6347] text-[#FF6347]'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Scan QR Code
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-[#FF6347] text-[#FF6347]'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Enter ID
          </button>
        </div>

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <button
            onClick={onStartScan}
            className="w-full bg-[#FF6347] text-[#FAF2F0] hover:bg-[#717171] py-3 rounded-lg font-medium text-lg transition-colors"
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
              placeholder="e.g. HOH-26-XXXX"
              className="w-full border border-gray-400 rounded-lg px-3 py-2 text-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !manualId.trim()}
              className="w-full bg-[#FF6347] text-[#FAF2F0] hover:bg-[#717171] py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Searching...' : 'Search User'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}