'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type TimeSlot = {
  id: number
  label: string
  start_time: string
  end_time: string
  is_active: boolean
}

export default function TimeSlotSettings() {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [form, setForm] = useState({ start_time: '', end_time: '' })
  const [saving, setSaving] = useState(false)

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .order('start_time')
    if (data) setSlots(data)
    setLoading(false)
  }

  useEffect(() => { fetchSlots() }, [])

  // Auto generate label from times
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
    setSaving(true)
    const label = generateLabel(form.start_time, form.end_time)
    if (editingSlot) {
      await supabase
        .from('time_slots')
        .update({ ...form, label })
        .eq('id', editingSlot.id)
    } else {
      await supabase
        .from('time_slots')
        .insert({ ...form, label, is_active: true })
    }
    await fetchSlots()
    setShowModal(false)
    setSaving(false)
  }

  // const handleDelete = async (slot: TimeSlot) => {
  //   if (!confirm(`Are you sure you want to delete "${slot.label}"?`)) return
  //   await supabase.from('time_slots').delete().eq('id', slot.id)
  //   await fetchSlots()
  // }

  const handleDelete = async (slot: TimeSlot) => {
    if (!confirm(`Are you sure you want to delete "${slot.label}"?`)) return

    console.log('Deleting slot:', slot.id) // ← add

    // Step 1 — Delete from space_timeslot_limits
    const { error: limitsError } = await supabase
      .from('space_timeslot_limits')
      .delete()
      .eq('time_slot_id', slot.id)

    console.log('Limits delete error:', limitsError) // ← add

    if (limitsError) {
      alert('Something went wrong at limits. Please try again.')
      return
    }

    // Step 2 — Delete from availability
    const { error: availError } = await supabase
      .from('availability')
      .delete()
      .eq('time_slot_id', slot.id)

    console.log('Availability delete error:', availError) // ← add

    if (availError) {
      alert('Something went wrong at availability. Please try again.')
      return
    }

    // Step 3 — Delete the time slot
    const { error: slotError } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', slot.id)

    console.log('Slot delete error:', slotError) // ← add

    if (slotError) {
      alert('Something went wrong at slot. Please try again.')
      return
    }

    await fetchSlots()
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Time Slots</h2>
        <button
          onClick={openAdd}
          className="bg-[#CEE4B8] text-black px-4 py-2 rounded-lg hover:bg-[#414141] hover:text-white text-sm font-medium"
        >
          + Add Slot
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No time slots yet</p>
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
                  <button
                    onClick={() => openEdit(slot)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(slot)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="bg-[#FAF2F0] fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm({ ...form, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm({ ...form, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {form.start_time && form.end_time && (
                <p className="text-sm text-black">
                  Label: {generateLabel(form.start_time, form.end_time)}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !form.start_time || !form.end_time}
                className="flex-1 bg-[#CEE4B8] text-black hover:bg-[#414141] hover:text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 'use client'

// import { useState, useEffect } from 'react'
// import { supabase } from '@/lib/supabase'

// type TimeSlot = {
//   id: number
//   label: string
//   start_time: string
//   end_time: string
//   is_active: boolean
// }

// export default function TimeSlotSettings() {
//   const [slots, setSlots] = useState<TimeSlot[]>([])
//   const [loading, setLoading] = useState(true)
//   const [showModal, setShowModal] = useState(false)
//   const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
//   const [form, setForm] = useState({ label: '', start_time: '', end_time: '' })
//   const [saving, setSaving] = useState(false)

//   const fetchSlots = async () => {
//     const { data } = await supabase
//       .from('time_slots')
//       .select('*')
//       .order('start_time')
//     if (data) setSlots(data)
//     setLoading(false)
//   }

//   useEffect(() => { fetchSlots() }, [])

//   const openAdd = () => {
//     setEditingSlot(null)
//     setForm({ label: '', start_time: '', end_time: '' })
//     setShowModal(true)
//   }

//   const openEdit = (slot: TimeSlot) => {
//     setEditingSlot(slot)
//     setForm({
//       label: slot.label,
//       start_time: slot.start_time,
//       end_time: slot.end_time
//     })
//     setShowModal(true)
//   }

//   const handleSave = async () => {
//     setSaving(true)
//     if (editingSlot) {
//       await supabase
//         .from('time_slots')
//         .update(form)
//         .eq('id', editingSlot.id)
//     } else {
//       await supabase
//         .from('time_slots')
//         .insert({ ...form, is_active: true })
//     }
//     await fetchSlots()
//     setShowModal(false)
//     setSaving(false)
//   }

//   const handleToggle = async (slot: TimeSlot) => {
//     await supabase
//       .from('time_slots')
//       .update({ is_active: !slot.is_active })
//       .eq('id', slot.id)
//     await fetchSlots()
//   }

//   if (loading) return <p className="text-gray-400">Loading...</p>

//   return (
//     <div>
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-lg font-semibold text-gray-800">Time Slots</h2>
//         <button
//           onClick={openAdd}
//           className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
//         >
//            Add Slot
//         </button>
//       </div>

//       {slots.length === 0 ? (
//         <p className="text-gray-400 text-center py-8">No time slots yet</p>
//       ) : (
//         <table className="w-full">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Label</th>
//               <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Start</th>
//               <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">End</th>
//               <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
//               <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {slots.map(slot => (
//               <tr key={slot.id} className="hover:bg-gray-50">
//                 <td className="px-4 py-3 text-sm text-gray-800">{slot.label}</td>
//                 <td className="px-4 py-3 text-sm text-gray-600">{slot.start_time}</td>
//                 <td className="px-4 py-3 text-sm text-gray-600">{slot.end_time}</td>
//                 <td className="px-4 py-3">
//                   <span className={`text-xs px-2 py-1 rounded-full font-medium ${
//                     slot.is_active
//                       ? 'bg-green-100 text-green-700'
//                       : 'bg-red-100 text-red-700'
//                   }`}>
//                     {slot.is_active ? 'Active' : 'Inactive'}
//                   </span>
//                 </td>
//                 <td className="px-4 py-3 flex gap-3">
//                   <button
//                     onClick={() => openEdit(slot)}
//                     className="text-blue-600 hover:text-blue-800 text-sm"
//                   >
//                      Edit
//                   </button>
//                   <button
//                     onClick={() => handleToggle(slot)}
//                     className="text-gray-500 hover:text-gray-700 text-sm"
//                   >
//                     {slot.is_active ? '❌ Deactivate' : '✅ Activate'}
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}

//       {/* Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
//             <h3 className="text-lg font-semibold text-gray-800 mb-4">
//               {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
//             </h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
//                 <input
//                   type="text"
//                   value={form.label}
//                   onChange={e => setForm({ ...form, label: e.target.value })}
//                   placeholder="e.g. 9AM - 10AM"
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
//                 <input
//                   type="time"
//                   value={form.start_time}
//                   onChange={e => setForm({ ...form, start_time: e.target.value })}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
//                 <input
//                   type="time"
//                   value={form.end_time}
//                   onChange={e => setForm({ ...form, end_time: e.target.value })}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//             </div>
//             <div className="flex gap-3 mt-6">
//               <button
//                 onClick={handleSave}
//                 disabled={saving}
//                 className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
//               >
//                 {saving ? 'Saving...' : 'Save'}
//               </button>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }