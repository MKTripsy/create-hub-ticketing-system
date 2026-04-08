'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Space = {
  id: number
  space_name: string
}

type SurveyOption = {
  id: number
  label: string
  space_id: number
  is_active: boolean
}

export default function SurveyOptionSettings() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [options, setOptions] = useState<SurveyOption[]>([])
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOption, setEditingOption] = useState<SurveyOption | null>(null)
  const [form, setForm] = useState({ label: '' })
  const [saving, setSaving] = useState(false)

  const fetchSpaces = async () => {
    const { data } = await supabase.from('spaces').select('id, space_name').eq('is_active', true)
    if (data) {
      setSpaces(data)
      if (data.length > 0) setSelectedSpace(data[0].id)
    }
    setLoading(false)
  }

  const fetchOptions = async () => {
    if (!selectedSpace) return
    const { data } = await supabase
      .from('survey_options')
      .select('*')
      .eq('space_id', selectedSpace)
      .order('id')
    if (data) setOptions(data)
  }

  useEffect(() => { fetchSpaces() }, [])
  useEffect(() => { fetchOptions() }, [selectedSpace])

  const openAdd = () => {
    setEditingOption(null)
    setForm({ label: '' })
    setShowModal(true)
  }

  const openEdit = (option: SurveyOption) => {
    setEditingOption(option)
    setForm({ label: option.label })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!selectedSpace) return
    setSaving(true)
    if (editingOption) {
      await supabase
        .from('survey_options')
        .update({ label: form.label })
        .eq('id', editingOption.id)
    } else {
      await supabase
        .from('survey_options')
        .insert({ label: form.label, space_id: selectedSpace, is_active: true })
    }
    await fetchOptions()
    setShowModal(false)
    setSaving(false)
  }

    const handleDelete = async (option: SurveyOption) => {
        if (!confirm(`Are you sure you want to delete "${option.label}"?`)) return
        await supabase.from('survey_options').delete().eq('id', option.id)
        await fetchOptions()
    }
//   const handleToggle = async (option: SurveyOption) => {
//     await supabase
//       .from('survey_options')
//       .update({ is_active: !option.is_active })
//       .eq('id', option.id)
//     await fetchOptions()
//   }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Survey Options</h2>
        <button
          onClick={openAdd}
          className="bg-[#CEE4B8] text-black hover:bg-[#414141] hover:text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add Option
        </button>
      </div>

      {/* Space selector */}
      <div className="flex gap-2 mb-6">
        {spaces.map(space => (
          <button
            key={space.id}
            onClick={() => setSelectedSpace(space.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSpace === space.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {space.space_name}
          </button>
        ))}
      </div>

      {options.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No options for this space yet</p>
      ) : (
        <div className="space-y-2">
          {options.map(option => (
            <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  option.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {option.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-800">{option.label}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(option)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                onClick={() => handleDelete(option)}
                className="text-red-500 hover:text-red-700 text-sm"
                >
                    Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingOption ? 'Edit Option' : 'Add Option'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm({ label: e.target.value })}
                placeholder="e.g. Painting"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
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