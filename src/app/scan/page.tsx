'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { User, TimeSlot, SurveyOption, AttendanceSession, ScanState } from '@/types/scan'
import IdleScreen from '@/components/scan/IdleScreen'
import ScanningScreen from '@/components/scan/ScanningScreen'
import NotFoundScreen from '@/components/scan/NotFoundScreen'
import NotAvailableScreen from '@/components/scan/NotAvailableScreen'
import AlreadyClockedInScreen from '@/components/scan/AlreadyClockedInScreen'
import PreSurveyScreen from '@/components/scan/PreSurveyScreen'
import ClockedInScreen from '@/components/scan/ClockedInScreen'
import ClockedOutScreen from '@/components/scan/ClockedOutScreen'

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null)
  const [surveyOptions, setSurveyOptions] = useState<SurveyOption[]>([])
  const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null)
  const [newSessionId, setNewSessionId] = useState<number | null>(null)
  const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const getCurrentTimeSlot = async (): Promise<TimeSlot | null> => {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .lte('start_time', currentTime)
      .gte('end_time', currentTime)
      .eq('is_active', true)
      .single()
    return data || null
  }

  const checkAvailability = async (userId: number, timeSlotId: number): Promise<boolean> => {
    const now = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[now.getDay()]
    const { data } = await supabase
      .from('availability')
      .select('id')
      .eq('user_id', userId)
      .eq('day', today)
      .eq('time_slot_id', timeSlotId)
      .single()
    return !!data
  }

  const checkActiveSession = async (userId: number): Promise<AttendanceSession | null> => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance_session')
      .select('id, time_started')
      .eq('user_id', userId)
      .eq('date', today)
      .is('time_ended', null)
      .single()
    return data || null
  }

  const fetchSurveyOptions = async (spaceId: number) => {
    const { data } = await supabase
      .from('survey_options')
      .select('id, label')
      .eq('space_id', spaceId)
      .eq('is_active', true)
    if (data) setSurveyOptions(data)
  }

  const processUser = async (identifier: string, isQrCode: boolean) => {
    const query = supabase
      .from('users')
      .select(`
        id, custom_id, first_name, last_name,
        grade_level, space_id,
        spaces ( id, space_name )
      `)
      .eq('is_active', true)

    const { data, error } = isQrCode
      ? await query.eq('qr_code', identifier).single()
      : await query.eq('custom_id', identifier.toUpperCase()).single()

    if (error || !data) { setScanState('not_found'); return }

    const user = data as unknown as User
    setCurrentUser(user)

    const activeSession = await checkActiveSession(user.id)
    if (activeSession) {
      setCurrentSession(activeSession)
      await fetchSurveyOptions(user.space_id)
      setScanState('already_clocked_in')
      return
    }

    const timeSlot = await getCurrentTimeSlot()
    if (!timeSlot) { setScanState('not_available'); return }
    setCurrentTimeSlot(timeSlot)

    const isAvailable = await checkAvailability(user.id, timeSlot.id)
    if (!isAvailable) { setScanState('not_available'); return }

    await fetchSurveyOptions(user.space_id)
    setScanState('pre_survey')
  }

  const handleClockIn = async () => {
    if (!currentUser || !currentTimeSlot) return
    const today = new Date().toISOString().split('T')[0]
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = days[new Date().getDay()]

    const { data: availData } = await supabase
      .from('availability')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('day', todayName)
      .eq('time_slot_id', currentTimeSlot.id)
      .single()

    const { data: session, error } = await supabase
      .from('attendance_session')
      .insert({
        user_id: currentUser.id,
        accessed_space: currentUser.space_id,
        availability_id: availData?.id || null,
        date: today,
        time_started: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !session) { alert('Something went wrong.'); return }
    setNewSessionId(session.id)

    if (selectedSurveyOption) {
      await supabase.from('survey_responses').insert({
        session_id: session.id,
        option_id: selectedSurveyOption,
        type: 'pre'
      })
    }

    setSelectedSurveyOption(null)
    setScanState('clocked_in')
  }

  const handleClockOut = async () => {
    const sessionId = currentSession?.id || newSessionId
    if (!sessionId) return

    const { error } = await supabase
      .from('attendance_session')
      .update({ time_ended: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) { alert('Something went wrong.'); return }

    if (selectedSurveyOption) {
      await supabase.from('survey_responses').insert({
        session_id: sessionId,
        option_id: selectedSurveyOption,
        type: 'post'
      })
    }

    setSelectedSurveyOption(null)
    setScanState('clocked_out')
  }

  const handleReset = () => {
    setScanState('idle')
    setCurrentUser(null)
    setCurrentSession(null)
    setSelectedSurveyOption(null)
    setNewSessionId(null)
    setCurrentTimeSlot(null)
    setSurveyOptions([])
  }

  const handleSelectOption = (id: number) => {
    setSelectedSurveyOption(prev => prev === id ? null : id)
  }

  // Auto return after success
  useEffect(() => {
    if (scanState === 'clocked_in' || scanState === 'clocked_out') {
      const timer = setTimeout(handleReset, 5000)
      return () => clearTimeout(timer)
    }
  }, [scanState])

  // QR Scanner
  useEffect(() => {
    if (scanState === 'scanning') {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false)
      scanner.render(
        async (decodedText) => {
          scanner.clear()
          scannerRef.current = null
          await processUser(decodedText, true)
        },
        (err) => console.log(err)
      )
      scannerRef.current = scanner
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [scanState])

  // Render correct screen
  switch (scanState) {
    case 'idle':
      return <IdleScreen onStartScan={() => setScanState('scanning')} onManualSearch={(id) => processUser(id, false)} />
    case 'scanning':
      return <ScanningScreen onCancel={() => { if (scannerRef.current) { scannerRef.current.clear(); scannerRef.current = null } setScanState('idle') }} />
    case 'not_found':
      return <NotFoundScreen onReset={handleReset} />
    case 'not_available':
      return <NotAvailableScreen user={currentUser} onReset={handleReset} />
    case 'already_clocked_in':
      return <AlreadyClockedInScreen user={currentUser} surveyOptions={surveyOptions} selectedOption={selectedSurveyOption} onSelectOption={handleSelectOption} onClockOut={handleClockOut} onCancel={handleReset} />
    case 'pre_survey':
      return <PreSurveyScreen user={currentUser} timeSlot={currentTimeSlot} surveyOptions={surveyOptions} selectedOption={selectedSurveyOption} onSelectOption={handleSelectOption} onClockIn={handleClockIn} onCancel={handleReset} />
    case 'clocked_in':
      return <ClockedInScreen user={currentUser} timeSlot={currentTimeSlot} />
    case 'clocked_out':
      return <ClockedOutScreen user={currentUser} />
    default:
      return null
  }
}

// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import { supabase } from '@/lib/supabase'
// import { Html5QrcodeScanner } from 'html5-qrcode'

// type Space = {
//   space_name: string
// }

// type User = {
//   id: number
//   custom_id: string
//   first_name: string
//   last_name: string
//   grade_level: string
//   space_id: number
//   spaces: Space | null
// }

// export default function ScanPage() {
//   const [scanning, setScanning] = useState(false)
//   const [result, setResult] = useState<User | null>(null)
//   const [notFound, setNotFound] = useState(false)
//   const [manualId, setManualId] = useState('')
//   const [manualLoading, setManualLoading] = useState(false)
//   const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')
//   const scannerRef = useRef<Html5QrcodeScanner | null>(null)

//   const lookupUser = async (qrCode: string) => {
//     const { data, error } = await supabase
//       .from('users')
//       .select(`
//         id,
//         custom_id,
//         first_name,
//         last_name,
//         grade_level,
//         space_id,
//         spaces (
//           space_name
//         )
//       `)
//       .eq('qr_code', qrCode)
//       .eq('is_active', true)
//       .single()

//     if (error || !data) {
//       setNotFound(true)
//     } else {
//       setResult(data as unknown as User)
//     }
//   }

//   const lookupByCustomId = async () => {
//     if (!manualId.trim()) return
//     setManualLoading(true)
//     setNotFound(false)

//     const { data, error } = await supabase
//       .from('users')
//       .select(`
//         id,
//         custom_id,
//         first_name,
//         last_name,
//         grade_level,
//         space_id,
//         spaces (
//           space_name
//         )
//       `)
//       .eq('custom_id', manualId.trim().toUpperCase())
//       .eq('is_active', true)
//       .single()

//     if (error || !data) {
//       setNotFound(true)
//     } else {
//       setResult(data as unknown as User)
//     }
//     setManualLoading(false)
//   }

//   const startScanner = () => {
//     setScanning(true)
//     setResult(null)
//     setNotFound(false)
//   }

//   const stopScanner = () => {
//     if (scannerRef.current) {
//       scannerRef.current.clear()
//       scannerRef.current = null
//     }
//     setScanning(false)
//   }

//   const handleReset = () => {
//     setResult(null)
//     setNotFound(false)
//     setManualId('')
//     setScanning(false)
//   }

//   useEffect(() => {
//     if (scanning) {
//       const scanner = new Html5QrcodeScanner(
//         'qr-reader',
//         { fps: 10, qrbox: 250 },
//         false
//       )

//       scanner.render(
//         async (decodedText) => {
//           scanner.clear()
//           setScanning(false)
//           await lookupUser(decodedText)
//         },
//         (errorMessage) => {
//           console.log(errorMessage)
//         }
//       )

//       scannerRef.current = scanner
//     }

//     return () => {
//       if (scannerRef.current) {
//         scannerRef.current.clear()
//         scannerRef.current = null
//       }
//     }
//   }, [scanning])

//   // Result screen
//   if (result) {
//     return (
//       <div className="min-h-screen flex items-center justify-center p-8">
//         <div className="rounded-xl shadow p-8 max-w-md w-full text-center">
//           <div className="text-6xl mb-4">👋</div>
//           <h2 className="text-3xl font-bold text-green-600 mb-2">
//             Welcome, {result.first_name}!
//           </h2>
//           <p className="text-gray-500 mb-6">
//             Successfully verified in the system
//           </p>
//           <div className="rounded-lg p-4 mb-6 text-left space-y-2">
//             <div className="flex justify-between">
//               <span className="text-black text-sm">Full Name</span>
//               <span className="font-medium text-black">
//                 {result.first_name} {result.last_name}
//               </span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-black text-sm">ID</span>
//               <span className="font-medium text-black">{result.custom_id}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-black text-sm">Grade</span>
//               <span className="font-medium text-black">Grade {result.grade_level}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-black text-sm">Space</span>
//               <span className="font-medium text-black">
//                 {result.spaces?.space_name}
//               </span>
//             </div>
//           </div>
//           <button
//             onClick={handleReset}
//             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
//           >
//             Scan Another
//           </button>
//         </div>
//       </div>
//     )
//   }

//   // Not found screen
//   if (notFound) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//         <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
//           <div className="text-6xl mb-4">❌</div>
//           <h2 className="text-2xl font-bold text-red-600 mb-2">
//             User Not Found
//           </h2>
//           <p className="text-gray-500 mb-6">
//             No registered user found with that QR code or ID.
//           </p>
//           <button
//             onClick={handleReset}
//             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     )
//   }

//   // Main scan page
//   return (
//     <div className="min-h-screen flex items-center justify-center p-8">
//       <div className="rounded-xl shadow p-8 max-w-md w-full" style={{ backgroundColor: '#CEE4B8' }}>

//         <h1 className="text-2xl font-bold text-black mb-2 text-center">
//           Verify User
//         </h1>
//         <p className="text-black text-center mb-6">
//           Scan QR code or enter ID manually
//         </p>
//         <p className="text-black text-center mb-6">
//           Please click on Request Camera Permissions if the camera does not turn on automatically
//         </p>

//         {/* Tabs */}
//         <div className="flex border-b mb-6">
//           <button
//             onClick={() => { setActiveTab('qr'); stopScanner() }}
//             className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
//               activeTab === 'qr'
//                 ? 'border-black text-black'
//                 : 'border-transparent text-gray-400 hover:text-gray-600'
//             }`}
//           >
//             Scan QR Code
//           </button>
//           <button
//             onClick={() => { setActiveTab('manual'); stopScanner() }}
//             className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
//               activeTab === 'manual'
//                 ? 'border-black text-black'
//                 : 'border-transparent text-gray-400 hover:text-gray-600'
//             }`}
//           >
//             Enter ID
//           </button>
//         </div>

//         {/* QR Tab */}
//         {activeTab === 'qr' && (
//           <div className="text-center">
//             {!scanning ? (
//               <button
//                 onClick={startScanner}
//                 className="w-full text-black py-3 rounded-lg hover:bg-blue-700 font-medium text-lg" style={{ backgroundColor: '#EEEEC6' }}
//               >
//                  Start Scanning
//               </button>
//             ) : (
//               <div>
//                 <div id="qr-reader" className="mb-4 text-black" />
//                 <button
//                   onClick={stopScanner}
//                   className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300"
//                 >
//                   ✖ Cancel
//                 </button>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Manual ID Tab */}
//         {activeTab === 'manual' && (
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Enter User ID
//             </label>
//             <input
//               type="text"
//               value={manualId}
//               onChange={e => setManualId(e.target.value)}
//               onKeyDown={e => e.key === 'Enter' && lookupByCustomId()}
//               placeholder="e.g. HOH-26-0001"
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4  text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               onClick={lookupByCustomId}
//               disabled={manualLoading || !manualId.trim()}
//               className="w-full text-black py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//               style={{ backgroundColor: '#EEEEC6' }}
//             >
//               {manualLoading ? 'Searching...' : 'Search User'}
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }



// // 'use client'

// // import { useState, useEffect, useRef } from 'react'
// // import { supabase } from '@/lib/supabase'
// // import { Html5QrcodeScanner } from 'html5-qrcode'

// // type Space = {
// //   space_name: string
// // }



// // type User = {
// //   id: number
// //   custom_id: string
// //   first_name: string
// //   last_name: string
// //   grade_level: string
// //   space_id: number
// //   spaces: Space | null
// // }

// // export default function ScanPage() {
// //   const [scanning, setScanning] = useState(false)
// //   const [result, setResult] = useState<User | null>(null)
// //   const [notFound, setNotFound] = useState(false)
// //   const [error, setError] = useState('')
// //   const scannerRef = useRef<Html5QrcodeScanner | null>(null)

// //   const startScanner = () => {
// //     setScanning(true)
// //     setResult(null)
// //     setNotFound(false)
// //     setError('')
// //   }

// //   const stopScanner = () => {
// //     if (scannerRef.current) {
// //       scannerRef.current.clear()
// //       scannerRef.current = null
// //     }
// //     setScanning(false)
// //   }

// //   useEffect(() => {
// //     if (scanning) {
// //       const scanner = new Html5QrcodeScanner(
// //         'qr-reader',
// //         { fps: 10, qrbox: 250 },
// //         false
// //       )

// //       scanner.render(
// //         async (decodedText) => {
// //           // Stop scanning after first successful scan
// //           scanner.clear()
// //           setScanning(false)

// //           // Look up user in database
// //           const { data, error } = await supabase
// //             .from('users')
// //             .select(`
// //               id,
// //               custom_id,
// //               first_name,
// //               last_name,
// //               grade_level,
// //               space_id,
// //               spaces (
// //                 space_name
// //               )
// //             `)
// //             .eq('qr_code', decodedText)
// //             .eq('is_active', true)
// //             .single()

// //         //   if (error || !data) {
// //         //     setNotFound(true)
// //         //   } else {
// //         //     setResult(data as User)
// //         //   }
// //         if (error || !data) {
// //             setNotFound(true)
// //         } else {
// //             setResult(data as unknown as User)
// //         }
// //         },
// //         (errorMessage) => {
// //           // Ignore scan errors — they fire constantly while scanning
// //           console.log(errorMessage)
// //         }
// //       )

// //       scannerRef.current = scanner
// //     }

// //     return () => {
// //       if (scannerRef.current) {
// //         scannerRef.current.clear()
// //         scannerRef.current = null
// //       }
// //     }
// //   }, [scanning])

// //   // Default screen
// //   if (!scanning && !result && !notFound) {
// //     return (
// //       <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-8">
// //         <div className="bg-white rounded-xl shadow text-black p-8 max-w-md w-full text-center">
// //           <h1 className="text-2xl font-bold text-black mb-2">
// //             QR Code Scanner
// //           </h1>
// //           <p className="text-black mb-8">
// //             Scan a child's QR card to verify registration
// //           </p>
// //           <button
// //             onClick={startScanner}
// //             className="w-full bg-blue-600 text-black py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
// //           >
// //             📷 Start Scanning
// //           </button>
// //         </div>
// //       </div>
// //     )
// //   }

// //   // Scanner screen
// //   if (scanning) {
// //     return (
// //       <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-8">
// //         <div className="bg-white rounded-xl  text-black shadow p-8 max-w-md w-full text-center">
// //           <h1 className="text-2xl font-bold text-black mb-2">
// //             Scanning...
// //           </h1>
// //           <p className="text-black mb-6">
// //             Hold the QR card up to the camera
// //           </p>
// //           <div id="qr-reader" className="mb-6" />
// //           <button
// //             onClick={stopScanner}
// //             className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300"
// //           >
// //             ✖ Cancel
// //           </button>
// //         </div>
// //       </div>
// //     )
// //   }

// //   // User found screen
// //   if (result) {
// //     return (
// //       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
// //         <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
// //           <div className="text-6xl mb-4">👋</div>
// //           <h2 className="text-3xl font-bold text-green-600 mb-2">
// //             Welcome, {result.first_name}!
// //           </h2>
// //           <p className="text-gray-500 mb-6">
// //             Successfully verified in the system
// //           </p>

// //           <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
// //             <div className="flex justify-between">
// //               <span className="text-black text-sm">Full Name</span>
// //               <span className="font-medium text-black">
// //                 {result.first_name} {result.last_name}
// //               </span>
// //             </div>
// //             <div className="flex justify-between">
// //               <span className="text-black text-sm">ID</span>
// //               <span className="font-medium text-black">{result.custom_id}</span>
// //             </div>
// //             <div className="flex justify-between">
// //               <span className="text-black text-sm">Grade</span>
// //               <span className="font-medium text-black">Grade {result.grade_level}</span>
// //             </div>
// //             <div className="flex justify-between">
// //               <span className="text-black text-sm">Space</span>
// //               <span className="font-medium text-black">
// //                 {result.spaces?.space_name}
// //               </span>
// //             </div>
// //           </div>

// //           <button
// //             onClick={startScanner}
// //             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
// //           >
// //             📷 Scan Another
// //           </button>
// //         </div>
// //       </div>
// //     )
// //   }

// //   // Not found screen
// //   if (notFound) {
// //     return (
// //       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
// //         <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
// //           <div className="text-6xl mb-4">❌</div>
// //           <h2 className="text-2xl font-bold text-red-600 mb-2">
// //             User Not Found
// //           </h2>
// //           <p className="text-gray-500 mb-6">
// //             This QR code is not registered in the system.
// //           </p>
// //           <button
// //             onClick={startScanner}
// //             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
// //           >
// //             📷 Try Again
// //           </button>
// //         </div>
// //       </div>
// //     )
// //   }
// // }