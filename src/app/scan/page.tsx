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
import AdminGuard from '@/components/AdminGuard'
import { createNotification } from '@/lib/notifications'

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null)
  const [surveyOptions, setSurveyOptions] = useState<SurveyOption[]>([])
  const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null)
  const [newSessionId, setNewSessionId] = useState<number | null>(null)
  const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null)
  const [currentSpaceId, setCurrentSpaceId] = useState<number | null>(null)
  const [currentSpaceName, setCurrentSpaceName] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const getCurrentTimeSlotForSpace = async (spaceId: number): Promise<TimeSlot | null> => {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .eq('space_id', spaceId)
      .lte('start_time', currentTime)
      .gte('end_time', currentTime)
      .eq('is_active', true)
      .single()
    return data || null
  }

  const checkAvailabilityForSpace = async (
    userId: number,
    timeSlotId: number,
    spaceId: number
  ): Promise<boolean> => {
    const now = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[now.getDay()]
    const { data } = await supabase
      .from('availability')
      .select('id')
      .eq('user_id', userId)
      .eq('day', today)
      .eq('time_slot_id', timeSlotId)
      .eq('space_id', spaceId)
      .single()
    return !!data
  }

  const checkActiveSession = async (userId: number): Promise<AttendanceSession | null> => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })
    const { data } = await supabase
      .from('attendance_session')
      .select('id, time_started, accessed_space')
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
        grade_level, primary_space_id, photo_url,
        spaces:primary_space_id ( id, space_name )
      `)
      .eq('is_active', true)

    const { data, error } = isQrCode
      ? await query.eq('qr_code', identifier).single()
      : await query.eq('custom_id', identifier.toUpperCase()).single()

    if (error || !data) { setScanState('not_found'); return }

    const user = data as unknown as User
    setCurrentUser(user)

    // Check for active session
    const activeSession = await checkActiveSession(user.id)
    if (activeSession) {
      setCurrentSession(activeSession)
      const spaceId = (activeSession as any).accessed_space || user.primary_space_id
      await fetchSurveyOptions(spaceId)
      setScanState('already_clocked_in')
      return
    }

    // Fetch all spaces for this user (primary + secondary)
    const { data: userSpaces } = await supabase
      .from('user_spaces')
      .select('space_id, is_primary, spaces ( id, space_name )')
      .eq('user_id', user.id)

    // If no user_spaces records, fall back to primary only
    const allSpaceIds = userSpaces && userSpaces.length > 0
      ? userSpaces.map((us: any) => us.space_id)
      : [user.primary_space_id]

    // Find which space has a matching time slot + availability
    let matchedSpaceId: number | null = null
    let matchedTimeSlot: TimeSlot | null = null
    let matchedSpaceName: string | null = null

    for (const spaceId of allSpaceIds) {
      const timeSlot = await getCurrentTimeSlotForSpace(spaceId)
      if (!timeSlot) continue

      const isAvailable = await checkAvailabilityForSpace(user.id, timeSlot.id, spaceId)
      if (!isAvailable) continue

      // Found a match!
      matchedSpaceId = spaceId
      matchedTimeSlot = timeSlot

      // Get space name
      const spaceRecord = userSpaces?.find((us: any) => us.space_id === spaceId)
      matchedSpaceName = (spaceRecord?.spaces as any)?.space_name || null

      break // Use first match
    }

    if (!matchedSpaceId || !matchedTimeSlot) {
      setScanState('not_available')
      return
    }

    setCurrentTimeSlot(matchedTimeSlot)
    setCurrentSpaceId(matchedSpaceId)
    setCurrentSpaceName(matchedSpaceName)

    await fetchSurveyOptions(matchedSpaceId)
    setScanState('pre_survey')
  }

  const handleClockIn = async () => {
    if (!currentUser || !currentTimeSlot || !currentSpaceId) return

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = days[new Date().getDay()]

    const { data: availData } = await supabase
      .from('availability')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('day', todayName)
      .eq('time_slot_id', currentTimeSlot.id)
      .eq('space_id', currentSpaceId)
      .single()

    const { data: session, error } = await supabase
      .from('attendance_session')
      .insert({
        user_id: currentUser.id,
        accessed_space: currentSpaceId,
        availability_id: availData?.id || null,
        date: today,
        time_started: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T'),
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

    await createNotification(
      'clock_in',
      `${currentUser.first_name} ${currentUser.last_name} clocked in to ${currentSpaceName || currentUser.spaces?.space_name}`
    )

    setSelectedSurveyOption(null)
    setScanState('clocked_in')
  }

  const handleClockOut = async () => {
    const sessionId = currentSession?.id || newSessionId
    if (!sessionId) return

    const { error } = await supabase
      .from('attendance_session')
      .update({
        time_ended: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T')
      })
      .eq('id', sessionId)

    if (error) { alert('Something went wrong.'); return }

    if (selectedSurveyOption) {
      await supabase.from('survey_responses').insert({
        session_id: sessionId,
        option_id: selectedSurveyOption,
        type: 'post'
      })
    }

    await createNotification(
      'clock_out',
      `${currentUser?.first_name} ${currentUser?.last_name} clocked out`
    )

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
    setCurrentSpaceId(null)
    setCurrentSpaceName(null)
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
// import { User, TimeSlot, SurveyOption, AttendanceSession, ScanState } from '@/types/scan'
// import IdleScreen from '@/components/scan/IdleScreen'
// import ScanningScreen from '@/components/scan/ScanningScreen'
// import NotFoundScreen from '@/components/scan/NotFoundScreen'
// import NotAvailableScreen from '@/components/scan/NotAvailableScreen'
// import AlreadyClockedInScreen from '@/components/scan/AlreadyClockedInScreen'
// import PreSurveyScreen from '@/components/scan/PreSurveyScreen'
// import ClockedInScreen from '@/components/scan/ClockedInScreen'
// import ClockedOutScreen from '@/components/scan/ClockedOutScreen'
// import AdminGuard from '@/components/AdminGuard'
// import { createNotification } from '@/lib/notifications'

// export default function ScanPage() {
//   const [scanState, setScanState] = useState<ScanState>('idle')
//   const [currentUser, setCurrentUser] = useState<User | null>(null)
//   const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null)
//   const [surveyOptions, setSurveyOptions] = useState<SurveyOption[]>([])
//   const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null)
//   const [newSessionId, setNewSessionId] = useState<number | null>(null)
//   const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null)
//   const scannerRef = useRef<Html5QrcodeScanner | null>(null)

//   // const getCurrentTimeSlot = async (): Promise<TimeSlot | null> => {
//   //   const now = new Date()
//   //   const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
//   //   const { data } = await supabase
//   //     .from('time_slots')
//   //     .select('*')
//   //     .lte('start_time', currentTime)
//   //     .gte('end_time', currentTime)
//   //     .eq('is_active', true)
//   //     .single()
//   //   return data || null
//   // }
//   const getCurrentTimeSlot = async (spaceId: number): Promise<TimeSlot | null> => {
//     const now = new Date()
//     const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
//     const { data } = await supabase
//       .from('time_slots')
//       .select('*')
//       .eq('space_id', spaceId)  // ← filter by space
//       .lte('start_time', currentTime)
//       .gte('end_time', currentTime)
//       .eq('is_active', true)
//       .single()
//     return data || null
//   }

//   const checkAvailability = async (userId: number, timeSlotId: number): Promise<boolean> => {
//     const now = new Date()
//     const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
//     const today = days[now.getDay()]
//     const { data } = await supabase
//       .from('availability')
//       .select('id')
//       .eq('user_id', userId)
//       .eq('day', today)
//       .eq('time_slot_id', timeSlotId)
//       .single()
//     return !!data
//   }

//   const checkActiveSession = async (userId: number): Promise<AttendanceSession | null> => {
//     // const today = new Date().toISOString().split('T')[0]
//     const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })
//     const { data } = await supabase
//       .from('attendance_session')
//       .select('id, time_started')
//       .eq('user_id', userId)
//       .eq('date', today)
//       .is('time_ended', null)
//       .single()
//     return data || null
//   }

//   const fetchSurveyOptions = async (spaceId: number) => {
//     const { data } = await supabase
//       .from('survey_options')
//       .select('id, label')
//       .eq('space_id', spaceId)
//       .eq('is_active', true)
//     if (data) setSurveyOptions(data)
//   }

//   const processUser = async (identifier: string, isQrCode: boolean) => {
//     const query = supabase
//       .from('users')
//       .select(`
//         id, custom_id, first_name, last_name,
//         grade_level, primary_space_id, photo_url,
//         spaces ( id, space_name )
//       `)
//       .eq('is_active', true)

//     const { data, error } = isQrCode
//       ? await query.eq('qr_code', identifier).single()
//       : await query.eq('custom_id', identifier.toUpperCase()).single()

//     if (error || !data) { setScanState('not_found'); return }

//     const user = data as unknown as User
//     setCurrentUser(user)

//     const activeSession = await checkActiveSession(user.id)
//     if (activeSession) {
//       setCurrentSession(activeSession)
//       await fetchSurveyOptions(user.primary_space_id)
//       setScanState('already_clocked_in')
//       return
//     }

//     // const timeSlot = await getCurrentTimeSlot()
//     const timeSlot = await getCurrentTimeSlot(user.primary_space_id)  // ← pass space_id
//     if (!timeSlot) { setScanState('not_available'); return }
//     setCurrentTimeSlot(timeSlot)

//     const isAvailable = await checkAvailability(user.id, timeSlot.id)
//     if (!isAvailable) { setScanState('not_available'); return }

//     await fetchSurveyOptions(user.primary_space_id)
//     setScanState('pre_survey')
//   }

//   const handleClockIn = async () => {
//     if (!currentUser || !currentTimeSlot) return
//     // const today = new Date().toISOString().split('T')[0]
//     const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' })
//     const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
//     const todayName = days[new Date().getDay()]

//     const { data: availData } = await supabase
//       .from('availability')
//       .select('id')
//       .eq('user_id', currentUser.id)
//       .eq('day', todayName)
//       .eq('time_slot_id', currentTimeSlot.id)
//       .single()

//     const { data: session, error } = await supabase
//       .from('attendance_session')
//       .insert({
//         user_id: currentUser.id,
//         accessed_space: currentUser.primary_space_id,
//         availability_id: availData?.id || null,
//         // date: today,
//         // time_started: new Date().toISOString(),
//         date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' }),
//         time_started: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T'),
//       })
//       .select()
//       .single()

//     if (error || !session) { alert('Something went wrong.'); return }
//     setNewSessionId(session.id)

//     if (selectedSurveyOption) {
//       await supabase.from('survey_responses').insert({
//         session_id: session.id,
//         option_id: selectedSurveyOption,
//         type: 'pre'
//       })
//     }

//     await createNotification(
//       'clock_in',
//       `${currentUser.first_name} ${currentUser.last_name} clocked in to ${currentUser.spaces?.space_name}`
//     )

//     setSelectedSurveyOption(null)
//     setScanState('clocked_in')
//   }

//   const handleClockOut = async () => {
//     const sessionId = currentSession?.id || newSessionId
//     if (!sessionId) return

//     const { error } = await supabase
//       .from('attendance_session')
//       // .update({ time_ended: new Date().toISOString() })
//       .update({ time_ended: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T')})
//       .eq('id', sessionId)

//     if (error) { alert('Something went wrong.'); return }

//     if (selectedSurveyOption) {
//       await supabase.from('survey_responses').insert({
//         session_id: sessionId,
//         option_id: selectedSurveyOption,
//         type: 'post'
//       })
//     }

//     await createNotification(
//       'clock_out',
//       `${currentUser?.first_name} ${currentUser?.last_name} clocked out`
//     )

//     setSelectedSurveyOption(null)
//     setScanState('clocked_out')
//   }

//   const handleReset = () => {
//     setScanState('idle')
//     setCurrentUser(null)
//     setCurrentSession(null)
//     setSelectedSurveyOption(null)
//     setNewSessionId(null)
//     setCurrentTimeSlot(null)
//     setSurveyOptions([])
//   }

//   const handleSelectOption = (id: number) => {
//     setSelectedSurveyOption(prev => prev === id ? null : id)
//   }

//   // Auto return after success
//   useEffect(() => {
//     if (scanState === 'clocked_in' || scanState === 'clocked_out') {
//       const timer = setTimeout(handleReset, 5000)
//       return () => clearTimeout(timer)
//     }
//   }, [scanState])

//   // QR Scanner
//   useEffect(() => {
//     if (scanState === 'scanning') {
//       const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false)
//       scanner.render(
//         async (decodedText) => {
//           scanner.clear()
//           scannerRef.current = null
//           await processUser(decodedText, true)
//         },
//         (err) => console.log(err)
//       )
//       scannerRef.current = scanner
//     }
//     return () => {
//       if (scannerRef.current) {
//         scannerRef.current.clear()
//         scannerRef.current = null
//       }
//     }
//   }, [scanState])

//   // Render correct screen
//   switch (scanState) {
//     case 'idle':
//       return <IdleScreen onStartScan={() => setScanState('scanning')} onManualSearch={(id) => processUser(id, false)} />
//     case 'scanning':
//       return <ScanningScreen onCancel={() => { if (scannerRef.current) { scannerRef.current.clear(); scannerRef.current = null } setScanState('idle') }} />
//     case 'not_found':
//       return <NotFoundScreen onReset={handleReset} />
//     case 'not_available':
//       return <NotAvailableScreen user={currentUser} onReset={handleReset} />
//     case 'already_clocked_in':
//       return <AlreadyClockedInScreen user={currentUser} surveyOptions={surveyOptions} selectedOption={selectedSurveyOption} onSelectOption={handleSelectOption} onClockOut={handleClockOut} onCancel={handleReset} />
//     case 'pre_survey':
//       return <PreSurveyScreen user={currentUser} timeSlot={currentTimeSlot} surveyOptions={surveyOptions} selectedOption={selectedSurveyOption} onSelectOption={handleSelectOption} onClockIn={handleClockIn} onCancel={handleReset} />
//     case 'clocked_in':
//       return <ClockedInScreen user={currentUser} timeSlot={currentTimeSlot} />
//     case 'clocked_out':
//       return <ClockedOutScreen user={currentUser} />
//     default:
//       return null
//   }
// }