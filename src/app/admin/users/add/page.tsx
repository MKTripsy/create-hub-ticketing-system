'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
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
  start_time: string
  end_time: string
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

export default function AddUserPage() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [limits, setLimits] = useState<SpaceTimeslotLimit[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [generatedId, setGeneratedId] = useState('')
  const [qrValue, setQrValue] = useState('')
  const [savedUser, setSavedUser] = useState({ first_name: '', last_name: '' })
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([])

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    grade_level: '',
    space_id: '',
  })

  // Fetch spaces and time slots
  useEffect(() => {
    const fetchData = async () => {
      const [spacesRes, timeSlotsRes] = await Promise.all([
        supabase.from('spaces').select('*').eq('is_active', true),
        supabase.from('time_slots').select('*').eq('is_active', true).order('start_time')
      ])
      if (spacesRes.data) setSpaces(spacesRes.data)
      if (timeSlotsRes.data) setTimeSlots(timeSlotsRes.data)
    }
    fetchData()
  }, [])

  // Fetch limits when space changes
  useEffect(() => {
    if (!form.space_id) return

    const fetchLimits = async () => {
      // Get limits for selected space
      const { data: limitsData } = await supabase
        .from('space_timeslot_limits')
        .select('time_slot_id, max_users')
        .eq('space_id', parseInt(form.space_id))

      if (!limitsData) return

      // Get current count of users per timeslot for this space
      const counts = await Promise.all(
        limitsData.map(async (limit) => {
          const { count } = await supabase
            .from('availability')
            .select('id', { count: 'exact' })
            .eq('time_slot_id', limit.time_slot_id)
            .eq('space_id', parseInt(form.space_id))

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
  }, [form.space_id])

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

  // Toggle availability
  const toggleAvailability = (day: string, timeSlotId: number) => {
    const exists = availability.find(
      a => a.day === day && a.time_slot_id === timeSlotId
    )

    if (exists) {
      // Remove if already selected
      setAvailability(prev =>
        prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId))
      )
    } else {
      // Check if timeslot is full
      const limit = limits.find(l => l.time_slot_id === timeSlotId)
      if (limit && limit.current_count >= limit.max_users) {
        alert(`This time slot is full for ${spaces.find(s => s.id === parseInt(form.space_id))?.space_name}!`)
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

  // Generate custom ID
  const generateCustomId = async () => {
    const year = new Date().getFullYear().toString().slice(-2)
    const branchAbbr = 'HOH'

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
    const customId = await generateCustomId()
    const qrCode = uuidv4()

    // Insert user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        custom_id: customId,
        first_name: form.first_name,
        last_name: form.last_name,
        birthdate: form.birthdate,
        grade_level: form.grade_level,
        space_id: parseInt(form.space_id),
        qr_code: qrCode,
        is_active: true,
      })
      .select()
      .single()

    if (userError) {
      console.error('User insert error:', userError)
      throw userError
    }

    console.log('User created:', newUser)
    console.log('Availability to save:', availability)
    console.log('Space ID:', form.space_id)

    if (availability.length > 0) {
      const availabilityRows = availability.map(a => ({
        user_id: newUser.id,
        day: a.day,
        time_slot_id: a.time_slot_id,
        space_id: parseInt(form.space_id),
      }))

      console.log('Availability rows:', availabilityRows)

      const { error: availError } = await supabase
        .from('availability')
        .insert(availabilityRows)

      if (availError) {
        console.error('Availability insert error:', availError)
        throw availError
      }

      console.log('Availability saved successfully!')

    } else {
      console.log('No availability selected')
    }

    setGeneratedId(customId)
    setQrValue(qrCode)
    setSavedUser({ first_name: form.first_name, last_name: form.last_name })
    setSuccess(true)

  } catch (error) {
    console.error('Error adding user:', error)
    alert('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}
  // const handleSubmit = async (e: React.FormEvent) => {      27/03/2026 10:00
  //   e.preventDefault()
  //   setLoading(true)

  //   try {
  //     const customId = await generateCustomId()
  //     const qrCode = uuidv4()

  //     // Insert user
  //     const { data: newUser, error: userError } = await supabase
  //       .from('users')
  //       .insert({
  //         custom_id: customId,
  //         first_name: form.first_name,
  //         last_name: form.last_name,
  //         birthdate: form.birthdate,
  //         grade_level: form.grade_level,
  //         space_id: parseInt(form.space_id),
  //         qr_code: qrCode,
  //         is_active: true,
  //       })
  //       .select()
  //       .single()

  //     if (userError) {
  //     console.error('User insert error:', userError)
  //     throw userError
  //   }

  //    console.log('User created:', newUser) //for error checking

  //     // Insert availability if any selected
  //      console.log('Availability to save:', availability)
  //       console.log('Space ID:', form.space_id)

  //     if (availability.length > 0) {
  //       const availabilityRows = availability.map(a => ({
  //         user_id: newUser.id,
  //         day: a.day,
  //         time_slot_id: a.time_slot_id,
  //         space_id: parseInt(form.space_id),
  //       }))

  //         console.log('Availability rows:', availabilityRows)

  //       const { error: availError } = await supabase
  //         .from('availability')
  //         .insert(availabilityRows)

  //       if (availError) {
  //   console.error('Availability insert error:', availError) 
  //   throw availError
  // } console.log('Availability saved successfully!')


  //     }

  //     setGeneratedId(customId)
  //     setQrValue(qrCode)
  //     setSavedUser({ first_name: form.first_name, last_name: form.last_name })
  //     setSuccess(true)

  //   } catch (error) {
  //     console.error('Error adding user:', error)
  //     alert('Something went wrong. Please try again.')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleReset = () => {
    setSuccess(false)
    setGeneratedId('')
    setQrValue('')
    setAvailability([])
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
          <p className="text-black mb-6">
            {savedUser.first_name} {savedUser.last_name} has been registered.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-black mb-1">User ID</p>
            <p className="text-2xl font-bold text-black">{generatedId}</p>
          </div>
          <div className="flex justify-center mb-6">
            <QRCode value={qrValue} size={200} />
          </div>
          <p className="text-sm text-black mb-6">
            Download or print this QR code for the child.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Add Another User
            </button>
            
              <a href="/admin/users"
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-center"
            >
              View All Users
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" style={{ backgroundColor: '#FAF2F0' }}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h1>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                Basic Information
              </h2>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First Name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last Name"
                />
              </div>

              {/* Birthdate */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
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
                <label className="block text-sm font-medium text-black mb-1">
                  Grade Level <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.grade_level}
                  onChange={e => setForm({ ...form, grade_level: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select grade level</option>
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
            </div>

            {/* Availability Grid */}
            {form.space_id && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                  Availability <span className="text-sm font-normal text-gray-400">(Optional)</span>
                </h2>
                <p className="text-sm text-gray-500">
                  Select which days and time slots this child is available.
                  Grayed out slots are full.
                </p>

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
                            {isSlotFull(slot.id) && (
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
                                onChange={() => toggleAvailability(day, slot.id)}
                                disabled={isSlotFull(slot.id) && !isSelected(day, slot.id)}
                                className="w-4 h-4 accent-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {availability.length > 0 && (
                  <p className="text-xs text-green-600">
                    ✅ {availability.length} slot{availability.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !form.space_id}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Adding User...' : 'Add User'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

// 'use client'

// import { useState, useEffect } from 'react'
// import { supabase } from '@/lib/supabase'
// import { v4 as uuidv4 } from 'uuid'
// import QRCode from 'react-qr-code'

// // Types
// type Space = {
//   id: number
//   space_name: string
//   min_grade: number
//   max_grade: number
// }

// export default function AddUserPage() {
//   const [spaces, setSpaces] = useState<Space[]>([])
//   const [loading, setLoading] = useState(false)
//   const [success, setSuccess] = useState(false)
//   const [generatedId, setGeneratedId] = useState('')
//   const [qrValue, setQrValue] = useState('')

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     birthdate: '',
//     grade_level: '',
//     space_id: '',
//   })

//   // Fetch spaces on load
//   useEffect(() => {
//     const fetchSpaces = async () => {
//       const { data } = await supabase
//         .from('spaces')
//         .select('*')
//         .eq('is_active', true)
//       if (data) setSpaces(data)
//     }
//     fetchSpaces()
//   }, [])

//   // Auto-assign space based on grade
//   useEffect(() => {
//     if (form.grade_level) {
//       const grade = parseInt(form.grade_level)
//       const matchedSpace = spaces.find(
//         s => grade >= s.min_grade && grade <= s.max_grade
//       )
//       if (matchedSpace) {
//         setForm(prev => ({ ...prev, space_id: matchedSpace.id.toString() }))
//       }
//     }
//   }, [form.grade_level, spaces])

//   // Generate custom ID
//   const generateCustomId = async () => {
//     const year = new Date().getFullYear().toString().slice(-2)
//     const branchAbbr = 'HOH' // Change this per branch

//     const { data } = await supabase
//       .from('users')
//       .select('custom_id')
//       .order('id', { ascending: false })
//       .limit(1)

//     const lastNumber = data?.[0]?.custom_id?.split('-')[2] || '0000'
//     const newNumber = String(parseInt(lastNumber) + 1).padStart(4, '0')

//     return `${branchAbbr}-${year}-${newNumber}`
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       // Generate ID and QR code
//       const customId = await generateCustomId()
//       const qrCode = uuidv4()

//       const { error } = await supabase.from('users').insert({
//         custom_id: customId,
//         first_name: form.first_name,
//         last_name: form.last_name,
//         birthdate: form.birthdate,
//         grade_level: form.grade_level,
//         space_id: parseInt(form.space_id),
//         qr_code: qrCode,
//         is_active: true,
//       })

//       if (error) throw error

//       setGeneratedId(customId)
//       setQrValue(qrCode)
//       setSuccess(true)

//     } catch (error) {
//       console.error('Error adding user:', error)
//       alert('Something went wrong. Please try again.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleReset = () => {
//     setSuccess(false)
//     setGeneratedId('')
//     setQrValue('')
//     setForm({
//       first_name: '',
//       last_name: '',
//       birthdate: '',
//       grade_level: '',
//       space_id: '',
//     })
//   }

//   // Success screen
//   if (success) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//         <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
//           <h2 className="text-2xl font-bold text-green-600 mb-2">
//             ✅ User Added Successfully!
//           </h2>
//           <p className="text-gray-500 mb-6">
//             {form.first_name} {form.last_name} has been registered.
//           </p>

//           <div className="bg-gray-50 rounded-lg p-4 mb-6">
//             <p className="text-sm text-gray-500 mb-1">User ID</p>
//             <p className="text-2xl font-bold text-gray-800">{generatedId}</p>
//           </div>

//           <div className="flex justify-center mb-6">
//             <QRCode value={qrValue} size={200} />
//           </div>

//           <p className="text-sm text-gray-400 mb-6">
//             Download or print this QR code for the child.
//           </p>

//           <div className="flex gap-3">
//             <button
//               onClick={handleReset}
//               className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
//             >
//               Add Another User
//             </button>
//             <a
//             href="/admin/users"
//             className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-center">
//                 View All Users
//             </a>
//             </div>
//           </div>
//         </div>
      
//     )
//   }

//   // Add user form
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//       <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
//         <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h1>

//         <form onSubmit={handleSubmit} className="space-y-4">

//           {/* First Name */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               First Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               required
//               value={form.first_name}
//               onChange={e => setForm({ ...form, first_name: e.target.value })}
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="First Name Here"
//             />
//           </div>

//           {/* Last Name */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Last Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               required
//               value={form.last_name}
//               onChange={e => setForm({ ...form, last_name: e.target.value })}
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="Last Name Here"
//             />
//           </div>

//           {/* Birthdate */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Birthdate <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="date"
//               required
//               value={form.birthdate}
//               onChange={e => setForm({ ...form, birthdate: e.target.value })}
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {/* Grade Level */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Grade Level <span className="text-red-500">*</span>
//             </label>
//             <select
//               required
//               value={form.grade_level}
//               onChange={e => setForm({ ...form, grade_level: e.target.value })}
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">Select Grade Level</option>
//               <option value="1">Grade 1</option>
//               <option value="2">Grade 2</option>
//               <option value="3">Grade 3</option>
//               <option value="4">Grade 4</option>
//               <option value="5">Grade 5</option>
//               <option value="6">Grade 6</option>
//               <option value="7">Grade 7</option>
//               <option value="8">Grade 8</option>
//               <option value="9">Grade 9</option>
//               <option value="10">Grade 10</option>
//             </select>
//           </div>

//           {/* Space Assignment */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Space Assignment <span className="text-red-500">*</span>
//             </label>
//             <div className="flex gap-4">
//               {spaces.map(space => (
//                 <label key={space.id} className="flex items-center gap-2 cursor-pointer">
//                   <input
//                     type="radio"
//                     name="space"
//                     value={space.id}
//                     checked={form.space_id === space.id.toString()}
//                     onChange={e => setForm({ ...form, space_id: e.target.value })}
//                   />
//                   <span className="text-sm text-gray-700">{space.space_name}</span>
//                 </label>
//               ))}
//             </div>
//             {form.grade_level && (
//               <p className="text-xs text-blue-500 mt-1">
//                 ℹ️ Auto-assigned based on grade level. You may override this.
//               </p>
//             )}
//           </div>

//           {/* Submit */}
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
//           >
//             {loading ? 'Adding User...' : 'Add User'}
//           </button>

//         </form>
//       </div>
//     </div>
//   )
// }