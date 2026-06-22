'use client'

import { NOTIFICATION_TYPES } from '@/lib/api/notifications'

type Props = {
  filterType: string
  filterDateFrom: string
  filterDateTo: string
  onFilterType: (v: string) => void
  onFilterDateFrom: (v: string) => void
  onFilterDateTo: (v: string) => void
  onApply: () => void
  onReset: () => void
}

export default function NotificationFilters({
  filterType, filterDateFrom, filterDateTo,
  onFilterType, onFilterDateFrom, onFilterDateTo,
  onApply, onReset
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={filterType} onChange={e => onFilterType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]">
            {NOTIFICATION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input type="date" value={filterDateFrom} onChange={e => onFilterDateFrom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input type="date" value={filterDateTo} onChange={e => onFilterDateTo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
        </div>
        <div className="flex gap-2">
          <button onClick={onApply}
            className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
            Apply
          </button>
          <button onClick={onReset}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm">
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}