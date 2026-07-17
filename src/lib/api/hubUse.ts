import { supabase } from '@/lib/supabase'

export type HubUseSpace = {
  id: number
  space_name: string
}

export type HubUseRecord = {
  id: number
  date: string
  notes: string | null
  orphanage_id: number
  spaces: HubUseSpace[]
  time_opened: string | null   // derived from attendance_session
  time_closed: string | null   // derived from attendance_session
}

// ── Fetch all spaces for a hub (including inactive) ───────────────────────

export const fetchAllSpaces = async (orphanageId: number): Promise<HubUseSpace[]> => {
  const { data } = await supabase
    .from('spaces')
    .select('id, space_name')
    .eq('orphanage_id', orphanageId)
    .order('space_name')
  return data || []
}

// ── Derive open/close times from attendance_session ───────────────────────

const fetchDerivedTimes = async (
  orphanageId: number,
  date: string
): Promise<{ time_opened: string | null; time_closed: string | null }> => {
  const { data: spaceRows } = await supabase
    .from('spaces')
    .select('id')
    .eq('orphanage_id', orphanageId)

  const spaceIds = spaceRows?.map(s => s.id) || []
  if (spaceIds.length === 0) return { time_opened: null, time_closed: null }

  const { data } = await supabase
    .from('attendance_session')
    .select('time_started, time_ended')
    .in('accessed_space', spaceIds)
    .eq('date', date)

  if (!data || data.length === 0) return { time_opened: null, time_closed: null }

  const starts = data.map(s => s.time_started).filter(Boolean).sort()
  const ends = data.map(s => s.time_ended).filter(Boolean).sort()

  return {
    time_opened: starts[0] ?? null,
    time_closed: ends[ends.length - 1] ?? null,
  }
}

// ── Fetch all hub use records for a hub ───────────────────────────────────

export const fetchHubUseRecords = async (orphanageId: number): Promise<HubUseRecord[]> => {
  const { data, error } = await supabase
    .from('hub_use')
    .select(`
      id,
      date,
      notes,
      orphanage_id,
      hub_use_spaces (
        spaces ( id, space_name )
      )
    `)
    .eq('orphanage_id', orphanageId)
    .order('date', { ascending: false })

  if (error || !data) return []

  const records = await Promise.all(
    data.map(async (row: any) => {
      const times = await fetchDerivedTimes(orphanageId, row.date)
      return {
        id: row.id,
        date: row.date,
        notes: row.notes,
        orphanage_id: row.orphanage_id,
        spaces: (row.hub_use_spaces || [])
          .map((s: any) => s.spaces)
          .filter(Boolean)
          .sort((a: HubUseSpace, b: HubUseSpace) => a.space_name.localeCompare(b.space_name)),
        ...times,
      }
    })
  )

  return records
}

// ── Insert ────────────────────────────────────────────────────────────────

export const insertHubUse = async (payload: {
  orphanageId: number
  date: string
  notes: string
  spaceIds: number[]
}) => {
  const { data, error } = await supabase
    .from('hub_use')
    .insert({ orphanage_id: payload.orphanageId, date: payload.date, notes: payload.notes || null })
    .select('id')
    .single()

  if (error || !data) return { error }

  if (payload.spaceIds.length > 0) {
    const { error: spaceError } = await supabase
      .from('hub_use_spaces')
      .insert(payload.spaceIds.map(sid => ({ hub_use_id: data.id, space_id: sid })))
    if (spaceError) return { error: spaceError }
  }

  return { error: null }
}

// ── Update ────────────────────────────────────────────────────────────────

export const updateHubUse = async (payload: {
  id: number
  date: string
  notes: string
  spaceIds: number[]
}) => {
  const { error } = await supabase
    .from('hub_use')
    .update({ date: payload.date, notes: payload.notes || null })
    .eq('id', payload.id)

  if (error) return { error }

  // Replace space associations
  await supabase.from('hub_use_spaces').delete().eq('hub_use_id', payload.id)

  if (payload.spaceIds.length > 0) {
    const { error: spaceError } = await supabase
      .from('hub_use_spaces')
      .insert(payload.spaceIds.map(sid => ({ hub_use_id: payload.id, space_id: sid })))
    if (spaceError) return { error: spaceError }
  }

  return { error: null }
}

// ── Delete ────────────────────────────────────────────────────────────────

export const deleteHubUse = async (id: number) => {
  // hub_use_spaces cascade deletes automatically
  const { error } = await supabase.from('hub_use').delete().eq('id', id)
  return { error }
}

// ── Format helpers ────────────────────────────────────────────────────────

export const formatHubTime = (iso: string | null): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
  })
}

export const formatHubDate = (d: string): string => {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}