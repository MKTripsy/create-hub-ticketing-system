'use client'

import { useState, useEffect } from 'react'

export default function KioskExit() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isElectron, setIsElectron] = useState(false)

  const closePrompt = () => {
    setShowPrompt(false)
    window.dispatchEvent(new Event('kiosk-exit-closed'))
  }

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electronAPI)

    const openPrompt = () => { setShowPrompt(true); setPassword(''); setError('') }
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') openPrompt() }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('kiosk-exit-requested', openPrompt)
    window.addEventListener('kiosk-exit-closed', closePrompt)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('kiosk-exit-requested', openPrompt)
      window.removeEventListener('kiosk-exit-closed', closePrompt)
    }
  }, [])

  const handleExit = () => {
    const api = (window as any).electronAPI
    if (api) {
      api.tryExit(password)
      api.onExitFailed(() => { setError('Incorrect password.'); setPassword('') })
    }
  }

  if (!isElectron || !showPrompt) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]"  style={{ backgroundColor: '#FAF2F0' }}>
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Exit Kiosk Mode</h2>
        <p className="text-gray-500 text-sm mb-6">Enter admin password to exit.</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
        )}

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleExit()}
          autoFocus
          placeholder="Enter password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] mb-4"
        />

        <div className="flex gap-3">
          <button onClick={handleExit}
            className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium">
            Exit
          </button>
          <button onClick={closePrompt}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}