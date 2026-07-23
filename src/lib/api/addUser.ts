import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { AvailabilityEntry } from '@/hooks/useAvailabilityState'

type AddUserPayload = {
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
  // uncomment for profile picture functionality
  // photoFile?: File | null
  orphanage_id: number
  orphanage_code?: string
}

export async function generateCustomId(orphanage_id: number, orphanage_code?: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  const branchAbbr = orphanage_code || 'HOH'

  const { data } = await supabase
    .from('users')
    .select('custom_id')
    .eq('orphanage_id', orphanage_id)
    .like('custom_id', `${branchAbbr}-${year}-%`)
    .order('custom_id', { ascending: false })
    .limit(1)

  const lastNumber = data?.[0]?.custom_id?.split('-')[2] || '0000'
  const newNumber = String(parseInt(lastNumber) + 1).padStart(4, '0')
  return `${branchAbbr}-${year}-${newNumber}`
}

export async function addUser(payload: AddUserPayload): Promise<{ customId: string; qrCode: string; userId: number }> {
  const { form, availability, availabilityBySpace, secondarySpaceIds, orphanage_id, orphanage_code} = payload // add photoFile for profile picture functionality

  const customId = await generateCustomId(orphanage_id, orphanage_code)
  const qrCode = uuidv4()

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      custom_id: customId,
      first_name: form.first_name,
      last_name: form.last_name,
      birthdate: form.birthdate,
      grade_level: form.grade_level,
      primary_space_id: parseInt(form.primary_space_id),
      qr_code: qrCode,
      is_active: true,
      orphanage_id,
    })
    .select()
    .single()
  if (userError) throw userError

  // if (photoFile) {
  //   const photoUrl = await uploadNewUserPhoto(newUser.id, photoFile)
  //   if (photoUrl) {
  //     await supabase.from('users').update({ photo_url: photoUrl }).eq('id', newUser.id)
  //   }
  // }

  const { error: availError } = await supabase.from('availability').insert(
    availability.map(a => ({
      user_id: newUser.id,
      day: a.day,
      time_slot_id: a.time_slot_id,
      space_id: parseInt(form.primary_space_id),
    }))
  )
  if (availError) throw availError

  const { error: userSpacesError } = await supabase.from('user_spaces').insert([
    { user_id: newUser.id, space_id: parseInt(form.primary_space_id), is_primary: true },
    ...secondarySpaceIds.map(spaceId => ({ user_id: newUser.id, space_id: spaceId, is_primary: false })),
  ])
  if (userSpacesError) throw userSpacesError

  for (const spaceId of secondarySpaceIds) {
    const spaceAvailability = availabilityBySpace[spaceId] || []
    if (spaceAvailability.length > 0) {
      const { error } = await supabase.from('availability').insert(
        spaceAvailability.map(a => ({
          user_id: newUser.id,
          day: a.day,
          time_slot_id: a.time_slot_id,
          space_id: spaceId,
        }))
      )
      if (error) throw error
    }
  }

  return { customId, qrCode, userId: newUser.id }
}

async function uploadNewUserPhoto(userId: number, photoFile: File): Promise<string | null> {
  const fileExt = photoFile.name.split('.').pop()
  const fileName = `user-${userId}.${fileExt}`
  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(fileName, photoFile, { upsert: true })
  if (error) { console.error('Photo upload error:', error); return null }
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName)
  return data.publicUrl
}