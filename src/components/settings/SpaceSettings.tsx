'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Space = {
  id: number
  space_name: string
  age_group: string
  min_grade: number
  max_grade: number
  is_active: boolean
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
  const [saving, setSaving] = useState(false)

  const fetchSpaces = async () => {
    const { data } = await supabase.from('spaces').select('*').order('id')
    if (data) setSpaces(data)
    setLoading(false)
  }

  useEffect(() => { fetchSpaces() }, [])

  const openAdd = () => {
    setEditingSpace(null)
    setForm({ space_name: '', age_group: 'Junior', min_grade: '', max_grade: '' })
    setShowModal(true)
  }

  const openEdit = (space: Space) => {
    setEditingSpace(space)
    setForm({
      space_name: space.space_name,
      age_group: space.age_group,
      min_grade: space.min_grade.toString(),
      max_grade: space.max_grade.toString()
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      space_name: form.space_name,
      age_group: form.age_group,
      min_grade: parseInt(form.min_grade),
      max_grade: parseInt(form.max_grade)
    }
    if (editingSpace) {
      await supabase.from('spaces').update(payload).eq('id', editingSpace.id)
    } else {
      await supabase.from('spaces').insert({ ...payload, is_active: true })
    }
    await fetchSpaces()
    setShowModal(false)
    setSaving(false)
  }

//   const handleToggle = async (space: Space) => {
//     if (!confirm(`Are you sure you want to ${space.is_active ? 'deactivate' : 'activate'} this space?`)) return
//     await supabase.from('spaces').update({ is_active: !space.is_active }).eq('id', space.id)
//     await fetchSpaces()
//   }
  const handleDelete = async (space: Space) => {
    if (!confirm(`Are you sure you want to delete "${space.space_name}"? This cannot be undone.`)) return
    await supabase.from('spaces').delete().eq('id', space.id)
    await fetchSpaces()
    }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Spaces</h2>
        <button
          onClick={openAdd}
          className="bg-[#CEE4B8] text-black hover:bg-[#414141] hover:text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add Space
        </button>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Age Group</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Grade Range</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {spaces.map(space => (
            <tr key={space.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{space.space_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{space.age_group}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Grade {space.min_grade} - {space.max_grade}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  space.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {space.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 flex gap-3">
                <button
                  onClick={() => openEdit(space)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                   Edit
                </button>
                <button
                    onClick={() => handleDelete(space)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    >
                    Delete
                </button>
                {/* <button
                  onClick={() => handleToggle(space)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  {space.is_active ? '❌ Deactivate' : '✅ Activate'}
                </button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="accent-[#CEE4B8]"
                      type="radio"
                      value="Junior"
                      checked={form.age_group === 'Junior'}
                      onChange={e => setForm({ ...form, age_group: e.target.value })}
                    />
                    <span className="text-sm text-black">Junior</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="accent-[#CEE4B8]"
                      type="radio"
                      value="Senior"
                      checked={form.age_group === 'Senior'}
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Grade</label>
                  <input
                    type="number"
                    value={form.max_grade}
                    onChange={e => setForm({ ...form, max_grade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#CEE4B8] text-black hover:bg-[#414141] hover:text-white py-2 rounded-lg font-medium disabled:opacity-50"
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