'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'react-qr-code'
import { toPng } from 'html-to-image'
import AdminGuard from '@/components/AdminGuard'
import SpaceScheduleView from '@/components/SpaceScheduleView'
import AvailabilityGrid from '@/components/users/AvailabilityGrid'
import UserFormFields from '@/components/users/UserFormFields'
import { useAuth } from '@/context/AuthContext'
import { useAvailabilityState } from '@/hooks/useAvailabilityState'
import { fetchSpacesWithGrades, fetchSpaceSchedule, Space } from '@/lib/api/spaces'
import { addUser } from '@/lib/api/addUser'
import { createNotification } from '@/lib/notifications'

type FormState = {
  first_name: string
  last_name: string
  birthdate: string
  grade_level: string
  primary_space_id: string
}

const EMPTY_FORM: FormState = {
  first_name: '', last_name: '', birthdate: '', grade_level: '', primary_space_id: '',
}

export default function AddUserPage() {
  const { admin, isLoading } = useAuth()
  const qrRef = useRef<HTMLDivElement>(null)

  const [spaces, setSpaces] = useState<Space[]>([])
  const [operatingDays, setOperatingDays] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [secondarySpaceIds, setSecondarySpaceIds] = useState<number[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [success, setSuccess] = useState(false)
  const [generatedId, setGeneratedId] = useState('')
  const [qrValue, setQrValue] = useState('')
  const [savedUser, setSavedUser] = useState({ first_name: '', last_name: '' })

  const avail = useAvailabilityState({
    getPrimarySpaceId: () => parseInt(form.primary_space_id) || null,
    getSecondarySpaceIds: () => secondarySpaceIds,
  })

  // Load spaces on mount
  useEffect(() => {
    if (isLoading || !admin?.orphanage_id) return
    fetchSpacesWithGrades(admin.orphanage_id).then(setSpaces)
  }, [admin?.orphanage_id, isLoading])

  // Load primary space schedule when primary_space_id changes
  useEffect(() => {
    if (!form.primary_space_id) return
    const spaceId = parseInt(form.primary_space_id)
    fetchSpaceSchedule(spaceId).then(data => {
      setOperatingDays(data.days)
      avail.loadSpaceSchedule(spaceId, data)
    })
  }, [form.primary_space_id])

  // Auto-assign space based on grade
  useEffect(() => {
    if (!form.grade_level || spaces.length === 0) return
    const gradeLabel = isNaN(parseInt(form.grade_level))
      ? form.grade_level
      : `Grade ${form.grade_level}`
    const matchedSpace = spaces.find(s => s.grades.includes(gradeLabel))
    if (matchedSpace) {
      setForm(prev => ({ ...prev, primary_space_id: matchedSpace.id.toString() }))
    }
  }, [form.grade_level, spaces])

  const handleToggleSecondarySpace = async (spaceId: number) => {
    if (secondarySpaceIds.includes(spaceId)) {
      setSecondarySpaceIds(prev => prev.filter(id => id !== spaceId))
      avail.removeSpaceAvailability(spaceId)
    } else {
      setSecondarySpaceIds(prev => [...prev, spaceId])
      if (!avail.operatingDaysBySpace[spaceId]) {
        const data = await fetchSpaceSchedule(spaceId)
        avail.loadSpaceSchedule(spaceId, data)
      }
      avail.setAvailabilityBySpace(prev => ({ ...prev, [spaceId]: [] }))
    }
  }

  const handlePrimarySpaceChange = (spaceId: string) => {
    setForm(prev => ({ ...prev, primary_space_id: spaceId }))
    setSecondarySpaceIds(prev => prev.filter(id => id !== parseInt(spaceId)))
    avail.setAvailability([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.primary_space_id) { alert('Please select a primary component.'); return }
    if (avail.availability.length === 0) { alert('Please select at least one available day and time slot for the primary space.'); return }
    setLoading(true)
    try {
      const { customId, qrCode } = await addUser({
        form,
        availability: avail.availability,
        availabilityBySpace: avail.availabilityBySpace,
        secondarySpaceIds,
        photoFile,
        orphanage_id: admin!.orphanage_id as number, 
        orphanage_code: admin!.orphanage_code || 'HOH',
      })
      setGeneratedId(customId)
      setQrValue(qrCode)
      setSavedUser({ first_name: form.first_name, last_name: form.last_name })
      setSuccess(true)
      if (!admin) return null
      await createNotification('user_added', `${admin.first_name} ${admin.last_name} added new user: ${form.first_name} ${form.last_name} (${customId})`, admin?.orphanage_id ?? undefined)
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
    setSecondarySpaceIds([])
    setPhotoFile(null)
    setPhotoPreview(null)
    setForm(EMPTY_FORM)
    avail.resetAll()
  }

  const handleDownloadPng = async () => {
    if (!qrRef.current) return
    try {
      const dataUrl = await toPng(qrRef.current, { quality: 1.0 })
      const link = document.createElement('a')
      link.download = `${generatedId}-qr.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error downloading QR:', error)
      alert('Something went wrong. Please try again.')
    }
  }

  const primaryLimits = avail.limitsBySpace[parseInt(form.primary_space_id)] || []

  if (success) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#FAF2F0' }}>
          <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-2">User Added Successfully!</h2>
            <p className="text-black mb-6">{savedUser.first_name} {savedUser.last_name} has been registered.</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-black mb-1">User ID</p>
              <p className="text-2xl font-bold text-black">{generatedId}</p>
            </div>
            <div ref={qrRef} className="flex flex-col items-center bg-white p-4 mb-2">
              <p className="font-bold text-black mb-1">{savedUser.first_name} {savedUser.last_name}</p>
              <p className="text-sm text-gray-500 mb-3">{generatedId}</p>
              <QRCode value={qrValue} size={200} />
            </div>
            <button onClick={handleDownloadPng} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium mb-6">
              Download QR as PNG
            </button>
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 bg-[#CEE4B8] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white">
                Add Another User
              </button>
              <a href="/admin/users" className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-center">
                View All Users
              </a>
            </div>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h1>

            <form onSubmit={handleSubmit} className="space-y-6">

              <UserFormFields
                form={form}
                onChange={updates => setForm(prev => ({ ...prev, ...updates }))}
                spaces={spaces}
                secondarySpaceIds={secondarySpaceIds}
                onToggleSecondarySpace={handleToggleSecondarySpace}
                onPrimarySpaceChange={handlePrimarySpaceChange}
                photoPreview={photoPreview}
                onPhotoChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setPhotoFile(file)
                  setPhotoPreview(URL.createObjectURL(file))
                }}
                onRemovePhoto={() => { setPhotoFile(null); setPhotoPreview(null) }}
                accentColor="#CEE4B8"
                showAutoAssignHint
              />

              {/* Primary Availability */}
              {form.primary_space_id && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                    Availability — {spaces.find(s => s.id.toString() === form.primary_space_id)?.space_name}
                    <span className="text-red-500"> *</span>
                  </h2>
                  <p className="text-sm text-gray-500">Select which days and time slots this child is available. Grayed out slots are full.</p>
                  <AvailabilityGrid
                    operatingDays={operatingDays}
                    timeSlots={avail.timeSlotsBySpace[parseInt(form.primary_space_id)] || []}
                    isSelected={(day, slotId) => avail.isSelected(day, slotId)}
                    isSlotFull={(slotId, day) => avail.isSlotFull(primaryLimits, slotId, day)}
                    onToggle={(day, slotId) => avail.toggleAvailability(day, slotId, primaryLimits, parseInt(form.primary_space_id))}
                    accentColor="#CEE4B8"
                  />
                  {avail.availability.length > 0 && (
                    <p className="text-xs text-green-600">{avail.availability.length} slot{avail.availability.length > 1 ? 's' : ''} selected</p>
                  )}
                  <SpaceScheduleView spaceId={parseInt(form.primary_space_id)} operatingDays={operatingDays} />
                </div>
              )}

              {/* Secondary Availability */}
              {secondarySpaceIds.map(spaceId => {
                const spaceName = spaces.find(s => s.id === spaceId)?.space_name
                const days = avail.operatingDaysBySpace[spaceId] || []
                const slots = avail.timeSlotsBySpace[spaceId] || []
                const spaceAvail = avail.availabilityBySpace[spaceId] || []

                return (
                  <div key={spaceId} className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                      Availability — {spaceName}
                      <span className="text-gray-400 text-sm font-normal"> (Optional)</span>
                    </h2>
                    <AvailabilityGrid
                      operatingDays={days}
                      timeSlots={slots}
                      isSelected={(day, slotId) => avail.isSelectedForSpace(spaceId, day, slotId)}
                      isSlotFull={(slotId, day) => avail.isSlotFullForSpace(spaceId, slotId, day)}
                      onToggle={(day, slotId) => avail.toggleAvailabilityForSpace(spaceId, day, slotId)}
                      accentColor="#CEE4B8"
                    />
                    {spaceAvail.length > 0 && (
                      <p className="text-xs text-green-600">{spaceAvail.length} slot{spaceAvail.length > 1 ? 's' : ''} selected</p>
                    )}
                    <SpaceScheduleView spaceId={spaceId} operatingDays={days} />
                  </div>
                )
              })}

              <button
                type="submit"
                disabled={loading || !form.primary_space_id}
                className="w-full bg-[#CEE4B8] text-black hover:bg-[#414141] hover:text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Adding User...' : 'Add User'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}

// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import { supabase } from '@/lib/supabase'
// import { v4 as uuidv4 } from 'uuid'
// import QRCode from 'react-qr-code'
// import AdminGuard from '@/components/AdminGuard'
// import { toPng } from 'html-to-image'
// import SpaceScheduleView from '@/components/SpaceScheduleView'
// import { createNotification } from '@/lib/notifications'
// import { useAuth } from '@/context/AuthContext'

// type Space = {
//   id: number
//   space_name: string
//   grades: string[]
// }

// type TimeSlot = {
//   id: number
//   label: string
//   start_time: string
//   end_time: string
// }

// type AvailabilityEntry = {
//   day: string
//   time_slot_id: number
// }

// type SpaceTimeslotLimit = {
//   time_slot_id: number
//   max_users: number
//   day_counts: Record<string, number>
// }

// const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// const ALL_GRADES = [
//   'Daycare', 'Kindergarten',
//   'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
//   'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
//   'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
// ]

// const sortDays = (days: string[]) => {
//   return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
// }

// export default function AddUserPage() {
//   const [spaces, setSpaces] = useState<Space[]>([])
//   const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
//   const [limits, setLimits] = useState<SpaceTimeslotLimit[]>([])
//   const [loading, setLoading] = useState(false)
//   const [success, setSuccess] = useState(false)
//   const [generatedId, setGeneratedId] = useState('')
//   const [qrValue, setQrValue] = useState('')
//   const [savedUser, setSavedUser] = useState({ first_name: '', last_name: '' })
//   const [availability, setAvailability] = useState<AvailabilityEntry[]>([])
//   const [operatingDays, setOperatingDays] = useState<string[]>([])
//   const [photoFile, setPhotoFile] = useState<File | null>(null)
//   const [photoPreview, setPhotoPreview] = useState<string | null>(null)
//   const qrRef = useRef<HTMLDivElement>(null)
//   const { admin, isLoading } = useAuth()
//   console.log('Auth state:', { admin, isLoading })

//   // Multiple spaces state
//   const [secondarySpaceIds, setSecondarySpaceIds] = useState<number[]>([])
//   const [availabilityBySpace, setAvailabilityBySpace] = useState<Record<number, AvailabilityEntry[]>>({})
//   const [operatingDaysBySpace, setOperatingDaysBySpace] = useState<Record<number, string[]>>({})
//   const [timeSlotsBySpace, setTimeSlotsBySpace] = useState<Record<number, TimeSlot[]>>({})
//   const [limitsBySpace, setLimitsBySpace] = useState<Record<number, SpaceTimeslotLimit[]>>({})

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     birthdate: '',
//     grade_level: '',
//     primary_space_id: '',
//   })

//   // Fetch spaces only on mount
//   // useEffect(() => {
//   //   if (isLoading || !admin?.orphanage_id) return
//   //   const fetchData = async () => {
//   //     const { data } = await supabase
//   //       .from('spaces')
//   //       .select('*')
//   //       .eq('is_active', true)
//   //       .eq('orphanage_id', admin?.orphanage_id)
//   //     if (data) setSpaces(data)
//   //   }
//   //   fetchData()
//   // }, [admin?.orphanage_id, isLoading])

//   // useEffect(() => {
//   //   console.log('Spaces useEffect fired:', { isLoading, orphanage_id: admin?.orphanage_id })
//   //   if (isLoading || !admin?.orphanage_id) return
//   //   const fetchData = async () => {
//   //     const { data, error } = await supabase
//   //       .from('spaces')
//   //       .select('*')
//   //       .eq('is_active', true)
//   //       .eq('orphanage_id', admin.orphanage_id)
//   //     console.log('Spaces data:', data, 'Error:', error)
//   //     if (data) setSpaces(data)
//   //   }
//   //   fetchData()
//   // }, [admin?.orphanage_id, isLoading])

//   useEffect(() => {
//     if (isLoading || !admin?.orphanage_id) return
//     const fetchData = async () => {
//       const { data: spacesData } = await supabase
//         .from('spaces')
//         .select('*')
//         .eq('is_active', true)
//         .eq('orphanage_id', admin.orphanage_id)

//       if (spacesData) {
//         // Fetch grades for each space
//         const spacesWithGrades = await Promise.all(
//           spacesData.map(async (space) => {
//             const { data: gradesData } = await supabase
//               .from('space_grades')
//               .select('grade')
//               .eq('space_id', space.id)
//             return { ...space, grades: gradesData?.map(g => g.grade) || [] }
//           })
//         )
//         setSpaces(spacesWithGrades)
//       }
//     }
//     fetchData()
//   }, [admin?.orphanage_id, isLoading])

//   // Helper to fetch all data for a space
//   const fetchSpaceDataHelper = async (spaceId: number) => {
//     const [daysRes, slotsRes, limitsRes] = await Promise.all([
//       supabase
//         .from('space_operating_days')
//         .select('day')
//         .eq('space_id', spaceId)
//         .order('id'),
//       supabase
//         .from('time_slots')
//         .select('*')
//         .eq('is_active', true)
//         .eq('space_id', spaceId)
//         .order('start_time'),
//       supabase
//         .from('space_timeslot_limits')
//         .select('time_slot_id, max_users')
//         .eq('space_id', spaceId)
//     ])

//     const days = daysRes.data
//       ? sortDays(daysRes.data.map((d: { day: string }) => d.day))
//       : []

//     const slots = slotsRes.data || []

//     const limits = await Promise.all(
//       (limitsRes.data || []).map(async (limit) => {
//         const { data: rows } = await supabase
//           .from('availability')
//           .select('user_id, day')
//           .eq('time_slot_id', limit.time_slot_id)
//           .eq('space_id', spaceId)

//         const dayCountsMap: Record<string, number> = {}
//         if (rows) {
//           rows.forEach((row: { user_id: number; day: string }) => {
//             if (!dayCountsMap[row.day]) dayCountsMap[row.day] = 0
//             dayCountsMap[row.day]++
//           })
//         }

//         return {
//           time_slot_id: limit.time_slot_id,
//           max_users: limit.max_users,
//           day_counts: dayCountsMap
//         }
//       })
//     )

//     return { days, slots, limits }
//   }

//   // Fetch operating days AND time slots for primary space
//   useEffect(() => {
//     if (!form.primary_space_id) return

//     const loadPrimarySpace = async () => {
//       const spaceId = parseInt(form.primary_space_id)
//       const { days, slots, limits } = await fetchSpaceDataHelper(spaceId)
//       setOperatingDays(days)
//       setTimeSlots(slots)
//       setLimits(limits)
//       setOperatingDaysBySpace(prev => ({ ...prev, [spaceId]: days }))
//       setTimeSlotsBySpace(prev => ({ ...prev, [spaceId]: slots }))
//       setLimitsBySpace(prev => ({ ...prev, [spaceId]: limits }))
//     }
//     loadPrimarySpace()
//   }, [form.primary_space_id])

//   // Auto-assign space based on grade
//   // useEffect(() => {
//   //   if (form.grade_level) {
//   //     const grade = parseInt(form.grade_level)
//   //     const matchedSpace = spaces.find(
//   //       s => grade >= s.min_grade && grade <= s.max_grade
//   //     )
//   //     if (matchedSpace) {
//   //       setForm(prev => ({ ...prev, primary_space_id: matchedSpace.id.toString() }))
//   //     }
//   //   }
//   // }, [form.grade_level, spaces])
  
//   // Auto-assign space based on grade
//   useEffect(() => {
//     if (form.grade_level) {
//       const gradeLabel = isNaN(parseInt(form.grade_level))
//         ? form.grade_level                    // 'Daycare' or 'Kindergarten' — use as-is
//         : `Grade ${form.grade_level}`         // 1-12 → 'Grade 1' etc.
//       const matchedSpace = spaces.find(s => s.grades.includes(gradeLabel))
//       if (matchedSpace) {
//         setForm(prev => ({ ...prev, primary_space_id: matchedSpace.id.toString() }))
//       }
//     }
//   }, [form.grade_level, spaces])

//   // Toggle secondary space
//   const toggleSecondarySpace = async (spaceId: number) => {
//     const isSelected = secondarySpaceIds.includes(spaceId)

//     if (isSelected) {
//       setSecondarySpaceIds(prev => prev.filter(id => id !== spaceId))
//       setAvailabilityBySpace(prev => {
//         const updated = { ...prev }
//         delete updated[spaceId]
//         return updated
//       })
//     } else {
//       setSecondarySpaceIds(prev => [...prev, spaceId])
//       if (!operatingDaysBySpace[spaceId]) {
//         const { days, slots, limits } = await fetchSpaceDataHelper(spaceId)
//         setOperatingDaysBySpace(prev => ({ ...prev, [spaceId]: days }))
//         setTimeSlotsBySpace(prev => ({ ...prev, [spaceId]: slots }))
//         setLimitsBySpace(prev => ({ ...prev, [spaceId]: limits }))
//       }
//       setAvailabilityBySpace(prev => ({ ...prev, [spaceId]: [] }))
//     }
//   }

//   // Primary space availability helpers
//   // const toggleAvailability = (day: string, timeSlotId: number) => {
//   //   const exists = availability.find(
//   //     a => a.day === day && a.time_slot_id === timeSlotId
//   //   )
//   //   if (exists) {
//   //     setAvailability(prev =>
//   //       prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId))
//   //     )
//   //   } else {
//   //     const dayAlreadyHasSlot = availability.find(a => a.day === day)
//   //     if (dayAlreadyHasSlot) {
//   //       alert(`${day} already has a time slot assigned. Please uncheck it first.`)
//   //       return
//   //     }
//   //     if (isSlotFull(timeSlotId, day)) {
//   //       alert(`This time slot is full for ${day}!`)
//   //       return
//   //     }
//   //     setAvailability(prev => [...prev, { day, time_slot_id: timeSlotId }])
//   //   }
//   // }
//   const toggleAvailability = (day: string, timeSlotId: number) => {
//     const exists = availability.find(
//       a => a.day === day && a.time_slot_id === timeSlotId
//     )

//     if (exists) {
//       setAvailability(prev =>
//         prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId))
//       )
//     } else {
//       const dayAlreadyHasSlot = availability.find(a => a.day === day)
//       if (dayAlreadyHasSlot) {
//         alert(`${day} already has a time slot assigned. Please uncheck it first.`)
//         return
//       }
//       // ← Check if day is used in any secondary space
//       if (isDayUsedInAnySpace(day, parseInt(form.primary_space_id))) {
//         alert(`${day} is already assigned a time slot in another space.`)
//         return
//       }
//       if (isSlotFull(timeSlotId, day)) {
//         alert(`This time slot is full for ${day}!`)
//         return
//       }
//       setAvailability(prev => [...prev, { day, time_slot_id: timeSlotId }])
//     }
//   }

//   const isSelected = (day: string, timeSlotId: number) =>
//     availability.some(a => a.day === day && a.time_slot_id === timeSlotId)

//   const isSlotFull = (timeSlotId: number, day: string) => {
//     const limit = limits.find(l => l.time_slot_id === timeSlotId)
//     if (!limit) return false
//     const dayCount = limit.day_counts[day] ?? 0
//     return dayCount >= limit.max_users
//   }

//   // Secondary space availability helpers
//   // const toggleAvailabilityForSpace = (spaceId: number, day: string, timeSlotId: number) => {
//   //   const spaceAvailability = availabilityBySpace[spaceId] || []
//   //   const exists = spaceAvailability.find(
//   //     a => a.day === day && a.time_slot_id === timeSlotId
//   //   )
//   //   if (exists) {
//   //     setAvailabilityBySpace(prev => ({
//   //       ...prev,
//   //       [spaceId]: prev[spaceId].filter(
//   //         a => !(a.day === day && a.time_slot_id === timeSlotId)
//   //       )
//   //     }))
//   //   } else {
//   //     const dayAlreadyHasSlot = spaceAvailability.find(a => a.day === day)
//   //     if (dayAlreadyHasSlot) {
//   //       alert(`${day} already has a time slot assigned for this space.`)
//   //       return
//   //     }
//   //     const spaceLimits = limitsBySpace[spaceId] || []
//   //     const limit = spaceLimits.find(l => l.time_slot_id === timeSlotId)
//   //     if (limit) {
//   //       const dayCount = limit.day_counts[day] ?? 0
//   //       if (dayCount >= limit.max_users) {
//   //         alert(`This time slot is full for ${day}!`)
//   //         return
//   //       }
//   //     }
//   //     setAvailabilityBySpace(prev => ({
//   //       ...prev,
//   //       [spaceId]: [...(prev[spaceId] || []), { day, time_slot_id: timeSlotId }]
//   //     }))
//   //   }
//   // }
//   const toggleAvailabilityForSpace = (spaceId: number, day: string, timeSlotId: number) => {
//     const spaceAvailability = availabilityBySpace[spaceId] || []
//     const exists = spaceAvailability.find(
//       a => a.day === day && a.time_slot_id === timeSlotId
//     )

//     if (exists) {
//       setAvailabilityBySpace(prev => ({
//         ...prev,
//         [spaceId]: prev[spaceId].filter(
//           a => !(a.day === day && a.time_slot_id === timeSlotId)
//         )
//       }))
//     } else {
//       const dayAlreadyHasSlot = spaceAvailability.find(a => a.day === day)
//       if (dayAlreadyHasSlot) {
//         alert(`${day} already has a time slot assigned for this space.`)
//         return
//       }
//       // ← Check if day is used in any other space
//       if (isDayUsedInAnySpace(day, spaceId)) {
//         alert(`${day} is already assigned a time slot in another space.`)
//         return
//       }
//       const limit = (limitsBySpace[spaceId] || []).find(l => l.time_slot_id === timeSlotId)
//       if (limit && (limit.day_counts[day] ?? 0) >= limit.max_users) {
//         alert(`This time slot is full for ${day}!`)
//         return
//       }
//       setAvailabilityBySpace(prev => ({
//         ...prev,
//         [spaceId]: [...(prev[spaceId] || []), { day, time_slot_id: timeSlotId }]
//       }))
//     }
//   }

//   const isSelectedForSpace = (spaceId: number, day: string, timeSlotId: number) =>
//     (availabilityBySpace[spaceId] || []).some(
//       a => a.day === day && a.time_slot_id === timeSlotId
//     )

//   const isSlotFullForSpace = (spaceId: number, timeSlotId: number, day: string) => {
//     const spaceLimits = limitsBySpace[spaceId] || []
//     const limit = spaceLimits.find(l => l.time_slot_id === timeSlotId)
//     if (!limit) return false
//     const dayCount = limit.day_counts[day] ?? 0
//     return dayCount >= limit.max_users
//   }

//   const generateCustomId = async () => {
//     const year = new Date().getFullYear().toString().slice(-2)
//     const branchAbbr = admin?.orphanage_code || 'HOH'

//     const { data } = await supabase
//       .from('users')
//       .select('custom_id')
//       .eq('orphanage_id', admin?.orphanage_id)
//       .like('custom_id', `${branchAbbr}-${year}-%`)  
//       .order('custom_id', { ascending: false })        
//       .limit(1)

//     const lastNumber = data?.[0]?.custom_id?.split('-')[2] || '0000'
//     const newNumber = String(parseInt(lastNumber) + 1).padStart(4, '0')
//     return `${branchAbbr}-${year}-${newNumber}`
//   }

//   const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return
//     setPhotoFile(file)
//     setPhotoPreview(URL.createObjectURL(file))
//   }

//   const uploadPhoto = async (userId: number): Promise<string | null> => {
//     if (!photoFile) return null
//     const fileExt = photoFile.name.split('.').pop()
//     const fileName = `user-${userId}.${fileExt}`
//     const { error } = await supabase.storage
//       .from('profile-photos')
//       .upload(fileName, photoFile, { upsert: true })
//     if (error) { console.error('Photo upload error:', error); return null }
//     const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName)
//     return data.publicUrl
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!form.primary_space_id) {
//       alert('Please select a primary component.')
//       return
//     }
//     if (availability.length === 0) {
//       alert('Please select at least one available day and time slot for the primary space.')
//       return
//     }
//     setLoading(true)

//     try {
//       const customId = await generateCustomId()
//       console.log('Generated ID:', customId)
//       const qrCode = uuidv4()

//       const { data: newUser, error: userError } = await supabase
//         .from('users')
//         .insert({
//           custom_id: customId,
//           first_name: form.first_name,
//           last_name: form.last_name,
//           birthdate: form.birthdate,
//           grade_level: form.grade_level,
//           primary_space_id: parseInt(form.primary_space_id),
//           qr_code: qrCode,
//           is_active: true,
//           orphanage_id: admin?.orphanage_id,
//         })
//         .select()
//         .single()

//       console.log('User insert result:', newUser, userError)  
//       if (userError) throw userError

//       if (photoFile) {
//         const photoUrl = await uploadPhoto(newUser.id)
//         if (photoUrl) {
//           await supabase.from('users').update({ photo_url: photoUrl }).eq('id', newUser.id)
//         }
//       }

//       // Save primary space availability
//       const availabilityRows = availability.map(a => ({
//         user_id: newUser.id,
//         day: a.day,
//         time_slot_id: a.time_slot_id,
//         space_id: parseInt(form.primary_space_id),
//       }))
//       const { error: availError } = await supabase.from('availability').insert(availabilityRows)
//       if (availError) throw availError

//       // Save to user_spaces table
//       const primarySpaceId = parseInt(form.primary_space_id)
//       const userSpacesRows = [
//         { user_id: newUser.id, space_id: primarySpaceId, is_primary: true },
//         ...secondarySpaceIds.map(spaceId => ({
//           user_id: newUser.id,
//           space_id: spaceId,
//           is_primary: false
//         }))
//       ]
//       const { error: userSpacesError } = await supabase.from('user_spaces').insert(userSpacesRows)
//       if (userSpacesError) throw userSpacesError

//       // Save secondary spaces availability
//       for (const spaceId of secondarySpaceIds) {
//         const spaceAvailability = availabilityBySpace[spaceId] || []
//         if (spaceAvailability.length > 0) {
//           const rows = spaceAvailability.map(a => ({
//             user_id: newUser.id,
//             day: a.day,
//             time_slot_id: a.time_slot_id,
//             space_id: spaceId,
//           }))
//           const { error } = await supabase.from('availability').insert(rows)
//           if (error) throw error
//         }
//       }

//       setGeneratedId(customId)
//       setQrValue(qrCode)
//       setSavedUser({ first_name: form.first_name, last_name: form.last_name })
//       setSuccess(true)

//       await createNotification(
//         'user_added',
//         `Admin added new user: ${form.first_name} ${form.last_name} (${customId})`,
//         admin?.orphanage_id ?? undefined 
//       )

//     } catch (error) {
//       console.error('Error adding user:', error)
//       alert('Something went wrong. Please try again.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const isDayUsedInAnySpace = (day: string, excludeSpaceId?: number): boolean => {
//     // Check primary space availability
//     if (excludeSpaceId !== parseInt(form.primary_space_id)) {
//       const usedInPrimary = availability.some(a => a.day === day)
//       if (usedInPrimary) return true
//     }

//     // Check all secondary spaces
//     for (const spaceId of secondarySpaceIds) {
//       if (excludeSpaceId === spaceId) continue
//       const usedInSpace = (availabilityBySpace[spaceId] || []).some(a => a.day === day)
//       if (usedInSpace) return true
//     }

//     return false
//   }

//   const handleReset = () => {
//     setSuccess(false)
//     setGeneratedId('')
//     setQrValue('')
//     setAvailability([])
//     setSecondarySpaceIds([])
//     setAvailabilityBySpace({})
//     setPhotoFile(null)
//     setPhotoPreview(null)
//     setForm({
//       first_name: '',
//       last_name: '',
//       birthdate: '',
//       grade_level: '',
//       primary_space_id: '',
//     })
//   }

//   const handleDownloadPng = async () => {
//     if (!qrRef.current) return
//     try {
//       const dataUrl = await toPng(qrRef.current, { quality: 1.0 })
//       const link = document.createElement('a')
//       link.download = `${generatedId}-qr.png`
//       link.href = dataUrl
//       link.click()
//     } catch (error) {
//       console.error('Error downloading QR:', error)
//       alert('Something went wrong. Please try again.')
//     }
//   }

//   // Success screen
//   if (success) {
//     return (
//       <AdminGuard>
//         <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#FAF2F0' }}>
//           <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
//             <h2 className="text-2xl font-bold text-green-600 mb-2">User Added Successfully!</h2>
//             <p className="text-black mb-6">{savedUser.first_name} {savedUser.last_name} has been registered.</p>
//             <div className="bg-gray-50 rounded-lg p-4 mb-6">
//               <p className="text-sm text-black mb-1">User ID</p>
//               <p className="text-2xl font-bold text-black">{generatedId}</p>
//             </div>
//             <div ref={qrRef} className="flex flex-col items-center bg-white p-4 mb-2">
//               <p className="font-bold text-black mb-1">{savedUser.first_name} {savedUser.last_name}</p>
//               <p className="text-sm text-gray-500 mb-3">{generatedId}</p>
//               <QRCode value={qrValue} size={200} />
//             </div>
//             <button
//               onClick={handleDownloadPng}
//               className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium mb-6"
//             >
//               Download QR as PNG
//             </button>
//             <div className="flex gap-3">
//               <button
//                 onClick={handleReset}
//                 className="flex-1 bg-[#CEE4B8] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white"
//               >
//                 Add Another User
//               </button>
//               <a href="/admin/users" className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-center">
//                 View All Users
//               </a>
//             </div>
//           </div>
//         </div>
//       </AdminGuard>
//     )
//   }

//   return (
//     <AdminGuard>
//       <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
//         <div className="max-w-2xl mx-auto">
//           <div className="bg-white rounded-xl shadow p-8">
//             <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h1>

//             <form onSubmit={handleSubmit} className="space-y-6">

//               {/* Basic Info */}
//               <div className="space-y-4">
//                 <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h2>

//                 <div>
//                   <label className="block text-sm font-medium text-black mb-1">
//                     First Name <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="text" required value={form.first_name}
//                     onChange={e => setForm({ ...form, first_name: e.target.value })}
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
//                     placeholder="First Name"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-black mb-1">
//                     Last Name <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="text" required value={form.last_name}
//                     onChange={e => setForm({ ...form, last_name: e.target.value })}
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
//                     placeholder="Last Name"
//                   />
//                 </div>

//                 {/* Profile Photo */}
//                 <div>
//                   <label className="block text-sm font-medium text-black mb-1">Profile Photo</label>
//                   <div className="flex items-center gap-4">
//                     {photoPreview ? (
//                       <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
//                     ) : (
//                       <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl border border-gray-200">👤</div>
//                     )}
//                     <div>
//                       <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload" />
//                       <label htmlFor="photo-upload" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm cursor-pointer">
//                         Choose Photo
//                       </label>
//                       {photoPreview && (
//                         <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} className="ml-2 text-red-500 hover:text-red-700 text-sm">
//                           Remove
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-black mb-1">
//                     Birthdate <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="date" required value={form.birthdate}
//                     onChange={e => setForm({ ...form, birthdate: e.target.value })}
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-black mb-1">
//                     Grade Level <span className="text-red-500">*</span>
//                   </label>
//                {/*   <select
//                     required value={form.grade_level}
//                     onChange={e => setForm({ ...form, grade_level: e.target.value })}
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
//                   >
//                     <option value="">Select grade level</option>
//                     {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
//                       <option key={g} value={g}>Grade {g}</option>
//                     ))}
//                   </select> */}
//                   <select
//                     required value={form.grade_level}
//                     onChange={e => setForm({ ...form, grade_level: e.target.value })}
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#CEE4B8]"
//                   >
//                     <option value="">Select grade level</option>
//                     <option value="Daycare">Daycare</option>
//                     <option value="Kindergarten">Kindergarten</option>
//                     {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
//                       <option key={g} value={g}>Grade {g}</option>
//                     ))}
//                   </select>
//                 </div>

//                 {/* Space Assignment */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Primary Component <span className="text-red-500">*</span>
//                   </label>
//                   <div className="flex gap-4 mb-3">
//                     {spaces.map(space => (
//                       <label key={space.id} className="flex items-center gap-2 cursor-pointer">
//                         <input
//                           type="radio"
//                           className="accent-[#CEE4B8]"
//                           name="space"
//                           value={space.id}
//                           checked={form.primary_space_id === space.id.toString()}
//                           onChange={e => {
//                             setForm({ ...form, primary_space_id: e.target.value })
//                             setSecondarySpaceIds(prev =>
//                               prev.filter(id => id !== parseInt(e.target.value))
//                             )
//                           }}
//                         />
//                         <span className="text-sm text-gray-700">{space.space_name}</span>
//                       </label>
//                     ))}
//                   </div>

//                   {/* Secondary Spaces */}
//                   {form.primary_space_id && (
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         Secondary Components <span className="text-gray-400 text-xs">(optional)</span>
//                       </label>
//                       <div className="flex gap-4">
//                         {spaces
//                           .filter(s => s.id.toString() !== form.primary_space_id)
//                           .map(space => (
//                             <label key={space.id} className="flex items-center gap-2 cursor-pointer">
//                               <input
//                                 type="checkbox"
//                                 className="accent-[#CEE4B8]"
//                                 checked={secondarySpaceIds.includes(space.id)}
//                                 onChange={() => toggleSecondarySpace(space.id)}
//                               />
//                               <span className="text-sm text-gray-700">{space.space_name}</span>
//                             </label>
//                           ))}
//                       </div>
//                     </div>
//                   )}

//                   {form.grade_level && (
//                     <p className="text-xs text-blue-500 mt-1">
//                       Auto-assigned based on grade level. You may override this.
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {/* Primary Space Availability Grid */}
//               {form.primary_space_id && (
//                 <div className="space-y-4">
//                   <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
//                     Availability — {spaces.find(s => s.id.toString() === form.primary_space_id)?.space_name}
//                     <span className="text-red-500"> *</span>
//                   </h2>
//                   <p className="text-sm text-gray-500">
//                     Select which days and time slots this child is available. Grayed out slots are full.
//                   </p>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm">
//                       <thead>
//                         <tr>
//                           <th className="text-left py-2 pr-4 text-gray-500 font-medium">Time</th>
//                           {operatingDays.map(day => (
//                             <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
//                               {day.slice(0, 3)}
//                             </th>
//                           ))}
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {timeSlots.map(slot => (
//                           <tr key={slot.id} className="border-t">
//                             <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">{slot.label}</td>
//                             {operatingDays.map(day => (
//                               <td key={day} className="text-center py-2 px-2">
//                                 {isSlotFull(slot.id, day) && !isSelected(day, slot.id) && (
//                                   <span className="block text-red-400 text-xs">Full</span>
//                                 )}
//                                 <input
//                                   type="checkbox"
//                                   checked={isSelected(day, slot.id)}
//                                   onChange={() => toggleAvailability(day, slot.id)}
//                                   disabled={isSlotFull(slot.id, day) && !isSelected(day, slot.id)}
//                                   className="w-4 h-4 accent-[#CEE4B8] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
//                                 />
//                               </td>
//                             ))}
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                   {availability.length > 0 && (
//                     <p className="text-xs text-green-600">
//                       {availability.length} slot{availability.length > 1 ? 's' : ''} selected
//                     </p>
//                   )}
//                   <SpaceScheduleView
//                     spaceId={parseInt(form.primary_space_id)}
//                     operatingDays={operatingDays}
//                   />
//                 </div>
//               )}

//               {/* Secondary Space Availability Grids */}
//               {secondarySpaceIds.map(spaceId => {
//                 const spaceName = spaces.find(s => s.id === spaceId)?.space_name
//                 const days = operatingDaysBySpace[spaceId] || []
//                 const slots = timeSlotsBySpace[spaceId] || []

//                 return (
//                   <div key={spaceId} className="space-y-4">
//                     <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
//                       Availability — {spaceName}
//                       <span className="text-gray-400 text-sm font-normal"> (Optional)</span>
//                     </h2>
//                     {days.length === 0 || slots.length === 0 ? (
//                       <p className="text-gray-400 text-sm">Loading schedule...</p>
//                     ) : (
//                       <div className="overflow-x-auto">
//                         <table className="w-full text-sm">
//                           <thead>
//                             <tr>
//                               <th className="text-left py-2 pr-4 text-gray-500 font-medium">Time</th>
//                               {days.map(day => (
//                                 <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
//                                   {day.slice(0, 3)}
//                                 </th>
//                               ))}
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {slots.map(slot => (
//                               <tr key={slot.id} className="border-t">
//                                 <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">{slot.label}</td>
//                                 {days.map(day => (
//                                   <td key={day} className="text-center py-2 px-2">
//                                     {isSlotFullForSpace(spaceId, slot.id, day) && !isSelectedForSpace(spaceId, day, slot.id) && (
//                                       <span className="block text-red-400 text-xs">Full</span>
//                                     )}
//                                     <input
//                                       type="checkbox"
//                                       checked={isSelectedForSpace(spaceId, day, slot.id)}
//                                       onChange={() => toggleAvailabilityForSpace(spaceId, day, slot.id)}
//                                       disabled={isSlotFullForSpace(spaceId, slot.id, day) && !isSelectedForSpace(spaceId, day, slot.id)}
//                                       className="w-4 h-4 accent-[#CEE4B8] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
//                                     />
//                                   </td>
//                                 ))}
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}
//                     {(availabilityBySpace[spaceId] || []).length > 0 && (
//                       <p className="text-xs text-green-600">
//                         {availabilityBySpace[spaceId].length} slot{availabilityBySpace[spaceId].length > 1 ? 's' : ''} selected
//                       </p>
//                     )}
//                     <SpaceScheduleView spaceId={spaceId} operatingDays={days} />
//                   </div>
//                 )
//               })}

//               {/* Submit */}
//               <button
//                 type="submit"
//                 disabled={loading || !form.primary_space_id}
//                 className="w-full bg-[#CEE4B8] text-black hover:bg-[#414141] hover:text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
//               >
//                 {loading ? 'Adding User...' : 'Add User'}
//               </button>

//             </form>
//           </div>
//         </div>
//       </div>
//     </AdminGuard>
//   )
// }