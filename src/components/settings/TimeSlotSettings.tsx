'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Space = {
  id: number
  space_name: string
}

type TimeSlot = {
  id: number
  label: string
  start_time: string
  end_time: string
  is_active: boolean
  space_id: number
}

export default function TimeSlotSettings() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [activeSpace, setActiveSpace] = useState<number | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [form, setForm] = useState({ start_time: '', end_time: '' })
  const [saving, setSaving] = useState(false)
  const { admin, isLoading } = useAuth()
  console.log('Auth state:', { admin, isLoading })

  useEffect(() => {
    console.log('Spaces useEffect fired:', { isLoading, orphanage_id: admin?.orphanage_id })
    if (isLoading || !admin?.orphanage_id) return
    const fetchSpaces = async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, space_name')
        .eq('is_active', true)
        .eq('orphanage_id', admin.orphanage_id)
        .order('id')
      console.log('Spaces data:', data, 'Error:', error)
      if (data) {
        setSpaces(data)
        if (data.length > 0) setActiveSpace(data[0].id)
      }
    }
    fetchSpaces()
  }, [admin?.orphanage_id, isLoading])

  // Fetch time slots when active space changes
  useEffect(() => {
    if (!activeSpace) return
    fetchSlots()
  }, [activeSpace])

  const fetchSlots = async () => {
    if (!activeSpace) return
    setLoading(true)
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .eq('space_id', activeSpace)
      .eq('is_active', true)
      .order('start_time')
    if (data) setSlots(data)
    setLoading(false)
  }

  const generateLabel = (start: string, end: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':')
      const h = parseInt(hours)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}${minutes !== '00' ? `:${minutes}` : ''}${ampm}`
    }
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  const checkOverlap = (start: string, end: string, excludeId?: number) => {
    const newStart = start.slice(0, 5)
    const newEnd = end.slice(0, 5)

    return slots.some(slot => {
      if (excludeId && slot.id === excludeId) return false
      const slotStart = slot.start_time.slice(0, 5)
      const slotEnd = slot.end_time.slice(0, 5)

      return (
        (newStart >= slotStart && newStart < slotEnd) ||
        (newEnd > slotStart && newEnd <= slotEnd) ||
        (newStart <= slotStart && newEnd >= slotEnd) 
      )
    })
  }

  const openAdd = () => {
    setEditingSlot(null)
    setForm({ start_time: '', end_time: '' })
    setShowModal(true)
  }

  const openEdit = (slot: TimeSlot) => {
    setEditingSlot(slot)
    setForm({ start_time: slot.start_time, end_time: slot.end_time })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.start_time || !form.end_time) {
      alert('Please fill in both start and end time.')
      return
    }

    if (form.start_time >= form.end_time) {
      alert('End time must be after start time.')
      return
    }

    // Check overlap
    const hasOverlap = checkOverlap(
      form.start_time,
      form.end_time,
      editingSlot?.id
    )

    if (hasOverlap) {
      alert('This time slot overlaps with an existing slot for this space. Please choose a different time.')
      return
    }

    setSaving(true)
    const label = generateLabel(form.start_time, form.end_time)

    if (editingSlot) {
      await supabase
        .from('time_slots')
        .update({ ...form, label })
        .eq('id', editingSlot.id)
    } else {
      // Insert new time slot
      const { data: newSlot } = await supabase
        .from('time_slots')
        .insert({ ...form, label, is_active: true, space_id: activeSpace, orphanage_id: admin?.orphanage_id, })
        .select()
        .single()

      // Also insert space_timeslot_limit for this new slot
      if (newSlot) {
        const { data: spaceData } = await supabase  // ← add this fetch
        .from('spaces')
        .select('default_limit')
        .eq('id', activeSpace)
        .single()

        await supabase
          .from('space_timeslot_limits')
          .insert({
            space_id: activeSpace,
            time_slot_id: newSlot.id,
            max_users: spaceData?.default_limit ?? 8,
            orphanage_id: admin?.orphanage_id,
          })
      }
    }

    await fetchSlots()
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (slot: TimeSlot) => {
    if (!confirm(`Are you sure you want to delete "${slot.label}"?`)) return

    // Delete space_timeslot_limits first
    await supabase
      .from('space_timeslot_limits')
      .delete()
      .eq('time_slot_id', slot.id)

    // Delete availability
    await supabase
      .from('availability')
      .delete()
      .eq('time_slot_id', slot.id)

    // Delete time slot
    await supabase
      .from('time_slots')
      .delete()
      .eq('id', slot.id)

    await fetchSlots()
  }

  return (
    <div>
      {/* Space Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {spaces.map(space => (
          <button
            key={space.id}
            onClick={() => setActiveSpace(space.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeSpace === space.id
                ? 'border-[#FF6347] text-[#FF6347]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {space.space_name}
          </button>
        ))}
      </div>

      {/* Empty state check */}
      {!loading && spaces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-2">No components yet</p>
          <p className="text-gray-300 text-sm">Go to the Components tab to add a component first.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Time Slots — {spaces.find(s => s.id === activeSpace)?.space_name}
            </h2>
            <button
              onClick={openAdd}
              className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium transition-colors"
            >
              Add Slot
            </button>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : slots.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No time slots for this space yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time Slot</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Start</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">End</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slots.map(slot => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{slot.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{slot.start_time}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{slot.end_time}</td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEdit(slot)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                      <button onClick={() => handleDelete(slot)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" value={form.start_time}
                  onChange={e => setForm({ ...form, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" value={form.end_time}
                  onChange={e => setForm({ ...form, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>
              {form.start_time && form.end_time && (
                <p className="text-sm text-[#FF6347]">Label: {generateLabel(form.start_time, form.end_time)}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving || !form.start_time || !form.end_time}
                className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}