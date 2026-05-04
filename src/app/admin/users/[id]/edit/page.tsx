'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'
import AdminGuard from '@/components/AdminGuard'
import SpaceScheduleView from '@/components/SpaceScheduleView'

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
  day_counts: Record<string, number>
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const sortDays = (days: string[]) => {
  return days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
}

export default function EditUserPage() {
  const { id } = useParams()
  const router = useRouter()
  const cleanId = Array.isArray(id) ? id[0] : id
  const numericId = parseInt(cleanId as string)

  const [spaces, setSpaces] = useState<Space[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [limits, setLimits] = useState<SpaceTimeslotLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([])
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityEntry[]>([])
  const [operatingDays, setOperatingDays] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

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
        supabase.from('users').select('*').eq('id', numericId).single(),
        supabase.from('spaces').select('*').eq('is_active', true),
        supabase.from('time_slots').select('*').eq('is_active', true).order('start_time'),
        supabase.from('availability').select('day, time_slot_id').eq('user_id', numericId),
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
        if (userRes.data.photo_url) {
          setPhotoPreview(userRes.data.photo_url)
        }
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
  }, [numericId])

  // Fetch operating days for selected space
  useEffect(() => {
    if (!form.space_id) return
    const fetchSpaceDays = async () => {
      const { data } = await supabase
        .from('space_operating_days')
        .select('day')
        .eq('space_id', parseInt(form.space_id))
        .order('id')
      if (data) setOperatingDays(sortDays(data.map((d: { day: string }) => d.day)))
    }
    fetchSpaceDays()
  }, [form.space_id])

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
          const { data: rows } = await supabase
            .from('availability')
            .select('user_id, day')
            .eq('time_slot_id', limit.time_slot_id)
            .eq('space_id', parseInt(form.space_id))
            .neq('user_id', numericId)

          const dayCountsMap: Record<string, number> = {}
          if (rows) {
            rows.forEach((row: { user_id: number; day: string }) => {
              if (!dayCountsMap[row.day]) dayCountsMap[row.day] = 0
              dayCountsMap[row.day]++
            })
          }

          return {
            time_slot_id: limit.time_slot_id,
            max_users: limit.max_users,
            day_counts: dayCountsMap
          }
        })
      )
      setLimits(counts)
    }
    fetchLimits()
  }, [form.space_id, numericId])

  const toggleAvailability = (day: string, timeSlotId: number) => {
    const exists = availability.find(
      a => a.day === day && a.time_slot_id === timeSlotId
    )

    if (exists) {
      setAvailability(prev =>
        prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId))
      )
    } else {
      const dayAlreadyHasSlot = availability.find(a => a.day === day)
      if (dayAlreadyHasSlot) {
        alert(`${day} already has a time slot assigned. Please uncheck it first.`)
        return
      }
      if (isSlotFull(timeSlotId, day)) {
        alert(`This time slot is full for ${day}!`)
        return
      }
      setAvailability(prev => [...prev, { day, time_slot_id: timeSlotId }])
    }
  }

  const isSelected = (day: string, timeSlotId: number) =>
    availability.some(a => a.day === day && a.time_slot_id === timeSlotId)

  const isSlotFull = (timeSlotId: number, day: string) => {
    const limit = limits.find(l => l.time_slot_id === timeSlotId)
    if (!limit) return false
    const dayCount = limit.day_counts[day] ?? 0
    return dayCount >= limit.max_users
  }

  const handleSave = async () => {
    if (availability.length === 0) {
      alert('Please select at least one available day and time slot.')
      return
    }
    setSaving(true)

    try {
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          birthdate: form.birthdate,
          grade_level: form.grade_level,
          space_id: parseInt(form.space_id),
        })
        .eq('id', numericId)

      if (userError) throw userError

      await supabase.from('availability').delete().eq('user_id', numericId)

      if (availability.length > 0) {
        const availabilityRows = availability.map(a => ({
          user_id: numericId,
          day: a.day,
          time_slot_id: a.time_slot_id,
          space_id: parseInt(form.space_id),
        }))

        const { error: availError } = await supabase
          .from('availability')
          .insert(availabilityRows)

        if (availError) throw availError
      }

      if (photoFile) {
        const photoUrl = await uploadPhoto(numericId)
        if (photoUrl) {
          await supabase
            .from('users')
            .update({ photo_url: photoUrl })
            .eq('id', numericId)
          setPhotoPreview(photoUrl)
          setPhotoFile(null)
        }
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async (userId: number): Promise<string | null> => {
    if (!photoFile) return null
    const fileExt = photoFile.name.split('.').pop()
    const fileName = `user-${userId}.${fileExt}`

    const { data: existingFiles } = await supabase.storage
      .from('profile-photos')
      .list('', { search: `user-${userId}` })

    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from('profile-photos')
        .remove(existingFiles.map(f => f.name))
    }

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, photoFile, { upsert: true })

    if (error) {
      console.error('Photo upload error:', error)
      return null
    }

    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove this photo?')) return

    const { data: existingFiles } = await supabase.storage
      .from('profile-photos')
      .list('', { search: `user-${numericId}` })

    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from('profile-photos')
        .remove(existingFiles.map(f => f.name))
    }

    await supabase
      .from('users')
      .update({ photo_url: null })
      .eq('id', numericId)

    setPhotoPreview(null)
    setPhotoFile(null)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    setLoading(true)

    try {
      const { data: sessions } = await supabase
        .from('attendance_session')
        .select('id')
        .eq('user_id', numericId)

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        const { error: surveyError } = await supabase
          .from('survey_responses')
          .delete()
          .in('session_id', sessionIds)
        if (surveyError) throw surveyError
      }

      const { error: sessionError } = await supabase
        .from('attendance_session')
        .delete()
        .eq('user_id', numericId)
      if (sessionError) throw sessionError

      const { error: availError } = await supabase
        .from('availability')
        .delete()
        .eq('user_id', numericId)
      if (availError) throw availError

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', numericId)
      if (userError) throw userError

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
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF2F0' }}>
          <p className="text-gray-500">Loading user...</p>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow p-8">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black">
                {form.first_name} {form.last_name}
              </h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                form.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Profile Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl border border-gray-200">
                      👤
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="photo-upload"
                      className={`px-4 py-2 rounded-lg text-sm ${
                        isEditing
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Choose Photo
                    </label>
                    {photoPreview && isEditing && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="ml-2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                <input
                  type="date"
                  value={form.birthdate}
                  onChange={e => setForm({ ...form, birthdate: e.target.value })}
                  disabled={!isEditing}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <select
                  value={form.grade_level}
                  onChange={e => setForm({ ...form, grade_level: e.target.value })}
                  disabled={!isEditing}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Space Assignment</label>
                <div className="flex gap-4">
                  {spaces.map(space => (
                    <label
                      key={space.id}
                      className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <input
                        type="radio"
                        className="accent-[#FF6347]"
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
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">Time</th>
                      {operatingDays.map(day => (
                        <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(slot => (
                      <tr key={slot.id} className="border-t">
                        <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">
                          {slot.label}
                        </td>
                        {operatingDays.map(day => (
                          <td key={day} className="text-center py-2 px-2">
                            {isSlotFull(slot.id, day) && !isSelected(day, slot.id) && (
                              <span className="block text-red-400 text-xs">Full</span>
                            )}
                            <input
                              type="checkbox"
                              checked={isSelected(day, slot.id)}
                              onChange={() => isEditing && toggleAvailability(day, slot.id)}
                              disabled={!isEditing || (isSlotFull(slot.id, day) && !isSelected(day, slot.id))}
                              className={`w-4 h-4 accent-[#FF6347] disabled:cursor-not-allowed ${
                                !isEditing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                              {form.space_id && (
                <SpaceScheduleView
                  spaceId={parseInt(form.space_id)}
                  operatingDays={operatingDays}
                  // excludeUserId={numericId}
                />
              )}
              </div>
              {/* {form.space_id && (
                <SpaceScheduleView
                  spaceId={parseInt(form.space_id)}
                  operatingDays={operatingDays}
                  excludeUserId={numericId}
                />
              )} */}
            </div>

            {/* QR Code Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">QR Code</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
                >
                  {showQR ? 'Hide QR' : 'Show QR'}
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm"
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
                    className="flex-1 bg-[#EEEEC6] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium"
                  >
                    Edit
                  </button>
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
                    className="flex-1 bg-[#CEE4B8] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium disabled:opacity-50"
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
    </AdminGuard>
  )
}