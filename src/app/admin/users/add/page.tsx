'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import QRCode from 'react-qr-code'

// Types
type Space = {
  id: number
  space_name: string
  min_grade: number
  max_grade: number
}

export default function AddUserPage() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [generatedId, setGeneratedId] = useState('')
  const [qrValue, setQrValue] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    grade_level: '',
    space_id: '',
  })

  // Fetch spaces on load
  useEffect(() => {
    const fetchSpaces = async () => {
      const { data } = await supabase
        .from('spaces')
        .select('*')
        .eq('is_active', true)
      if (data) setSpaces(data)
    }
    fetchSpaces()
  }, [])

  // Auto-assign space based on grade
  useEffect(() => {
    if (form.grade_level) {
      const grade = parseInt(form.grade_level)
      const matchedSpace = spaces.find(
        s => grade >= s.min_grade && grade <= s.max_grade
      )
      if (matchedSpace) {
        setForm(prev => ({ ...prev, space_id: matchedSpace.id.toString() }))
      }
    }
  }, [form.grade_level, spaces])

  // Generate custom ID
  const generateCustomId = async () => {
    const year = new Date().getFullYear().toString().slice(-2)
    const branchAbbr = 'HOH' // Change this per branch

    const { data } = await supabase
      .from('users')
      .select('custom_id')
      .order('id', { ascending: false })
      .limit(1)

    const lastNumber = data?.[0]?.custom_id?.split('-')[2] || '0000'
    const newNumber = String(parseInt(lastNumber) + 1).padStart(4, '0')

    return `${branchAbbr}-${year}-${newNumber}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Generate ID and QR code
      const customId = await generateCustomId()
      const qrCode = uuidv4()

      const { error } = await supabase.from('users').insert({
        custom_id: customId,
        first_name: form.first_name,
        last_name: form.last_name,
        birthdate: form.birthdate,
        grade_level: form.grade_level,
        space_id: parseInt(form.space_id),
        qr_code: qrCode,
        is_active: true,
      })

      if (error) throw error

      setGeneratedId(customId)
      setQrValue(qrCode)
      setSuccess(true)

    } catch (error) {
      console.error('Error adding user:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSuccess(false)
    setGeneratedId('')
    setQrValue('')
    setForm({
      first_name: '',
      last_name: '',
      birthdate: '',
      grade_level: '',
      space_id: '',
    })
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            ✅ User Added Successfully!
          </h2>
          <p className="text-gray-500 mb-6">
            {form.first_name} {form.last_name} has been registered.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">User ID</p>
            <p className="text-2xl font-bold text-gray-800">{generatedId}</p>
          </div>

          <div className="flex justify-center mb-6">
            <QRCode value={qrValue} size={200} />
          </div>

          <p className="text-sm text-gray-400 mb-6">
            Download or print this QR code for the child.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Add Another User
            </button>
            <a
            href="/admin/users"
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-center">
                View All Users
            </a>
            </div>
          </div>
        </div>
      
    )
  }

  // Add user form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={e => setForm({ ...form, first_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First Name Here"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={e => setForm({ ...form, last_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last Name Here"
            />
          </div>

          {/* Birthdate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birthdate <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.birthdate}
              onChange={e => setForm({ ...form, birthdate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.grade_level}
              onChange={e => setForm({ ...form, grade_level: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Grade Level</option>
              <option value="1">Grade 1</option>
              <option value="2">Grade 2</option>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
            </select>
          </div>

          {/* Space Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Space Assignment <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {spaces.map(space => (
                <label key={space.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="space"
                    value={space.id}
                    checked={form.space_id === space.id.toString()}
                    onChange={e => setForm({ ...form, space_id: e.target.value })}
                  />
                  <span className="text-sm text-gray-700">{space.space_name}</span>
                </label>
              ))}
            </div>
            {form.grade_level && (
              <p className="text-xs text-blue-500 mt-1">
                ℹ️ Auto-assigned based on grade level. You may override this.
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Adding User...' : 'Add User'}
          </button>

        </form>
      </div>
    </div>
  )
}