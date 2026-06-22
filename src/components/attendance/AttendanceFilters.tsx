'use client'

import { AttendanceSpace } from '@/lib/api/attendance'

type Props = {
  searchName: string
  filterDate: string
  filterSpace: string
  spaces: AttendanceSpace[]
  onSearchName: (v: string) => void
  onFilterDate: (v: string) => void
  onFilterSpace: (v: string) => void
  onClear: () => void
}

export default function AttendanceFilters({
  searchName, filterDate, filterSpace, spaces,
  onSearchName, onFilterDate, onFilterSpace, onClear
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4">
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-black mb-1">Search by name</label>
        <input type="text" value={searchName} onChange={e => onSearchName(e.target.value)}
          placeholder="e.g. Juan"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
      </div>
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-black mb-1">Filter by date</label>
        <input type="date" value={filterDate} onChange={e => onFilterDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]" />
      </div>
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-black mb-1">Filter by Component</label>
        <select value={filterSpace} onChange={e => onFilterSpace(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347]">
          <option value="">All Components</option>
          {spaces.map(space => (
            <option key={space.id} value={space.id}>{space.space_name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button onClick={onClear}
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
          Clear Filters
        </button>
      </div>
    </div>
  )
}