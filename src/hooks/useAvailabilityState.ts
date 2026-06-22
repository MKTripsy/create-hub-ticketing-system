import { useState } from 'react'
import { SpaceTimeslotLimit, SpaceScheduleData } from '@/lib/api/spaces'

export type AvailabilityEntry = {
  day: string
  time_slot_id: number
}

type UseAvailabilityStateOptions = {
  getPrimarySpaceId: () => number | null
  getSecondarySpaceIds: () => number[]
}

export function useAvailabilityState({ getPrimarySpaceId, getSecondarySpaceIds }: UseAvailabilityStateOptions) {
  // Primary space state
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([])

  // Secondary spaces state
  const [availabilityBySpace, setAvailabilityBySpace] = useState<Record<number, AvailabilityEntry[]>>({})

  // Per-space schedule data
  const [operatingDaysBySpace, setOperatingDaysBySpace] = useState<Record<number, string[]>>({})
  const [timeSlotsBySpace, setTimeSlotsBySpace] = useState<Record<number, any[]>>({})
  const [limitsBySpace, setLimitsBySpace] = useState<Record<number, SpaceTimeslotLimit[]>>({})

  const loadSpaceSchedule = (spaceId: number, data: SpaceScheduleData) => {
    setOperatingDaysBySpace(prev => ({ ...prev, [spaceId]: data.days }))
    setTimeSlotsBySpace(prev => ({ ...prev, [spaceId]: data.slots }))
    setLimitsBySpace(prev => ({ ...prev, [spaceId]: data.limits }))
  }

  // ─── Helpers ────────────────────────────────────────────────

  const isDayUsedInAnySpace = (day: string, excludeSpaceId?: number): boolean => {
    const primaryId = getPrimarySpaceId()
    if (excludeSpaceId !== primaryId) {
      if (availability.some(a => a.day === day)) return true
    }
    for (const spaceId of getSecondarySpaceIds()) {
      if (excludeSpaceId === spaceId) continue
      if ((availabilityBySpace[spaceId] || []).some(a => a.day === day)) return true
    }
    return false
  }

  // ─── Primary ────────────────────────────────────────────────

  const isSelected = (day: string, timeSlotId: number) =>
    availability.some(a => a.day === day && a.time_slot_id === timeSlotId)

  const isSlotFull = (limits: SpaceTimeslotLimit[], timeSlotId: number, day: string) => {
    const limit = limits.find(l => l.time_slot_id === timeSlotId)
    return limit ? (limit.day_counts[day] ?? 0) >= limit.max_users : false
  }

  const toggleAvailability = (
    day: string,
    timeSlotId: number,
    limits: SpaceTimeslotLimit[],
    primarySpaceId: number
  ) => {
    const exists = availability.find(a => a.day === day && a.time_slot_id === timeSlotId)
    if (exists) {
      setAvailability(prev => prev.filter(a => !(a.day === day && a.time_slot_id === timeSlotId)))
    } else {
      if (availability.find(a => a.day === day)) {
        alert(`${day} already has a time slot assigned. Please uncheck it first.`)
        return
      }
      if (isDayUsedInAnySpace(day, primarySpaceId)) {
        alert(`${day} is already assigned a time slot in another space.`)
        return
      }
      if (isSlotFull(limits, timeSlotId, day)) {
        alert(`This time slot is full for ${day}!`)
        return
      }
      setAvailability(prev => [...prev, { day, time_slot_id: timeSlotId }])
    }
  }

  // ─── Secondary ──────────────────────────────────────────────

  const isSelectedForSpace = (spaceId: number, day: string, timeSlotId: number) =>
    (availabilityBySpace[spaceId] || []).some(a => a.day === day && a.time_slot_id === timeSlotId)

  const isSlotFullForSpace = (spaceId: number, timeSlotId: number, day: string) => {
    const limit = (limitsBySpace[spaceId] || []).find(l => l.time_slot_id === timeSlotId)
    return limit ? (limit.day_counts[day] ?? 0) >= limit.max_users : false
  }

  const toggleAvailabilityForSpace = (spaceId: number, day: string, timeSlotId: number) => {
    const spaceAvailability = availabilityBySpace[spaceId] || []
    const exists = spaceAvailability.find(a => a.day === day && a.time_slot_id === timeSlotId)
    if (exists) {
      setAvailabilityBySpace(prev => ({
        ...prev,
        [spaceId]: prev[spaceId].filter(a => !(a.day === day && a.time_slot_id === timeSlotId)),
      }))
    } else {
      if (spaceAvailability.find(a => a.day === day)) {
        alert(`${day} already has a time slot assigned for this space.`)
        return
      }
      if (isDayUsedInAnySpace(day, spaceId)) {
        alert(`${day} is already assigned a time slot in another space.`)
        return
      }
      const limit = (limitsBySpace[spaceId] || []).find(l => l.time_slot_id === timeSlotId)
      if (limit && (limit.day_counts[day] ?? 0) >= limit.max_users) {
        alert(`This time slot is full for ${day}!`)
        return
      }
      setAvailabilityBySpace(prev => ({
        ...prev,
        [spaceId]: [...(prev[spaceId] || []), { day, time_slot_id: timeSlotId }],
      }))
    }
  }

  const removeSpaceAvailability = (spaceId: number) => {
    setAvailabilityBySpace(prev => {
      const updated = { ...prev }
      delete updated[spaceId]
      return updated
    })
  }

  const resetAll = () => {
    setAvailability([])
    setAvailabilityBySpace({})
  }

  return {
    // State
    availability,
    setAvailability,
    availabilityBySpace,
    setAvailabilityBySpace,
    operatingDaysBySpace,
    timeSlotsBySpace,
    limitsBySpace,
    // Loaders
    loadSpaceSchedule,
    // Primary helpers
    isSelected,
    isSlotFull,
    toggleAvailability,
    // Secondary helpers
    isSelectedForSpace,
    isSlotFullForSpace,
    toggleAvailabilityForSpace,
    removeSpaceAvailability,
    // Utils
    resetAll,
  }
}