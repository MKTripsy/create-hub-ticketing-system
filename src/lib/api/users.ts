import { supabase } from '@/lib/supabase'

export type Space = {
  space_name: string
}

export type User = {
  id: number
  custom_id: string
  first_name: string
  last_name: string
  birthdate: string
  grade_level: string
  qr_code: string
  is_active: boolean
  photo_url: string | null
  spaces: Space | null
}

export async function fetchUsersByOrphanage(orphanage_id: number): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      custom_id,
      first_name,
      last_name,
      birthdate,
      grade_level,
      qr_code,
      is_active,
      photo_url,
      spaces:primary_space_id (
        space_name
      )
    `)
    .eq('orphanage_id', orphanage_id)
    .order('id', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return (data ?? []) as unknown as User[]
}