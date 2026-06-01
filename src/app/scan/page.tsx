'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { User, TimeSlot, AttendanceSession, ScanState, SurveyQuestion } from '@/types/scan'
import IdleScreen from '@/components/scan/IdleScreen'
import ScanningScreen from '@/components/scan/ScanningScreen'
import NotFoundScreen from '@/components/scan/NotFoundScreen'
import NotAvailableScreen from '@/components/scan/NotAvailableScreen'
import AlreadyClockedInScreen from '@/components/scan/AlreadyClockedInScreen'
import PreSurveyScreen from '@/components/scan/PreSurveyScreen'
import ClockedInScreen from '@/components/scan/ClockedInScreen'
import ClockedOutScreen from '@/components/scan/ClockedOutScreen'
import { createNotification } from '@/lib/notifications'
import KioskExit from '@/components/KioskExit'

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null)
  const [newSessionId, setNewSessionId] = useState<number | null>(null)
  const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null)
  const [currentSpaceId, setCurrentSpaceId] = useState<number | null>(null)
  const [currentSpaceName, setCurrentSpaceName] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([])
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string | string[]>>({})
  const currentSessionRef = useRef(currentSession)
  const newSessionIdRef = useRef(newSessionId)
  const currentSpaceIdRef = useRef(currentSpaceId)

  useEffect(() => { currentSessionRef.current = currentSession }, [currentSession])
  useEffect(() => { newSessionIdRef.current = newSessionId }, [newSessionId])
  useEffect(() => { currentSpaceIdRef.current = currentSpaceId }, [currentSpaceId])

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
      .maybeSingle()
    return data || null
  }

  const fetchSurveyQuestions = async (spaceId: number, surveyType: 'pre' | 'post') => {
    console.log('fetchSurveyQuestions called:', spaceId, surveyType)
    const { data: questionsData } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('survey_type', surveyType)
      .eq('is_active', true)
      .order('order_index')

    if (!questionsData) return

    // Fetch options for each question
    const questionsWithOptions = await Promise.all(
      questionsData.map(async (q) => {
        const { data: options } = await supabase
          .from('survey_question_options')
          .select('*')
          .eq('question_id', q.id)
          .order('order_index')
        return { ...q, options: options || [] }
      })
    )

    setSurveyQuestions(questionsWithOptions)
    setSurveyAnswers({})
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
      await fetchSurveyQuestions(spaceId, 'post')
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

    // await fetchSurveyOptions(matchedSpaceId)
    await fetchSurveyQuestions(matchedSpaceId, 'pre')
    setScanState('pre_survey')
  }

  const handleClockIn = async () => {
    if (!currentUser || !currentTimeSlot || !currentSpaceId) return

    console.log('handleClockIn called')
    console.log('surveyQuestions:', surveyQuestions)
    console.log('surveyAnswers:', surveyAnswers)

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

    for (const question of surveyQuestions) {
      const answer = surveyAnswers[question.id]
      if (!answer || (Array.isArray(answer) && answer.length === 0)) continue

      if (question.answer_type === 'open_ended') {
        await supabase.from('survey_responses').insert({
          session_id: session.id,
          question_id: question.id,
          text_response: answer as string,
        })
      } else if (question.answer_type === 'radio') {
        await supabase.from('survey_responses').insert({
          session_id: session.id,
          question_id: question.id,
          option_id: parseInt(answer as string),
        })
      } else if (question.answer_type === 'checkbox') {
        for (const optionId of answer as string[]) {
          await supabase.from('survey_responses').insert({
            session_id: session.id,
            question_id: question.id,
            option_id: parseInt(optionId),
          })
        }
      }
    }

    await createNotification(
      'clock_in',
      `${currentUser.first_name} ${currentUser.last_name} clocked in to ${currentSpaceName || currentUser.spaces?.space_name}`
    )

    setSurveyAnswers({})
    setScanState('clocked_in')

    // Tell Electron the user clocked in and when their slot ends
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const slotEnd = currentTimeSlot?.end_time?.slice(0, 5)  // ← "10:00:00" → "10:00"
      const slotEndTime = new Date(`${today}T${slotEnd}:00`).toISOString()
      ;(window as any).electronAPI.userClockedIn(slotEndTime)
    }
  }

  const handleClockOut = async () => {
    const sessionId = currentSession?.id || newSessionId
    if (!sessionId) return

    if (surveyQuestions.length === 0 && currentSpaceId) {
      await fetchSurveyQuestions(currentSpaceId, 'post')
    }

    const { error } = await supabase
      .from('attendance_session')
      .update({
        time_ended: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T')
      })
      .eq('id', sessionId)

    if (error) { alert('Something went wrong.'); return }

    // Save post survey responses
    for (const question of surveyQuestions) {
      const answer = surveyAnswers[question.id]
      if (!answer || (Array.isArray(answer) && answer.length === 0)) continue

      if (question.answer_type === 'open_ended') {
        await supabase.from('survey_responses').insert({
          session_id: sessionId,
          question_id: question.id,
          text_response: answer as string,
        })
      } else if (question.answer_type === 'radio') {
        await supabase.from('survey_responses').insert({
          session_id: sessionId,
          question_id: question.id,
          option_id: parseInt(answer as string),
        })
      } else if (question.answer_type === 'checkbox') {
        for (const optionId of answer as string[]) {
          await supabase.from('survey_responses').insert({
            session_id: sessionId,
            question_id: question.id,
            option_id: parseInt(optionId),
          })
        }
      }
    }

    await createNotification(
      'clock_out',
      `${currentUser?.first_name} ${currentUser?.last_name} clocked out`
    )

    setSurveyAnswers({})
    setScanState('clocked_out')
  }

  const handleAutoClockOut = async () => {
    const sessionId = currentSessionRef.current?.id || newSessionIdRef.current
    const spaceId = currentSpaceIdRef.current

    console.log('Auto clockout - sessionId:', sessionId, 'spaceId:', spaceId)
    if (!sessionId) return

    // Fetch post survey questions
    if (spaceId) {
      await fetchSurveyQuestions(spaceId, 'post')
    }

    const { error } = await supabase
      .from('attendance_session')
      .update({
        time_ended: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T')
      })
      .eq('id', sessionId)

    if (error) { console.error('Auto clockout error:', error); return }

    await createNotification(
      'clock_out',
      `Auto clocked out: ${currentUser?.first_name} ${currentUser?.last_name}`
    )

    setSurveyAnswers({})
    setScanState('already_clocked_in')  // ← show post survey screen
  }

  const handleReset = () => {
    setScanState('idle')
    setCurrentUser(null)
    setCurrentSession(null)
    setNewSessionId(null)
    setCurrentTimeSlot(null)
    setCurrentSpaceId(null)
    setCurrentSpaceName(null)
    setSurveyQuestions([])
    setSurveyAnswers({})
  }

  // const handleSelectOption = (id: number) => {
  //   setSelectedSurveyOption(prev => prev === id ? null : id)
  // }

  // Auto return after success
  // useEffect(() => {
  //   const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

  //   if (scanState === 'clocked_in') {
  //     if (isElectron) return  // Electron handles this via minimize
  //     const timer = setTimeout(handleReset, 5000)
  //     return () => clearTimeout(timer)
  //   }

  //   if (scanState === 'clocked_out') {
  //     const timer = setTimeout(() => {
  //       handleReset()
  //       // In Electron, also tell main process to go fullscreen for next user
  //       if (isElectron) {
  //         (window as any).electronAPI.userClockedOut()
  //       }
  //     }, 5000)
  //     return () => clearTimeout(timer)
  //   }
  // }, [scanState])

  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

    if (scanState === 'clocked_in') {
      if (isElectron) {
        // Electron: after 3 seconds switch to already_clocked_in for easy clock-out
        const timer = setTimeout(async () => {
          if (currentSpaceId) {
            await fetchSurveyQuestions(currentSpaceId, 'post')
          }
          setScanState('already_clocked_in')
        }, 3000)
        return () => clearTimeout(timer)
      } else {
        // Browser: reset after 5 seconds so next user can scan
        const timer = setTimeout(handleReset, 5000)
        return () => clearTimeout(timer)
      }
    }

    if (scanState === 'clocked_out') {
      const timer = setTimeout(handleReset, 5000)
      return () => clearTimeout(timer)
    }
  }, [scanState])

  const scanStateRef = useRef(scanState)
  useEffect(() => {
    scanStateRef.current = scanState
  }, [scanState])

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return

    (window as any).electronAPI.onAutoClockout(() => {
      if (scanStateRef.current === 'clocked_in' || scanStateRef.current === 'already_clocked_in') {
        handleAutoClockOut()
      }
    })
  }, [])

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

  const renderScreen = () => {
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
        return <AlreadyClockedInScreen user={currentUser} surveyQuestions={surveyQuestions} surveyAnswers={surveyAnswers} onAnswerChange={(questionId, answer) => setSurveyAnswers(prev => ({ ...prev, [questionId]: answer }))} onClockOut={handleClockOut} onCancel={handleReset} />
      case 'pre_survey':
        return <PreSurveyScreen user={currentUser} timeSlot={currentTimeSlot} surveyQuestions={surveyQuestions} surveyAnswers={surveyAnswers} onAnswerChange={(questionId, answer) => setSurveyAnswers(prev => ({ ...prev, [questionId]: answer }))} onClockIn={handleClockIn} onCancel={handleReset} />
      case 'clocked_in':
        return <ClockedInScreen user={currentUser} timeSlot={currentTimeSlot} />
      case 'clocked_out':
        return <ClockedOutScreen user={currentUser} />
      default:
        return null
    }
  }

  return (
    <>
      <KioskExit />
      {renderScreen()}
    </>
  )
}