import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { username, password, orphanageId } = await request.json()

    // Fetch admin from new admins table
    let query = supabase
      .from('admins')
      .select('*, orphanages(id, name, code)')
      .eq('username', username)

    // Superadmin can log in regardless of orphanage selected
    // Regular admin must belong to the selected orphanage
    const { data: admins, error } = await query

    if (error || !admins || admins.length === 0) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Find matching admin
    const admin = admins.find(a => {
      if (a.role === 'superadmin') return true
      return a.orphanage_id === orphanageId
    })

    if (!admin) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash)
    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // For superadmin, use the selected orphanage
    // For regular admin, use their assigned orphanage
    let orphanageName = null
    let orphanageCode = null
    let effectiveOrphanageId = admin.orphanage_id

    if (admin.role === 'superadmin') {
      // Fetch the selected orphanage details
      const { data: orphanage } = await supabase
        .from('orphanages')
        .select('id, name, code')
        .eq('id', orphanageId)
        .single()

      if (orphanage) {
        orphanageName = orphanage.name
        orphanageCode = orphanage.code
        effectiveOrphanageId = orphanage.id
      }
    } else {
      orphanageName = (admin.orphanages as any)?.name || null
      orphanageCode = (admin.orphanages as any)?.code || null
    }

    return NextResponse.json({
      message: 'Login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        orphanage_id: effectiveOrphanageId,
        orphanage_name: orphanageName,
        orphanage_code: orphanageCode,
      }
    })

  } catch (err) {
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    )
  }
}