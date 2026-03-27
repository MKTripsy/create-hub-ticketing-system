'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'

type Space = {
  id: number
  space_name: string
  min_grade: number
  max_grade: number
}

type TimeSlot = {
  id: number
  label: string
}

type AvailabilityEntry = {
  day: string
  time_slot_id: number
}

type SpaceTimeslotLimit = {
  time_slot_id: number
  max_users: number
  current_count: number
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function EditUserPage() {
  const { id } = useParams()
  const router = useRouter()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [limits, setLimits] = useState<SpaceTimeslotLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([])
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityEntry[]>([])

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    grade_level: '',
    space_id: '',
    qr_code: '',
    is_active: true,
  })

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      const [userRes, spacesRes, timeSlotsRes, availRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', id).single(),
        supabase.from('spaces').select('*').eq('is_active', true),
        supabase.from('time_slots').select('*').eq('is_active', true).order('start_time'),
        supabase.from('availability').select('day, time_slot_id').eq('user_id', id)
      ])

      if (userRes.data) {
        setForm({
          first_name: userRes.data.first_name,
          last_name: userRes.data.last_name,
          birthdate: userRes.data.birthdate,
          grade_level: userRes.data.grade_level,
          space_id: userRes.data.space_id.toString(),
          qr_code: userRes.data.qr_code,
          is_active: userRes.data.is_active,
        })
      }
      if (spacesRes.data) setSpaces(spacesRes.data)
      if (timeSlotsRes.data) setTimeSlots(timeSlotsRes.data)
      if (availRes.data) {
        setAvailability(availRes.data)
        setOriginalAvailability(availRes.data)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  // Fetch limits when space changes
  useEffect(() => {
    if (!form.space_id) return

    const fetchLimits = async () => {
      const { data: limitsData } = await supabase
        .from('space_timeslot_limits')
        .select('time_slot_id, max_users')
        .eq('space_id', parseInt(form.space_id))

      if (!limitsData) return

      const counts = await Promise.all(
        limitsData.map(async (limit) => {
          const { count } = await supabase
            .from('availability')
            .select('id', { count: 'exact' })
            .eq('time_slot_id', limit.time_slot_id)
            .eq('space_id', parseInt(form.space_id))
            .neq('user_id', id)

          return {
            time_slot_id: limit.time_slot_id,
            max_users: limit.max_users,
            current_count: count ?? 0
          }
        })
      )
      setLimits(counts)
    }
    fetchLimits()
  }, [form.space_id, id])

  const toggleAvailability = (day: string, timeSlotId: number) => {
    const exists = availability.find(
      a => a.day === day && a.time_slot_id === timeSlotId
    )

    if (exists) {
      setAvailability(prev =>
        prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId))
      )
    } else {
      const limit = limits.find(l => l.time_slot_id === timeSlotId)
      if (limit && limit.current_count >= limit.max_users) {
        alert(`This time slot is full!`)
        return
      }
      setAvailability(prev => [...prev, { day, time_slot_id: timeSlotId }])
    }
  }

  const isSelected = (day: string, timeSlotId: number) =>
    availability.some(a => a.day === day && a.time_slot_id === timeSlotId)

  const isSlotFull = (timeSlotId: number) => {
    const limit = limits.find(l => l.time_slot_id === timeSlotId)
    if (!limit) return false
    return limit.current_count >= limit.max_users
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Update user
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          birthdate: form.birthdate,
          grade_level: form.grade_level,
          space_id: parseInt(form.space_id),
        })
        .eq('id', id)

      if (userError) throw userError

      // Delete old availability
      await supabase.from('availability').delete().eq('user_id', id)

      // Insert new availability
      if (availability.length > 0) {
        const availabilityRows = availability.map(a => ({
          user_id: parseInt(id as string),
          day: a.day,
          time_slot_id: a.time_slot_id,
          space_id: parseInt(form.space_id),
        }))

        const { error: availError } = await supabase
          .from('availability')
          .insert(availabilityRows)

        if (availError) throw availError
      }

      setIsEditing(false)
      alert('User updated successfully!')

    } catch (error) {
      console.error('Error updating user:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm(`Are you sure you want to ${form.is_active ? 'deactivate' : 'activate'} this user?`)) return

    const { error } = await supabase
      .from('users')
      .update({ is_active: !form.is_active })
      .eq('id', id)

    if (error) {
      alert('Something went wrong.')
      return
    }

    setForm(prev => ({ ...prev, is_active: !prev.is_active }))
  }

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this user?')) return
  setLoading(true)

  try {
    const { error: availError } = await supabase
      .from('availability')
      .delete()
      .eq('user_id', parseInt(id as string))

    if (availError) {
      console.error('Availability delete error:', availError)
      throw availError
    }

    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', parseInt(id as string))

    if (userError) {
      console.error('User delete error:', userError)
      throw userError
    }

    router.push('/admin/users')

  } catch (error) {
    console.error('Error deleting user:', error)
    alert('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}

  const handleCancel = () => {
    setAvailability(originalAvailability)
    setIsEditing(false)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${form.first_name} ${form.last_name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
          </style>
        </head>
        <body>
          <h2>${form.first_name} ${form.last_name}</h2>
          <div id="qr"></div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.getElementById('qr'), '${form.qr_code}', { width: 200 })
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading user...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {form.first_name} {form.last_name}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              form.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {form.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birthdate
              </label>
              <input
                type="date"
                value={form.birthdate}
                onChange={e => setForm({ ...form, birthdate: e.target.value })}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={form.grade_level}
                onChange={e => setForm({ ...form, grade_level: e.target.value })}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
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
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Space Assignment
              </label>
              <div className="flex gap-4">
                {spaces.map(space => (
                  <label
                    key={space.id}
                    className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <input
                      type="radio"
                      name="space"
                      value={space.id}
                      checked={form.space_id === space.id.toString()}
                      onChange={e => setForm({ ...form, space_id: e.target.value })}
                      disabled={!isEditing}
                    />
                    <span className="text-sm text-gray-700">{space.space_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Availability Grid */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Availability
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">
                      Day
                    </th>
                    {timeSlots.map(slot => (
                      <th key={slot.id} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
                        {slot.label}
                        {isSlotFull(slot.id) && !isSelected('Monday', slot.id) && (
                          <span className="block text-red-400 text-xs">Full</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day} className="border-t">
                      <td className="py-2 pr-4 text-gray-700 font-medium">
                        {day}
                      </td>
                      {timeSlots.map(slot => (
                        <td key={slot.id} className="text-center py-2 px-2">
                          <input
                            type="checkbox"
                            checked={isSelected(day, slot.id)}
                            onChange={() => isEditing && toggleAvailability(day, slot.id)}
                            disabled={!isEditing || (isSlotFull(slot.id) && !isSelected(day, slot.id))}
                            className="w-4 h-4 accent-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
              QR Code
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowQR(!showQR)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
              <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Print QR
              </button>
            </div>
            {showQR && (
              <div className="mt-4 flex justify-center">
                <QRCode value={form.qr_code} size={200} />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Edit
                </button>
                {/* <button
                  onClick={handleDeactivate}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    form.is_active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {form.is_active ? '❌ Deactivate' : '✅ Activate'}
                </button> */}
                
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>

                <button
                  onClick={() => router.push('/admin/users')}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                   Cancel
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}