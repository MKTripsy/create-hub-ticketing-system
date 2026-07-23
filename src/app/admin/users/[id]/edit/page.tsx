'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'
import AdminGuard from '@/components/AdminGuard'
import SpaceScheduleView from '@/components/SpaceScheduleView'
import AvailabilityGrid from '@/components/users/AvailabilityGrid'
import UserFormFields from '@/components/users/UserFormFields'
import { useAuth } from '@/context/AuthContext'
import { useAvailabilityState } from '@/hooks/useAvailabilityState'
import { fetchSpacesWithGrades, fetchSpaceSchedule, Space } from '@/lib/api/spaces'
import { saveUser, deleteUser, uploadUserPhoto, removeUserPhoto } from '@/lib/api/editUser'
import { createNotification } from '@/lib/notifications'

type FormState = {
  first_name: string
  last_name: string
  birthdate: string
  grade_level: string
  primary_space_id: string
  qr_code: string
  custom_id: string
  is_active: boolean
}

export default function EditUserPage() {
  const { id } = useParams()
  const router = useRouter()
  const { admin, isLoading } = useAuth()
  const numericId = parseInt(Array.isArray(id) ? id[0] : (id as string))

  const [spaces, setSpaces] = useState<Space[]>([])
  const [operatingDays, setOperatingDays] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  // Uncomment for profile picture funnctionality
  // const [photoFile, setPhotoFile] = useState<File | null>(null)
  // const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [secondarySpaceIds, setSecondarySpaceIds] = useState<number[]>([])
  const [originalSecondarySpaceIds, setOriginalSecondarySpaceIds] = useState<number[]>([])
  const [form, setForm] = useState<FormState>({
    first_name: '', last_name: '', birthdate: '', grade_level: '',
    primary_space_id: '', qr_code: '', custom_id: '', is_active: true,
  })

  const avail = useAvailabilityState({
    getPrimarySpaceId: () => parseInt(form.primary_space_id) || null,
    getSecondarySpaceIds: () => secondarySpaceIds,
  })

  const [originalAvailability, setOriginalAvailability] = useState(avail.availability)
  const [originalAvailabilityBySpace, setOriginalAvailabilityBySpace] = useState(avail.availabilityBySpace)

  // Load user + spaces on mount
  useEffect(() => {
    if (isLoading || !admin?.orphanage_id) return
    const orphanageId = admin.orphanage_id;
    const fetchData = async () => {
      const [userRes, spacesData, availRes, userSpacesRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', numericId).single(),
        fetchSpacesWithGrades(orphanageId),
        supabase.from('availability').select('day, time_slot_id, space_id').eq('user_id', numericId),
        supabase.from('user_spaces').select('space_id, is_primary').eq('user_id', numericId),
      ])

      if (userRes.data) {
        setForm({
          first_name: userRes.data.first_name,
          last_name: userRes.data.last_name,
          birthdate: userRes.data.birthdate,
          grade_level: userRes.data.grade_level,
          primary_space_id: userRes.data.primary_space_id.toString(),
          qr_code: userRes.data.qr_code,
          custom_id: userRes.data.custom_id,
          is_active: userRes.data.is_active,
        })
        // if (userRes.data.photo_url) setPhotoPreview(userRes.data.photo_url) uncomment for profile photo
      }

      setSpaces(spacesData)

      if (availRes.data && userRes.data) {
        const primarySpaceId = userRes.data.primary_space_id
        const primaryAvail = availRes.data
          .filter((a: any) => a.space_id === primarySpaceId)
          .map((a: any) => ({ day: a.day, time_slot_id: a.time_slot_id }))
        avail.setAvailability(primaryAvail)
        setOriginalAvailability(primaryAvail)

        const secondaryAvail: Record<number, any[]> = {}
        availRes.data
          .filter((a: any) => a.space_id !== primarySpaceId)
          .forEach((a: any) => {
            if (!secondaryAvail[a.space_id]) secondaryAvail[a.space_id] = []
            secondaryAvail[a.space_id].push({ day: a.day, time_slot_id: a.time_slot_id })
          })
        avail.setAvailabilityBySpace(secondaryAvail)
        setOriginalAvailabilityBySpace(secondaryAvail)
      }

      if (userSpacesRes.data) {
        const secondaryIds = userSpacesRes.data
          .filter((us: any) => !us.is_primary)
          .map((us: any) => us.space_id)
        setSecondarySpaceIds(secondaryIds)
        setOriginalSecondarySpaceIds(secondaryIds)
      }

      setLoading(false)
    }
    fetchData()
  }, [numericId, admin?.orphanage_id, isLoading])

  // Load primary space schedule when primary_space_id changes
  useEffect(() => {
    if (!form.primary_space_id) return
    const spaceId = parseInt(form.primary_space_id)
    fetchSpaceSchedule(spaceId, numericId).then(data => {
      setOperatingDays(data.days)
      avail.loadSpaceSchedule(spaceId, data)
    })
  }, [form.primary_space_id])

  // Load secondary spaces on mount
  useEffect(() => {
    secondarySpaceIds.forEach(spaceId => {
      if (!avail.operatingDaysBySpace[spaceId]) {
        fetchSpaceSchedule(spaceId, numericId).then(data => avail.loadSpaceSchedule(spaceId, data))
      }
    })
  }, [secondarySpaceIds])

  const handleToggleSecondarySpace = async (spaceId: number) => {
    if (secondarySpaceIds.includes(spaceId)) {
      setSecondarySpaceIds(prev => prev.filter(id => id !== spaceId))
      avail.removeSpaceAvailability(spaceId)
    } else {
      setSecondarySpaceIds(prev => [...prev, spaceId])
      if (!avail.operatingDaysBySpace[spaceId]) {
        const data = await fetchSpaceSchedule(spaceId, numericId)
        avail.loadSpaceSchedule(spaceId, data)
      }
      if (!avail.availabilityBySpace[spaceId]) {
        avail.setAvailabilityBySpace(prev => ({ ...prev, [spaceId]: [] }))
      }
    }
  }

  const handlePrimarySpaceChange = (spaceId: string) => {
    setForm(prev => ({ ...prev, primary_space_id: spaceId }))
    setSecondarySpaceIds(prev => prev.filter(id => id !== parseInt(spaceId)))
  }

  const handleSave = async () => {
    if (avail.availability.length === 0) {
      alert('Please select at least one available day and time slot.')
      return
    }
    setSaving(true)
    try {
      const newPhotoUrl = await saveUser({
        userId: numericId, form,
        availability: avail.availability,
        availabilityBySpace: avail.availabilityBySpace,
        secondarySpaceIds, 
        // Uncomment for profile picture functionality
        // photoFile,
      })
      // Uncomment for profile picture functionality
      // if (newPhotoUrl) { setPhotoPreview(newPhotoUrl); setPhotoFile(null) }
      setOriginalAvailability(avail.availability)
      setOriginalAvailabilityBySpace(avail.availabilityBySpace)
      setOriginalSecondarySpaceIds(secondarySpaceIds)
      setIsEditing(false)
      alert('User updated successfully!')
      if (!admin) return null
      await createNotification('user_edited', `${admin.first_name} ${admin.last_name} updated user: ${form.first_name} ${form.last_name}`, admin?.orphanage_id ?? undefined)
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    setLoading(true)
    try {
      await deleteUser(numericId)
      if (!admin) return null
      await createNotification('user_deleted', `${admin.first_name} ${admin.last_name} deleted user: ${form.first_name} ${form.last_name}`, admin?.orphanage_id ?? undefined)
      router.push('/admin/users')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    avail.setAvailability(originalAvailability)
    avail.setAvailabilityBySpace(originalAvailabilityBySpace)
    setSecondarySpaceIds(originalSecondarySpaceIds)
    setIsEditing(false)
  }

  // Uncomment for profile picture functionality
  // const handleRemovePhoto = async () => {
  //   if (!confirm('Are you sure you want to remove this photo?')) return
  //   await removeUserPhoto(numericId)
  //   setPhotoPreview(null)
  //   setPhotoFile(null)
  // }

  const handlePrint = () => {
    if (!form.qr_code) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>QR Code - ${form.first_name} ${form.last_name}</title>
      <style>body{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}</style>
      </head><body>
      <h2>${form.first_name} ${form.last_name}</h2>
      <p style="color:gray;font-size:14px">${form.custom_id}</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(form.qr_code)}" width="200" height="200" />
      <script>window.onload=()=>window.print()</script>
      </body></html>`)
    printWindow.document.close()
  }

  const primaryLimits = avail.limitsBySpace[parseInt(form.primary_space_id)] || []

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
              <h1 className="text-2xl font-bold text-black">{form.first_name} {form.last_name}</h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${form.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Basic Info Fields */}
            <div className="mb-6">
              <UserFormFields
                form={form}
                onChange={updates => setForm(prev => ({ ...prev, ...updates }))}
                spaces={spaces}
                secondarySpaceIds={secondarySpaceIds}
                onToggleSecondarySpace={handleToggleSecondarySpace}
                onPrimarySpaceChange={handlePrimarySpaceChange}
                // Uncomment for profile picture functionality
                // photoPreview={photoPreview}
                // onPhotoChange={e => {
                //   const file = e.target.files?.[0]
                //   if (!file) return
                //   setPhotoFile(file)
                //   setPhotoPreview(URL.createObjectURL(file))
                // }}
                // onRemovePhoto={handleRemovePhoto}
                disabled={!isEditing}
              />
            </div>

            {/* Primary Availability */}
            <div className="space-y-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                Availability — {spaces.find(s => s.id.toString() === form.primary_space_id)?.space_name}
              </h2>
              <AvailabilityGrid
                operatingDays={operatingDays}
                timeSlots={avail.timeSlotsBySpace[parseInt(form.primary_space_id)] || []}
                isSelected={(day, slotId) => avail.isSelected(day, slotId)}
                isSlotFull={(slotId, day) => avail.isSlotFull(primaryLimits, slotId, day)}
                onToggle={(day, slotId) => avail.toggleAvailability(day, slotId, primaryLimits, parseInt(form.primary_space_id))}
                disabled={!isEditing}
              />
              {form.primary_space_id && (
                <SpaceScheduleView spaceId={parseInt(form.primary_space_id)} operatingDays={operatingDays} />
              )}
            </div>

            {/* Secondary Availability */}
            {secondarySpaceIds.map(spaceId => {
              const spaceName = spaces.find(s => s.id === spaceId)?.space_name
              const days = avail.operatingDaysBySpace[spaceId] || []
              const slots = avail.timeSlotsBySpace[spaceId] || []
              const spaceAvail = avail.availabilityBySpace[spaceId] || []

              return (
                <div key={spaceId} className="space-y-4 mb-6">
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
                    disabled={!isEditing}
                  />
                  {spaceAvail.length > 0 && (
                    <p className="text-xs text-green-600">{spaceAvail.length} slot{spaceAvail.length > 1 ? 's' : ''} selected</p>
                  )}
                  <SpaceScheduleView spaceId={spaceId} operatingDays={days} />
                </div>
              )
            })}

            {/* QR Code */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">QR Code</h2>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowQR(!showQR)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                  {showQR ? 'Hide QR' : 'Show QR'}
                </button>
                <button onClick={handlePrint} className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm">
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
                  <button onClick={() => setIsEditing(true)} className="flex-1 bg-[#EEEEC6] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium">Edit</button>
                  <button onClick={handleDelete} className="flex-1 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
                  <button onClick={() => router.push('/admin/users')} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Back</button>
                </>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#CEE4B8] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancel} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </AdminGuard>
  )
}

// 'use client'

// import { useState, useEffect } from 'react'
// import { useParams, useRouter } from 'next/navigation'
// import { supabase } from '@/lib/supabase'
// import QRCode from 'react-qr-code'
// import AdminGuard from '@/components/AdminGuard'
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

// export default function EditUserPage() {
//   const { id } = useParams()
//   const router = useRouter()
//   const { admin, isLoading } = useAuth()
//   const cleanId = Array.isArray(id) ? id[0] : id
//   const numericId = parseInt(cleanId as string)

//   const [spaces, setSpaces] = useState<Space[]>([])
//   const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
//   const [limits, setLimits] = useState<SpaceTimeslotLimit[]>([])
//   const [loading, setLoading] = useState(true)
//   const [saving, setSaving] = useState(false)
//   const [isEditing, setIsEditing] = useState(false)
//   const [showQR, setShowQR] = useState(false)
//   const [availability, setAvailability] = useState<AvailabilityEntry[]>([])
//   const [originalAvailability, setOriginalAvailability] = useState<AvailabilityEntry[]>([])
//   const [operatingDays, setOperatingDays] = useState<string[]>([])
//   const [photoFile, setPhotoFile] = useState<File | null>(null)
//   const [photoPreview, setPhotoPreview] = useState<string | null>(null)

//   // Multiple spaces state
//   const [secondarySpaceIds, setSecondarySpaceIds] = useState<number[]>([])
//   const [originalSecondarySpaceIds, setOriginalSecondarySpaceIds] = useState<number[]>([])
//   const [availabilityBySpace, setAvailabilityBySpace] = useState<Record<number, AvailabilityEntry[]>>({})
//   const [originalAvailabilityBySpace, setOriginalAvailabilityBySpace] = useState<Record<number, AvailabilityEntry[]>>({})
//   const [operatingDaysBySpace, setOperatingDaysBySpace] = useState<Record<number, string[]>>({})
//   const [timeSlotsBySpace, setTimeSlotsBySpace] = useState<Record<number, TimeSlot[]>>({})
//   const [limitsBySpace, setLimitsBySpace] = useState<Record<number, SpaceTimeslotLimit[]>>({})

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     birthdate: '',
//     grade_level: '',
//     primary_space_id: '',
//     qr_code: '',
//     custom_id: '',
//     is_active: true,
//   })

//   // Helper to fetch all data for any space
//   const fetchSpaceDataHelper = async (spaceId: number) => {
//     const [daysRes, slotsRes, limitsRes] = await Promise.all([
//       supabase.from('space_operating_days').select('day').eq('space_id', spaceId).order('id'),
//       supabase.from('time_slots').select('*').eq('is_active', true).eq('space_id', spaceId).order('start_time'),
//       supabase.from('space_timeslot_limits').select('time_slot_id, max_users').eq('space_id', spaceId)
//     ])

//     const days = daysRes.data ? sortDays(daysRes.data.map((d: { day: string }) => d.day)) : []
//     const slots = slotsRes.data || []

//     const limits = await Promise.all(
//       (limitsRes.data || []).map(async (limit) => {
//         const { data: rows } = await supabase
//           .from('availability')
//           .select('user_id, day')
//           .eq('time_slot_id', limit.time_slot_id)
//           .eq('space_id', spaceId)
//           .neq('user_id', numericId)

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

//   // Fetch user data
//   useEffect(() => {
//     if (isLoading || !admin?.orphanage_id) return
//     const fetchData = async () => {
//       const [userRes, spacesRes, availRes, userSpacesRes] = await Promise.all([
//         supabase.from('users').select('*').eq('id', numericId).single(),
//         supabase.from('spaces').select('*').eq('is_active', true).eq('orphanage_id', admin.orphanage_id),
//         supabase.from('availability').select('day, time_slot_id, space_id').eq('user_id', numericId),
//         supabase.from('user_spaces').select('space_id, is_primary').eq('user_id', numericId),
//       ])

//       if (userRes.data) {
//         setForm({
//           first_name: userRes.data.first_name,
//           last_name: userRes.data.last_name,
//           birthdate: userRes.data.birthdate,
//           grade_level: userRes.data.grade_level,
//           primary_space_id: userRes.data.primary_space_id.toString(),
//           qr_code: userRes.data.qr_code,
//           custom_id: userRes.data.custom_id,
//           is_active: userRes.data.is_active,
//         })
//         if (userRes.data.photo_url) setPhotoPreview(userRes.data.photo_url)
//       }

//       // ← Fetch spaces WITH grades in one go
//       if (spacesRes.data) {
//         const spacesWithGrades = await Promise.all(
//           spacesRes.data.map(async (space) => {
//             const { data: gradesData } = await supabase
//               .from('space_grades')
//               .select('grade')
//               .eq('space_id', space.id)
//             return { ...space, grades: gradesData?.map(g => g.grade) || [] }
//           })
//         )
//         setSpaces(spacesWithGrades)
//       }

//       if (availRes.data) {
//         const primarySpaceId = userRes.data?.primary_space_id
//         const primaryAvail = availRes.data
//           .filter((a: any) => a.space_id === primarySpaceId)
//           .map((a: any) => ({ day: a.day, time_slot_id: a.time_slot_id }))
//         setAvailability(primaryAvail)
//         setOriginalAvailability(primaryAvail)

//         const secondaryAvail: Record<number, AvailabilityEntry[]> = {}
//         availRes.data
//           .filter((a: any) => a.space_id !== primarySpaceId)
//           .forEach((a: any) => {
//             if (!secondaryAvail[a.space_id]) secondaryAvail[a.space_id] = []
//             secondaryAvail[a.space_id].push({ day: a.day, time_slot_id: a.time_slot_id })
//           })
//         setAvailabilityBySpace(secondaryAvail)
//         setOriginalAvailabilityBySpace(secondaryAvail)
//       }

//       if (userSpacesRes.data) {
//         const secondaryIds = userSpacesRes.data
//           .filter((us: any) => !us.is_primary)
//           .map((us: any) => us.space_id)
//         setSecondarySpaceIds(secondaryIds)
//         setOriginalSecondarySpaceIds(secondaryIds)
//       }

//       setLoading(false)
//     }
//     fetchData()
//   }, [numericId, admin?.orphanage_id, isLoading])

//   // Fetch primary space data when primary_space_id changes
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

//   // Load secondary space data on mount
//   useEffect(() => {
//     if (secondarySpaceIds.length === 0) return

//     const loadSecondarySpaces = async () => {
//       for (const spaceId of secondarySpaceIds) {
//         if (!operatingDaysBySpace[spaceId]) {
//           const { days, slots, limits } = await fetchSpaceDataHelper(spaceId)
//           setOperatingDaysBySpace(prev => ({ ...prev, [spaceId]: days }))
//           setTimeSlotsBySpace(prev => ({ ...prev, [spaceId]: slots }))
//           setLimitsBySpace(prev => ({ ...prev, [spaceId]: limits }))
//         }
//       }
//     }
//     loadSecondarySpaces()
//   }, [secondarySpaceIds])

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
//       if (!availabilityBySpace[spaceId]) {
//         setAvailabilityBySpace(prev => ({ ...prev, [spaceId]: [] }))
//       }
//     }
//   }

//   // Primary availability helpers
//   // const toggleAvailability = (day: string, timeSlotId: number) => {
//   //   const exists = availability.find(a => a.day === day && a.time_slot_id === timeSlotId)
//   //   if (exists) {
//   //     setAvailability(prev => prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId)))
//   //   } else {
//   //     const dayAlreadyHasSlot = availability.find(a => a.day === day)
//   //     if (dayAlreadyHasSlot) { alert(`${day} already has a time slot assigned.`); return }
//   //     if (isSlotFull(timeSlotId, day)) { alert(`This time slot is full for ${day}!`); return }
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
//     return (limit.day_counts[day] ?? 0) >= limit.max_users
//   }

//   // Secondary availability helpers
//   // const toggleAvailabilityForSpace = (spaceId: number, day: string, timeSlotId: number) => {
//   //   const spaceAvailability = availabilityBySpace[spaceId] || []
//   //   const exists = spaceAvailability.find(a => a.day === day && a.time_slot_id === timeSlotId)
//   //   if (exists) {
//   //     setAvailabilityBySpace(prev => ({
//   //       ...prev,
//   //       [spaceId]: prev[spaceId].filter(a => !(a.day === day && a.time_slot_id === timeSlotId))
//   //     }))
//   //   } else {
//   //     const dayAlreadyHasSlot = spaceAvailability.find(a => a.day === day)
//   //     if (dayAlreadyHasSlot) { alert(`${day} already has a time slot assigned for this space.`); return }
//   //     const limit = (limitsBySpace[spaceId] || []).find(l => l.time_slot_id === timeSlotId)
//   //     if (limit && (limit.day_counts[day] ?? 0) >= limit.max_users) {
//   //       alert(`This time slot is full for ${day}!`)
//   //       return
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
//     (availabilityBySpace[spaceId] || []).some(a => a.day === day && a.time_slot_id === timeSlotId)

//   const isSlotFullForSpace = (spaceId: number, timeSlotId: number, day: string) => {
//     const limit = (limitsBySpace[spaceId] || []).find(l => l.time_slot_id === timeSlotId)
//     if (!limit) return false
//     return (limit.day_counts[day] ?? 0) >= limit.max_users
//   }

//   const handleSave = async () => {
//     if (availability.length === 0) {
//       alert('Please select at least one available day and time slot.')
//       return
//     }
//     setSaving(true)

//     try {
//       // Update user info
//       const { error: userError } = await supabase
//         .from('users')
//         .update({
//           first_name: form.first_name,
//           last_name: form.last_name,
//           birthdate: form.birthdate,
//           grade_level: form.grade_level,
//           primary_space_id: parseInt(form.primary_space_id),
//         })
//         .eq('id', numericId)
//       if (userError) throw userError

//       // Nullify availability_id on sessions
//       const { data: userAvailIds } = await supabase
//         .from('availability').select('id').eq('user_id', numericId)
//       if (userAvailIds && userAvailIds.length > 0) {
//         await supabase
//           .from('attendance_session')
//           .update({ availability_id: null })
//           .in('availability_id', userAvailIds.map(a => a.id))
//       }

//       // Delete all old availability
//       const { error: deleteError } = await supabase
//         .from('availability').delete().eq('user_id', numericId)
//       if (deleteError) throw deleteError

//       await new Promise(resolve => setTimeout(resolve, 500))

//       // Insert primary availability
//       if (availability.length > 0) {
//         const { error: availError } = await supabase
//           .from('availability')
//           .insert(availability.map(a => ({
//             user_id: numericId,
//             day: a.day,
//             time_slot_id: a.time_slot_id,
//             space_id: parseInt(form.primary_space_id),
//           })))
//         if (availError) throw availError
//       }

//       // Insert secondary availability
//       for (const spaceId of secondarySpaceIds) {
//         const spaceAvailability = availabilityBySpace[spaceId] || []
//         if (spaceAvailability.length > 0) {
//           const { error } = await supabase
//             .from('availability')
//             .insert(spaceAvailability.map(a => ({
//               user_id: numericId,
//               day: a.day,
//               time_slot_id: a.time_slot_id,
//               space_id: spaceId,
//             })))
//           if (error) throw error
//         }
//       }

//       // Update user_spaces
//       await supabase.from('user_spaces').delete().eq('user_id', numericId)
//       const userSpacesRows = [
//         { user_id: numericId, space_id: parseInt(form.primary_space_id), is_primary: true },
//         ...secondarySpaceIds.map(spaceId => ({
//           user_id: numericId, space_id: spaceId, is_primary: false
//         }))
//       ]
//       const { error: userSpacesError } = await supabase.from('user_spaces').insert(userSpacesRows)
//       if (userSpacesError) throw userSpacesError

//       // Upload photo if changed
//       if (photoFile) {
//         const photoUrl = await uploadPhoto(numericId)
//         if (photoUrl) {
//           await supabase.from('users').update({ photo_url: photoUrl }).eq('id', numericId)
//           setPhotoPreview(photoUrl)
//           setPhotoFile(null)
//         }
//       }

//       setOriginalAvailability(availability)
//       setOriginalAvailabilityBySpace(availabilityBySpace)
//       setOriginalSecondarySpaceIds(secondarySpaceIds)
//       setIsEditing(false)
//       alert('User updated successfully!')

//       await createNotification('user_edited', `Admin updated user: ${form.first_name} ${form.last_name}`, admin?.orphanage_id ?? undefined)

//     } catch (error) {
//       console.error('Error updating user:', error)
//       alert('Something went wrong. Please try again.')
//     } finally {
//       setSaving(false)
//     }
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

//     const { data: existingFiles } = await supabase.storage
//       .from('profile-photos').list('', { search: `user-${userId}` })
//     if (existingFiles && existingFiles.length > 0) {
//       await supabase.storage.from('profile-photos').remove(existingFiles.map(f => f.name))
//     }

//     const { error } = await supabase.storage
//       .from('profile-photos').upload(fileName, photoFile, { upsert: true })
//     if (error) { console.error('Photo upload error:', error); return null }

//     const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName)
//     return `${data.publicUrl}?t=${Date.now()}`
//   }

//   const handleRemovePhoto = async () => {
//     if (!confirm('Are you sure you want to remove this photo?')) return
//     const { data: existingFiles } = await supabase.storage
//       .from('profile-photos').list('', { search: `user-${numericId}` })
//     if (existingFiles && existingFiles.length > 0) {
//       await supabase.storage.from('profile-photos').remove(existingFiles.map(f => f.name))
//     }
//     await supabase.from('users').update({ photo_url: null }).eq('id', numericId)
//     setPhotoPreview(null)
//     setPhotoFile(null)
//   }

//   const handleDelete = async () => {
//     if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
//     setLoading(true)

//     try {
//       const { data: sessions } = await supabase
//         .from('attendance_session').select('id').eq('user_id', numericId)

//       if (sessions && sessions.length > 0) {
//         const { error: surveyError } = await supabase
//           .from('survey_responses').delete().in('session_id', sessions.map(s => s.id))
//         if (surveyError) throw surveyError
//       }

//       await supabase.from('attendance_session').delete().eq('user_id', numericId)
//       await supabase.from('availability').delete().eq('user_id', numericId)
//       await supabase.from('user_spaces').delete().eq('user_id', numericId)
//       await supabase.from('users').delete().eq('id', numericId)

//       await createNotification('user_deleted', `Admin deleted user: ${form.first_name} ${form.last_name}`, admin?.orphanage_id ?? undefined)
//       router.push('/admin/users')

//     } catch (error) {
//       console.error('Error deleting user:', error)
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

//   const handleCancel = () => {
//     setAvailability(originalAvailability)
//     setAvailabilityBySpace(originalAvailabilityBySpace)
//     setSecondarySpaceIds(originalSecondarySpaceIds)
//     setIsEditing(false)
//   }

//   const handlePrint = () => {
//     if (!form.qr_code) return
//     const printWindow = window.open('', '_blank')
//     if (!printWindow) return
//     printWindow.document.write(`
//       <html>
//         <head>
//           <title>QR Code - ${form.first_name} ${form.last_name}</title>
//           <style>
//             body { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: sans-serif; }
//           </style>
//         </head>
//         <body>
//           <h2>${form.first_name} ${form.last_name}</h2>
//           <p style="color: gray; font-size: 14px;">${form.custom_id}</p>
//           <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(form.qr_code)}" width="200" height="200" />
//           <script>window.onload = () => window.print()</script>
//         </body>
//       </html>
//     `)
//     printWindow.document.close()
//   }

//   if (loading) {
//     return (
//       <AdminGuard>
//         <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF2F0' }}>
//           <p className="text-gray-500">Loading user...</p>
//         </div>
//       </AdminGuard>
//     )
//   }

//   return (
//     <AdminGuard>
//       <div className="min-h-screen p-8" style={{ backgroundColor: '#FAF2F0' }}>
//         <div className="max-w-2xl mx-auto">
//           <div className="bg-white rounded-xl shadow p-8">

//             {/* Header */}
//             <div className="flex justify-between items-center mb-6">
//               <h1 className="text-2xl font-bold text-black">{form.first_name} {form.last_name}</h1>
//               <span className={`text-xs px-2 py-1 rounded-full font-medium ${
//                 form.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
//               }`}>
//                 {form.is_active ? 'Active' : 'Inactive'}
//               </span>
//             </div>

//             {/* Basic Info */}
//             <div className="space-y-4 mb-6">
//               <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h2>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
//                 <input type="text" value={form.first_name}
//                   onChange={e => setForm({ ...form, first_name: e.target.value })}
//                   disabled={!isEditing}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
//                 <input type="text" value={form.last_name}
//                   onChange={e => setForm({ ...form, last_name: e.target.value })}
//                   disabled={!isEditing}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
//                 />
//               </div>

//               {/* Profile Photo */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
//                 <div className="flex items-center gap-4">
//                   {photoPreview ? (
//                     <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
//                   ) : (
//                     <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl border border-gray-200">👤</div>
//                   )}
//                   <div>
//                     <input type="file" accept="image/*" onChange={handlePhotoChange}
//                       className="hidden" id="photo-upload" disabled={!isEditing} />
//                     <label htmlFor="photo-upload"
//                       className={`px-4 py-2 rounded-lg text-sm ${isEditing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}>
//                       Choose Photo
//                     </label>
//                     {photoPreview && isEditing && (
//                       <button type="button" onClick={handleRemovePhoto}
//                         className="ml-2 text-red-500 hover:text-red-700 text-sm">Remove</button>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
//                 <input type="date" value={form.birthdate}
//                   onChange={e => setForm({ ...form, birthdate: e.target.value })}
//                   disabled={!isEditing}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
//                 <select value={form.grade_level}
//                   onChange={e => setForm({ ...form, grade_level: e.target.value })}
//                   disabled={!isEditing}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] disabled:bg-gray-50 disabled:text-gray-500"
//                 >
//                   <option value="Daycare">Daycare</option>
//                   <option value="Kindergarten">Kindergarten</option>
//                   {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
//                     <option key={g} value={g}>Grade {g}</option>
//                   ))}
//                 </select>
//               </div>

//               {/* Primary Space */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Primary Component</label>
//                 <div className="flex gap-4 mb-3">
//                   {spaces.map(space => (
//                     <label key={space.id}
//                       className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
//                       <input type="radio" className="accent-[#FF6347]" name="space"
//                         value={space.id}
//                         checked={form.primary_space_id === space.id.toString()}
//                         onChange={e => {
//                           setForm({ ...form, primary_space_id: e.target.value })
//                           setSecondarySpaceIds(prev => prev.filter(id => id !== parseInt(e.target.value)))
//                         }}
//                         disabled={!isEditing}
//                       />
//                       <span className="text-sm text-gray-700">{space.space_name}</span>
//                     </label>
//                   ))}
//                 </div>

//                 {/* Secondary Spaces */}
//                 {form.primary_space_id && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Secondary Components <span className="text-gray-400 text-xs">(optional)</span>
//                     </label>
//                     <div className="flex gap-4">
//                       {spaces
//                         .filter(s => s.id.toString() !== form.primary_space_id)
//                         .map(space => (
//                           <label key={space.id}
//                             className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
//                             <input type="checkbox" className="accent-[#FF6347]"
//                               checked={secondarySpaceIds.includes(space.id)}
//                               onChange={() => isEditing && toggleSecondarySpace(space.id)}
//                               disabled={!isEditing}
//                             />
//                             <span className="text-sm text-gray-700">{space.space_name}</span>
//                           </label>
//                         ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Primary Availability Grid */}
//             <div className="space-y-4 mb-6">
//               <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
//                 Availability — {spaces.find(s => s.id.toString() === form.primary_space_id)?.space_name}
//               </h2>
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm">
//                   <thead>
//                     <tr>
//                       <th className="text-left py-2 pr-4 text-gray-500 font-medium">Time</th>
//                       {operatingDays.map(day => (
//                         <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
//                           {day.slice(0, 3)}
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {timeSlots.map(slot => (
//                       <tr key={slot.id} className="border-t">
//                         <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">{slot.label}</td>
//                         {operatingDays.map(day => (
//                           <td key={day} className="text-center py-2 px-2">
//                             {isSlotFull(slot.id, day) && !isSelected(day, slot.id) && (
//                               <span className="block text-red-400 text-xs">Full</span>
//                             )}
//                             <input
//                               type="checkbox"
//                               checked={isSelected(day, slot.id)}
//                               onChange={() => isEditing && toggleAvailability(day, slot.id)}
//                               disabled={!isEditing || (isSlotFull(slot.id, day) && !isSelected(day, slot.id))}
//                               className={`w-4 h-4 accent-[#FF6347] disabled:cursor-not-allowed ${!isEditing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
//                             />
//                           </td>
//                         ))}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               {form.primary_space_id && (
//                 <SpaceScheduleView spaceId={parseInt(form.primary_space_id)} operatingDays={operatingDays} />
//               )}
//             </div>

//             {/* Secondary Space Availability Grids */}
//             {secondarySpaceIds.map(spaceId => {
//               const spaceName = spaces.find(s => s.id === spaceId)?.space_name
//               const days = operatingDaysBySpace[spaceId] || []
//               const slots = timeSlotsBySpace[spaceId] || []

//               return (
//                 <div key={spaceId} className="space-y-4 mb-6">
//                   <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
//                     Availability — {spaceName}
//                     <span className="text-gray-400 text-sm font-normal"> (Optional)</span>
//                   </h2>
//                   {days.length === 0 || slots.length === 0 ? (
//                     <p className="text-gray-400 text-sm">Loading schedule...</p>
//                   ) : (
//                     <div className="overflow-x-auto">
//                       <table className="w-full text-sm">
//                         <thead>
//                           <tr>
//                             <th className="text-left py-2 pr-4 text-gray-500 font-medium">Time</th>
//                             {days.map(day => (
//                               <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
//                                 {day.slice(0, 3)}
//                               </th>
//                             ))}
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {slots.map(slot => (
//                             <tr key={slot.id} className="border-t">
//                               <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">{slot.label}</td>
//                               {days.map(day => (
//                                 <td key={day} className="text-center py-2 px-2">
//                                   {isSlotFullForSpace(spaceId, slot.id, day) && !isSelectedForSpace(spaceId, day, slot.id) && (
//                                     <span className="block text-red-400 text-xs">Full</span>
//                                   )}
//                                   <input
//                                     type="checkbox"
//                                     checked={isSelectedForSpace(spaceId, day, slot.id)}
//                                     onChange={() => isEditing && toggleAvailabilityForSpace(spaceId, day, slot.id)}
//                                     disabled={!isEditing || (isSlotFullForSpace(spaceId, slot.id, day) && !isSelectedForSpace(spaceId, day, slot.id))}
//                                     className={`w-4 h-4 accent-[#FF6347] disabled:cursor-not-allowed ${!isEditing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
//                                   />
//                                 </td>
//                               ))}
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}
//                   {(availabilityBySpace[spaceId] || []).length > 0 && (
//                     <p className="text-xs text-green-600">
//                       {availabilityBySpace[spaceId].length} slot{availabilityBySpace[spaceId].length > 1 ? 's' : ''} selected
//                     </p>
//                   )}
//                   <SpaceScheduleView spaceId={spaceId} operatingDays={days} />
//                 </div>
//               )
//             })}

//             {/* QR Code Section */}
//             <div className="mb-6">
//               <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">QR Code</h2>
//               <div className="flex items-center gap-4">
//                 <button onClick={() => setShowQR(!showQR)}
//                   className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
//                   {showQR ? 'Hide QR' : 'Show QR'}
//                 </button>
//                 <button onClick={handlePrint}
//                   className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm">
//                   Print QR
//                 </button>
//               </div>
//               {showQR && (
//                 <div className="mt-4 flex justify-center">
//                   <QRCode value={form.qr_code} size={200} />
//                 </div>
//               )}
//             </div>

//             {/* Action Buttons */}
//             <div className="flex gap-3">
//               {!isEditing ? (
//                 <>
//                   <button onClick={() => setIsEditing(true)}
//                     className="flex-1 bg-[#EEEEC6] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium">
//                     Edit
//                   </button>
//                   <button onClick={handleDelete}
//                     className="flex-1 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200">
//                     Delete
//                   </button>
//                   <button onClick={() => router.push('/admin/users')}
//                     className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">
//                     Back
//                   </button>
//                 </>
//               ) : (
//                 <>
//                   <button onClick={handleSave} disabled={saving}
//                     className="flex-1 bg-[#CEE4B8] text-black py-2 rounded-lg hover:bg-[#414141] hover:text-white font-medium disabled:opacity-50">
//                     {saving ? 'Saving...' : 'Save'}
//                   </button>
//                   <button onClick={handleCancel}
//                     className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">
//                     Cancel
//                   </button>
//                 </>
//               )}
//             </div>

//           </div>
//         </div>
//       </div>
//     </AdminGuard>
//   )
// }