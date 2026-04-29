'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type OperatingDay = {
  id: number
  day: string
  is_active: boolean
}

export default function OperatingDaysSettings() {
  const [days, setDays] = useState<OperatingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchDays = async () => {
    const { data } = await supabase
      .from('operating_days')
      .select('*')
      .order('id')
    if (data) setDays(data)
    setLoading(false)
  }

  useEffect(() => { fetchDays() }, [])

  const handleToggle = (id: number) => {
    setDays(prev =>
      prev.map(d => d.id === id ? { ...d, is_active: !d.is_active } : d)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    await Promise.all(
      days.map(day =>
        supabase
          .from('operating_days')
          .update({ is_active: day.is_active })
          .eq('id', day.id)
      )
    )
    setSaving(false)
    alert('Operating days saved!')
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Operating Days</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select which days the system accepts clock-ins.
      </p>

      <div className="space-y-3 mb-6">
        {days.map(day => (
          <label
            key={day.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
          >
            <input
              type="checkbox"
              checked={day.is_active}
              onChange={() => handleToggle(day.id)}
              className="w-4 h-4 accent-[#FF6347]"
            />
            <span className="text-sm font-medium text-gray-700">{day.day}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#FF6347] text-[#FAF2F0] hover:bg-[#717171] py-2 rounded-lg font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}