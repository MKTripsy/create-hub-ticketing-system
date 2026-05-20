'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Space = {
  id: number
  space_name: string
  age_group: string
  min_grade: number
  max_grade: number
  is_active: boolean
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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
    min_grade: '',
    max_grade: ''
  })
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const { admin, isLoading } = useAuth()

  // const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // const sortDays = (days: string[]) => {
  //   return days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
  // }

  const fetchSpaces = async () => {
    if (!admin?.orphanage_id) return
    const { data } = await supabase.from('spaces').select('*').eq('orphanage_id', admin.orphanage_id).order('id')
    if (data) setSpaces(data)
    setLoading(false)
  }

  // useEffect(() => {
  //   if (isLoading || !admin?.orphanage_id) return
  //   fetchSpaces()
  // }, [admin?.orphanage_id, isLoading])

  useEffect(() => { fetchSpaces() }, [])
  const fetchSpaceDays = async (spaceId: number) => {
    const { data, error } = await supabase
      .from('space_operating_days')
      .select('day')
      .eq('space_id', Number(spaceId))
    
    console.log('Space ID being fetched:', spaceId)
    console.log('Fetched days:', data)
    console.log('Error:', error)
    
    // if (data) setSelectedDays(data.map(d => d.day))
    if (data) setSelectedDays(sortDays(data.map(d => d.day)))
  }

  const openAdd = () => {
    setEditingSpace(null)
    setForm({ space_name: '', age_group: 'Junior', min_grade: '', max_grade: '' })
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    setShowModal(true)
  }

  const openEdit = async (space: Space) => {
    setEditingSpace(space)
    setForm({
      space_name: space.space_name,
      age_group: space.age_group,
      min_grade: space.min_grade.toString(),
      max_grade: space.max_grade.toString()
    })
    await fetchSpaceDays(space.id)
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
    setSaving(true)
    const payload = {
      space_name: form.space_name,
      age_group: form.age_group,
      min_grade: parseInt(form.min_grade),
      max_grade: parseInt(form.max_grade)
    }

    let spaceId: number

    if (editingSpace) {
      await supabase.from('spaces').update(payload).eq('id', editingSpace.id)
      spaceId = editingSpace.id

      // Delete old days
      await supabase
        .from('space_operating_days')
        .delete()
        .eq('space_id', spaceId)
    } else {
      const { data } = await supabase
        .from('spaces')
        .insert({ ...payload, is_active: true, orphanage_id: admin?.orphanage_id,  })
        .select()
        .single()
      spaceId = data.id
    }

    // Insert new days
    if (selectedDays.length > 0) {
      await supabase
        .from('space_operating_days')
        .insert(selectedDays.map(day => ({ space_id: spaceId, day, orphanage_id: admin?.orphanage_id,  })))
    }

    await fetchSpaces()
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (space: Space) => {
    if (!confirm(`Are you sure you want to delete "${space.space_name}"?`)) return

    // Delete space operating days first
    await supabase.from('space_operating_days').delete().eq('space_id', space.id)
    await supabase.from('spaces').delete().eq('id', space.id)
    await fetchSpaces()
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
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Grade Range</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Operating Days</th>
            {/* <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th> */}
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
              {editingSpace ? 'Edit Space' : 'Add Space'}
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
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Grade</label>
                  <input
                    type="number"
                    value={form.min_grade}
                    onChange={e => setForm({ ...form, min_grade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Grade</label>
                  <input
                    type="number"
                    value={form.max_grade}
                    onChange={e => setForm({ ...form, max_grade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                  />
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
  onDelete
}: {
  space: Space
  onEdit: (space: Space) => void
  onDelete: (space: Space) => void
}) {
  const [days, setDays] = useState<string[]>([])

  useEffect(() => {
    const fetchDays = async () => {
      console.log('Fetching days for space_id:', space.id, 'type:', typeof space.id)
      const { data, error } = await supabase
        .from('space_operating_days')
        .select('day')
        .eq('space_id', Number(space.id))
        .order('id')

         console.log('SpaceRow days for space', space.id, ':', data, error) // ← add
         
        const { data: allData } = await supabase
          .from('space_operating_days')
          .select('*')

        console.log('All space_operating_days:', allData)
        console.log('Filtered manually:', allData?.filter(d => d.space_id === Number(space.id)))


      // if (data) setDays(data.map(d => d.day))
      if (data) setDays(sortDays(data.map(d => d.day)))
    }
    fetchDays()
  }, [space.id])

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-800">{space.space_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{space.age_group}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        Grade {space.min_grade} - {space.max_grade}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {days.length > 0
          ? days.map(d => d.slice(0, 3)).join(', ')
          : <span className="text-gray-300">None</span>
        }
      </td>
      {/* <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          space.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {space.is_active ? 'Active' : 'Inactive'}
        </span>
      </td> */}
      <td className="px-4 py-3 flex gap-3">
        <button
          onClick={() => onEdit(space)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(space)}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}