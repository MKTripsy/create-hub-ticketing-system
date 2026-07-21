'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import bcrypt from 'bcryptjs'

export default function AdminAccountSettings() {
  const { admin, refreshAdmin } = useAuth()
  const [form, setForm] = useState({
    first_name: admin?.first_name || '',
    last_name: admin?.last_name || '',
    username: admin?.username || '',
  })
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const handleSaveInfo = async () => {
    if (!admin?.id) { alert('Session expired. Please log in again.'); return }
    if (!form.first_name || !form.last_name || !form.username) {
      alert('All fields are required.')
      return
    }
    setSavingInfo(true)
    const { error } = await supabase
      .from('admins')  // ← new table
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
      })
      .eq('id', admin.id)

    if (error) {
      alert('Something went wrong. Please try again.')
    } else {
      await refreshAdmin()
      alert('Account info updated!')
    }
    setSavingInfo(false)
  }

  const handleSavePassword = async () => {
    if (!admin?.id) { alert('Session expired. Please log in again.'); return }
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      alert('All password fields are required.')
      return
    }
    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match!')
      return
    }
    if (passwords.new.length < 6) {
      alert('Password must be at least 6 characters!')
      return
    }
    setSavingPassword(true)

    const { data: adminData, error: fetchError } = await supabase
      .from('admins')  // ← new table
      .select('password_hash')
      .eq('id', admin.id)
      .single()

    if (fetchError || !adminData) {
      alert('Could not verify current password. Please try again.')
      setSavingPassword(false)
      return
    }

    const isMatch = await bcrypt.compare(passwords.current, adminData.password_hash)
    if (!isMatch) {
      alert('Current password is incorrect!')
      setSavingPassword(false)
      return
    }

    const newHash = await bcrypt.hash(passwords.new, 10)
    const { error } = await supabase
      .from('admins')  // ← new table
      .update({ password_hash: newHash })
      .eq('id', admin.id)

    if (error) {
      alert('Something went wrong. Please try again.')
    } else {
      alert('Password updated successfully!')
      setPasswords({ current: '', new: '', confirm: '' })
    }
    setSavingPassword(false)
  }

  return (
    <div className="space-y-8">

      <div className="text-xs text-gray-400">
        Admin ID: {admin?.id ?? 'NOT FOUND'} —
        Username: {admin?.username ?? 'NOT FOUND'} —
        Role: {admin?.role ?? 'NOT FOUND'}
      </div>

      {/* Account Info */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="w-full border border-[#FF6347] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="w-full border border-[#FF6347] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border border-[#FF6347] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>
          <button onClick={handleSaveInfo} disabled={savingInfo}
            className="w-full bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50">
            {savingInfo ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <hr />

      {/* Change Password */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type={showPasswords ? 'text' : 'password'} value={passwords.current}
              onChange={e => setPasswords({ ...passwords, current: e.target.value })}
              className="w-full border border-[#FF6347] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type={showPasswords ? 'text' : 'password'} value={passwords.new}
              onChange={e => setPasswords({ ...passwords, new: e.target.value })}
              className="w-full border border-[#FF6347] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type={showPasswords ? 'text' : 'password'} value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full border border-[#FF6347] rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showPasswords}
              onChange={() => setShowPasswords(!showPasswords)}
              className="w-4 h-4 accent-[#FF6347]"
            />
            <span className="text-sm text-gray-600">Show passwords</span>
          </label>
          <button onClick={handleSavePassword} disabled={savingPassword}
            className="w-full bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}