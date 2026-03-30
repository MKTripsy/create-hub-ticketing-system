import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    console.log('Login attempt for username:', username)

    // Find admin by username
    const { data: admin, error } = await supabase
      .from('admin')
      .select('*')
      .eq('username', username)
      .single()

      console.log('Admin found:', admin ? 'yes' : 'no') 
      console.log('DB error:', error) 


    if (error || !admin) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, admin.password_hash)

    console.log('Password match:', passwordMatch)

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_session', JSON.stringify({
      id: admin.id,
      username: admin.username,
      first_name: admin.first_name,
      last_name: admin.last_name,
      isLoggedIn: true
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8 // 8 hours
    })

    console.log('Cookie set successfully')

    return NextResponse.json({ message: 'Login successful' })

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    )
  }
}