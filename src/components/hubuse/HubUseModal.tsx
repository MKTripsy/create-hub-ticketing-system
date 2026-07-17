'use client'

import { useState, useEffect } from 'react'
import { HubUseRecord, HubUseSpace, insertHubUse, updateHubUse } from '@/lib/api/hubUse'

type Props = {
  orphanageId: number
  allSpaces: HubUseSpace[]
  record?: HubUseRecord        // present when editing, absent when creating
  onClose: () => void
  onSuccess: () => void
}

export default function HubUseModal({ orphanageId, allSpaces, record, onClose, onSuccess }: Props) {
  const isEdit = !!record

  const [date, setDate] = useState(
    record?.date ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })
  )
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<Set<number>>(
    new Set(record?.spaces.map(s => s.id) ?? [])
  )
  const [submitting, setSubmitting] = useState(false)

  const toggleSpace = (id: number) => {
    setSelectedSpaceIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!date) { alert('Please select a date.'); return }
    setSubmitting(true)
    try {
      const spaceIds = Array.from(selectedSpaceIds)
      const { error } = isEdit
        ? await updateHubUse({ id: record!.id, date, notes, spaceIds })
        : await insertHubUse({ orphanageId, date, notes, spaceIds })

      if (error) throw error
      onSuccess()
      onClose()
    } catch (err) {
      console.error('HubUse save error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {isEdit ? 'Edit Hub Use Record' : 'New Hub Use Record'}
        </h3>

        <div className="space-y-4">

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>

          {/* Spaces */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Components Open
            </label>
            <div className="grid grid-cols-2 gap-2">
              {allSpaces.map(space => (
                <label
                  key={space.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                    selectedSpaceIds.has(space.id)
                      ? 'border-[#FF6347] bg-[#FF6347]/5 text-[#FF6347] font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSpaceIds.has(space.id)}
                    onChange={() => toggleSpace(space.id)}
                    className="accent-[#FF6347]"
                  />
                  {space.space_name}
                </label>
              ))}
            </div>
            {allSpaces.length === 0 && (
              <p className="text-xs text-gray-400">No components found for this hub.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Record'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}