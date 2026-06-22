import { supabase } from '@/lib/supabase'
import { AvailabilityEntry } from '@/hooks/useAvailabilityState'

type EditUserPayload = {
  userId: number
  form: {
    first_name: string
    last_name: string
    birthdate: string
    grade_level: string
    primary_space_id: string
  }
  availability: AvailabilityEntry[]
  availabilityBySpace: Record<number, AvailabilityEntry[]>
  secondarySpaceIds: number[]
  photoFile: File | null
}

export async function saveUser(payload: EditUserPayload): Promise<string | null> {
  const { userId, form, availability, availabilityBySpace, secondarySpaceIds, photoFile } = payload

  const { error: userError } = await supabase
    .from('users')
    .update({
      first_name: form.first_name,
      last_name: form.last_name,
      birthdate: form.birthdate,
      grade_level: form.grade_level,
      primary_space_id: parseInt(form.primary_space_id),
    })
    .eq('id', userId)
  if (userError) throw userError

  // Nullify availability_id on sessions before deleting
  const { data: userAvailIds } = await supabase
    .from('availability').select('id').eq('user_id', userId)
  if (userAvailIds && userAvailIds.length > 0) {
    await supabase
      .from('attendance_session')
      .update({ availability_id: null })
      .in('availability_id', userAvailIds.map((a: { id: number }) => a.id))
  }

  const { error: deleteError } = await supabase
    .from('availability').delete().eq('user_id', userId)
  if (deleteError) throw deleteError

  await new Promise(resolve => setTimeout(resolve, 500))

  // Insert primary availability
  if (availability.length > 0) {
    const { error } = await supabase.from('availability').insert(
      availability.map(a => ({
        user_id: userId,
        day: a.day,
        time_slot_id: a.time_slot_id,
        space_id: parseInt(form.primary_space_id),
      }))
    )
    if (error) throw error
  }

  // Insert secondary availability
  for (const spaceId of secondarySpaceIds) {
    const spaceAvailability = availabilityBySpace[spaceId] || []
    if (spaceAvailability.length > 0) {
      const { error } = await supabase.from('availability').insert(
        spaceAvailability.map(a => ({
          user_id: userId,
          day: a.day,
          time_slot_id: a.time_slot_id,
          space_id: spaceId,
        }))
      )
      if (error) throw error
    }
  }

  // Update user_spaces
  await supabase.from('user_spaces').delete().eq('user_id', userId)
  const { error: userSpacesError } = await supabase.from('user_spaces').insert([
    { user_id: userId, space_id: parseInt(form.primary_space_id), is_primary: true },
    ...secondarySpaceIds.map(spaceId => ({ user_id: userId, space_id: spaceId, is_primary: false })),
  ])
  if (userSpacesError) throw userSpacesError

  // Upload photo if changed
  if (photoFile) {
    return uploadUserPhoto(userId, photoFile)
  }
  return null
}

export async function deleteUser(userId: number): Promise<void> {
  const { data: sessions } = await supabase
    .from('attendance_session').select('id').eq('user_id', userId)

  if (sessions && sessions.length > 0) {
    const { error } = await supabase
      .from('survey_responses')
      .delete()
      .in('session_id', sessions.map((s: { id: number }) => s.id))
    if (error) throw error
  }

  await supabase.from('attendance_session').delete().eq('user_id', userId)
  await supabase.from('availability').delete().eq('user_id', userId)
  await supabase.from('user_spaces').delete().eq('user_id', userId)
  await supabase.from('users').delete().eq('id', userId)
}

export async function uploadUserPhoto(userId: number, photoFile: File): Promise<string | null> {
  const fileExt = photoFile.name.split('.').pop()
  const fileName = `user-${userId}.${fileExt}`

  const { data: existingFiles } = await supabase.storage
    .from('profile-photos').list('', { search: `user-${userId}` })
  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage.from('profile-photos').remove(existingFiles.map((f: { name: string }) => f.name))
  }

  const { error } = await supabase.storage
    .from('profile-photos').upload(fileName, photoFile, { upsert: true })
  if (error) { console.error('Photo upload error:', error); return null }

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function removeUserPhoto(userId: number): Promise<void> {
  const { data: existingFiles } = await supabase.storage
    .from('profile-photos').list('', { search: `user-${userId}` })
  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage.from('profile-photos').remove(existingFiles.map((f: { name: string }) => f.name))
  }
  await supabase.from('users').update({ photo_url: null }).eq('id', userId)
}