'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

type Orphanage = {
  id: number
  name: string
  code: string
}

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [orphanages, setOrphanages] = useState<Orphanage[]>([])
  const [form, setForm] = useState({
    orphanage_id: '',
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const fetchOrphanages = async () => {
      const { data } = await supabase
        .from('orphanages')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      if (data) setOrphanages(data)
    }
    fetchOrphanages()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orphanage_id) {
      setError('Please select a Create Hub.')
      return
    }
    setLoading(true)
    setError('')

    const success = await login(
      form.username,
      form.password,
      parseInt(form.orphanage_id)
    )

    if (success) {
      router.push('/admin/dashboard')
    } else {
      setError('Invalid username or password.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#faf2f0] flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Create Hub Dropdown */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Create Hub
            </label>
            <select
              required
              value={form.orphanage_id}
              onChange={e => setForm({ ...form, orphanage_id: e.target.value })}
              className="w-full border border-[#76bcad] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#76bcad]"
            >
              <option value="">Select a Create Hub</option>
              {orphanages.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })}
              className="w-full border border-[#76bcad] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#76bcad]"
              placeholder="Enter username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-[#76bcad] rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#76bcad] text-black"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-black"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cee4b8] text-[#414141] py-2 rounded-lg hover:bg-[#76bcad] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-medium mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>
      </div>
    </div>
  )
}