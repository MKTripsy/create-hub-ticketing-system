'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Space = {
  id: number
  space_name: string
  age_group: string
  is_active: boolean
  default_limit: number
}

type TimeslotLimit = {
  time_slot_id: number
  label: string
  max_users: number
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ALL_GRADES = [
  'Daycare', 'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
]

const sortDays = (days: string[]) => {
  return days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
}

export default function SpaceSettings() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [form, setForm] = useState({
    space_name: '',
    age_group: 'Junior',
    default_limit: 8,
  })
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const { admin, isLoading } = useAuth()
  const [timeslotLimits, setTimeslotLimits] = useState<TimeslotLimit[]>([])

  const fetchSpaces = async () => {
    if (!admin?.orphanage_id) return
    const { data } = await supabase.from('spaces').select('*').eq('orphanage_id', admin.orphanage_id).order('id')
    if (data) setSpaces(data)
    setLoading(false)
  }

  useEffect(() => { fetchSpaces() }, [])
  const fetchSpaceDays = async (spaceId: number) => {
    const { data } = await supabase
      .from('space_operating_days')
      .select('day')
      .eq('space_id', Number(spaceId))
    
    // if (data) setSelectedDays(data.map(d => d.day))
    if (data) setSelectedDays(sortDays(data.map(d => d.day)))
  }

  const openAdd = () => {
    setEditingSpace(null)
    setForm({ space_name: '', age_group: 'Junior', default_limit: 8 })
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    setSelectedGrades([])
    setShowModal(true)
  }

  const [selectedGrades, setSelectedGrades] = useState<string[]>([])

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev =>
      prev.includes(grade)
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    )
  }

  const fetchSpaceGrades = async (spaceId: number) => {
    const { data } = await supabase
      .from('space_grades')
      .select('grade')
      .eq('space_id', spaceId)
    if (data) setSelectedGrades(data.map(g => g.grade))
  }

  const openEdit = async (space: Space) => {
    setEditingSpace(space)
    setForm({
      space_name: space.space_name,
      age_group: space.age_group,
      default_limit: space.default_limit ?? 8, 
    })
    await fetchSpaceGrades(space.id)
    await fetchSpaceDays(space.id)
    await openLimits(space)
    setShowModal(true)
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const handleSave = async () => {
    if (!form.space_name) { alert('Please enter a space name.'); return }
    setSaving(true)

    const payload = {
      space_name: form.space_name,
      age_group: form.age_group,
      default_limit: form.default_limit,
    }

    let spaceId: number

    if (editingSpace) {
      await supabase.from('spaces').update(payload).eq('id', editingSpace.id)
      spaceId = editingSpace.id
      await supabase.from('space_operating_days').delete().eq('space_id', spaceId)
      await supabase.from('space_grades').delete().eq('space_id', spaceId)  // ← add
    } else {
      const { data } = await supabase
        .from('spaces')
        .insert({ ...payload, is_active: true, orphanage_id: admin?.orphanage_id })
        .select()
        .single()
      spaceId = data.id
    }

    if (selectedDays.length > 0) {
      await supabase.from('space_operating_days')
        .insert(selectedDays.map(day => ({ space_id: spaceId, day, orphanage_id: admin?.orphanage_id })))
    }

    // ← Save grades
    if (selectedGrades.length > 0) {
      await supabase.from('space_grades')
        .insert(selectedGrades.map(grade => ({
          space_id: spaceId,
          grade,
          orphanage_id: admin?.orphanage_id
        })))
    }

    // Save limits if editing
    if (editingSpace && timeslotLimits.length > 0) {
      for (const limit of timeslotLimits) {
        await supabase
          .from('space_timeslot_limits')
          .update({ max_users: limit.max_users })
          .eq('space_id', editingSpace.id)
          .eq('time_slot_id', limit.time_slot_id)
      }
    }

    await fetchSpaces()
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (space: Space) => {
    if (!confirm(`Are you sure you want to delete "${space.space_name}"?`)) return
    await supabase.from('space_operating_days').delete().eq('space_id', space.id)
    await supabase.from('space_grades').delete().eq('space_id', space.id)
    await supabase.from('spaces').delete().eq('id', space.id)
    await fetchSpaces()
  }

  const openLimits = async (space: Space) => {
    const { data: slots } = await supabase
      .from('time_slots')
      .select('id, label')
      .eq('space_id', space.id)
      .eq('is_active', true)
      .order('start_time')

    if (!slots || slots.length === 0) { setTimeslotLimits([]); return }

    // Just get the first slot's limit as the space-wide limit
    const { data: limitData } = await supabase
      .from('space_timeslot_limits')
      .select('max_users')
      .eq('space_id', space.id)
      .limit(1)
      .single()

    setTimeslotLimits(slots.map(slot => ({
      time_slot_id: slot.id,
      label: slot.label,
      max_users: limitData?.max_users ?? 8
    })))
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Components</h2>
        <button
          onClick={openAdd}
          className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium"
        >
          Add Component
        </button>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Age Group</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Eligible Grades</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Operating Days</th>
            {/* <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th> */}
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Enrollment Limit</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {spaces.map(space => (
            <SpaceRow
              key={space.id}
              space={space}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingSpace ? 'Edit Component' : 'Add Component'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Space Name</label>
                <input
                  type="text"
                  value={form.space_name}
                  onChange={e => setForm({ ...form, space_name: e.target.value })}
                  placeholder="e.g. Arts Space"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Junior"
                      checked={form.age_group === 'Junior'}
                      className="accent-[#FF6347]"
                      onChange={e => setForm({ ...form, age_group: e.target.value })}
                    />
                    <span className="text-sm text-black">Junior</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Senior"
                      checked={form.age_group === 'Senior'}
                      className="accent-[#FF6347]"
                      onChange={e => setForm({ ...form, age_group: e.target.value })}
                    />
                    <span className="text-sm text-black">Senior</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eligible Grades
                </label>
                <div className="grid grid-rows-8 grid-flow-col gap-1">
                  {ALL_GRADES.map(grade => (
                    <label key={grade} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGrades.includes(grade)}
                        onChange={() => toggleGrade(grade)}
                        className="w-4 h-4 accent-[#FF6347]"
                      />
                      <span className="text-sm text-gray-700">{grade}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Operating Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating Days
                </label>
                <div className="space-y-2">
                  {ALL_DAYS.map(day => (
                    <label
                      key={day}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day)}
                        onChange={() => toggleDay(day)}
                        className="w-4 h-4 accent-[#FF6347] text-black"
                      />
                      <span className="text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Default Enrollment Limit — only show when adding */}
            {!editingSpace && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Enrollment Limit per Timeslot
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.default_limit}
                  onChange={e => setForm({ ...form, default_limit: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Applies to all timeslots added to this space.
                </p>
              </div>
            )}

            {/* Enrollment Limit — only show when editing and timeslots exist */}
            {editingSpace && timeslotLimits.length > 0 && (
              <div className='mt-4'>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Limit per Timeslot
                </label>
                <input
                  type="number"
                  min={1}
                  value={timeslotLimits[0]?.max_users ?? 8}
                  onChange={e => {
                    const newLimit = parseInt(e.target.value) || 1
                    setTimeslotLimits(prev => prev.map(l => ({ ...l, max_users: newLimit })))
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Applies to all timeslots in this space.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
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

// Separate component to fetch and display days per space
function SpaceRow({
  space,
  onEdit,
  onDelete,
}: {
  space: Space
  onEdit: (space: Space) => void
  onDelete: (space: Space) => void
}) {
  const [days, setDays] = useState<string[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [limitSummary, setLimitSummary] = useState<string>('')

  useEffect(() => {
    const fetchDays = async () => {
      const { data } = await supabase
        .from('space_operating_days')
        .select('day')
        .eq('space_id', Number(space.id))
        .order('id')
      if (data) setDays(sortDays(data.map(d => d.day)))
    }

    const fetchGrades = async () => {
      const { data } = await supabase
        .from('space_grades')
        .select('grade')
        .eq('space_id', space.id)
      if (data) setGrades(data.map(g => g.grade))
    }

    const fetchLimits = async () => {
      const { data } = await supabase
        .from('space_timeslot_limits')
        .select('max_users')
        .eq('space_id', space.id)
      if (data && data.length > 0) {
        const unique = [...new Set(data.map(l => l.max_users))]
        setLimitSummary(unique.length === 1
          ? `${unique[0]} per slot`
          : `${Math.min(...unique)}-${Math.max(...unique)} per slot`)
      } else {
        setLimitSummary('—')
      }
    }

    fetchDays()
    fetchGrades()
    fetchLimits()
  }, [space.id])

   return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-800">{space.space_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{space.age_group}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {grades.length > 0
          ? grades.join(', ')
          : <span className="text-gray-300">None</span>
        }
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {days.length > 0
          ? days.map(d => d.slice(0, 3)).join(', ')
          : <span className="text-gray-300">None</span>
        }
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{limitSummary}</td>
      <td className="px-4 py-3 flex gap-3">
        <button onClick={() => onEdit(space)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
        <button onClick={() => onDelete(space)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
      </td>
    </tr>
  )
}