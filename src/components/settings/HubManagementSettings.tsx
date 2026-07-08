'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

type Hub = {
  id: number
  name: string
  code: string
}

type Admin = {
  id: number
  first_name: string
  last_name: string
  username: string
  role: string
  orphanage_id: number | null
  orphanage_name?: string
  photo_url?: string | null
}

function AdminAvatar({ admin }: { admin: Admin }) {
  const initials = `${admin.first_name[0] ?? ''}${admin.last_name[0] ?? ''}`.toUpperCase()
  if (admin.photo_url) {
    return (
      <img
        src={admin.photo_url}
        alt={`${admin.first_name} ${admin.last_name}`}
        className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#FF6347] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
      {initials}
    </div>
  )
}

export default function HubManagementSettings() {
  const [activeTab, setActiveTab] = useState<'hubs' | 'admins'>('hubs')

  // Hubs state
  const [hubs, setHubs] = useState<Hub[]>([])
  const [loadingHubs, setLoadingHubs] = useState(true)
  const [showHubModal, setShowHubModal] = useState(false)
  const [editingHub, setEditingHub] = useState<Hub | null>(null)
  const [hubForm, setHubForm] = useState({ name: '', code: '' })
  const [savingHub, setSavingHub] = useState(false)

  // Admins state
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    role: 'admin',
    orphanage_id: '',
  })
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetchHubs()
    fetchAdmins()
  }, [])

  // ── Hubs ──────────────────────────────────────────

  const fetchHubs = async () => {
    setLoadingHubs(true)
    const { data } = await supabase.from('orphanages').select('*').order('id')
    if (data) setHubs(data)
    setLoadingHubs(false)
  }

  const openAddHub = () => {
    setEditingHub(null)
    setHubForm({ name: '', code: '' })
    setShowHubModal(true)
  }

  const openEditHub = (hub: Hub) => {
    setEditingHub(hub)
    setHubForm({ name: hub.name, code: hub.code })
    setShowHubModal(true)
  }

  const handleSaveHub = async () => {
    if (!hubForm.name || !hubForm.code) { alert('Please fill in both name and code.'); return }
    setSavingHub(true)
    if (editingHub) {
      await supabase.from('orphanages').update({ name: hubForm.name, code: hubForm.code.toUpperCase() }).eq('id', editingHub.id)
    } else {
      await supabase.from('orphanages').insert({ name: hubForm.name, code: hubForm.code.toUpperCase() })
    }
    await fetchHubs()
    setShowHubModal(false)
    setSavingHub(false)
  }

  const handleDeleteHub = async (hub: Hub) => {
    if (!confirm(`Are you sure you want to delete "${hub.name}"? This cannot be undone.`)) return
    await supabase.from('orphanages').delete().eq('id', hub.id)
    await fetchHubs()
  }

  // ── Admins ────────────────────────────────────────

  const fetchAdmins = async () => {
    setLoadingAdmins(true)
    const { data } = await supabase
      .from('admins')
      .select('id, first_name, last_name, username, role, orphanage_id, photo_url, orphanages:orphanage_id(name)')
      .order('id')
    if (data) {
      setAdmins(data.map((a: any) => ({
        ...a,
        orphanage_name: a.orphanages?.name || 'All Hubs'
      })))
    }
    setLoadingAdmins(false)
  }

  const openAddAdmin = () => {
    setEditingAdmin(null)
    setAdminForm({ first_name: '', last_name: '', username: '', password: '', role: 'admin', orphanage_id: '' })
    setShowAdminModal(true)
  }

  const openEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setAdminForm({
      first_name: admin.first_name,
      last_name: admin.last_name,
      username: admin.username,
      password: '',
      role: admin.role,
      orphanage_id: admin.orphanage_id?.toString() || '',
    })
    setShowAdminModal(true)
  }

  const handleSaveAdmin = async () => {
    if (!adminForm.first_name || !adminForm.last_name || !adminForm.username) {
      alert('Please fill in all required fields.')
      return
    }
    if (!editingAdmin && !adminForm.password) {
      alert('Please enter a password for the new admin.')
      return
    }
    setSavingAdmin(true)

    const payload: any = {
      first_name: adminForm.first_name,
      last_name: adminForm.last_name,
      username: adminForm.username,
      role: adminForm.role,
      orphanage_id: adminForm.role === 'superadmin'
        ? null
        : adminForm.orphanage_id ? parseInt(adminForm.orphanage_id) : null,
    }
    if (adminForm.password) {
      payload.password_hash = await bcrypt.hash(adminForm.password, 10)
    }

    if (editingAdmin) {
      await supabase.from('admins').update(payload).eq('id', editingAdmin.id)
    } else {
      await supabase.from('admins').insert(payload)
    }

    await fetchAdmins()
    setShowAdminModal(false)
    setSavingAdmin(false)
  }

  const handleDeleteAdmin = async (admin: Admin) => {
    if (!confirm(`Are you sure you want to delete admin "${admin.username}"?`)) return
    await supabase.from('admins').delete().eq('id', admin.id)
    await fetchAdmins()
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        {(['hubs', 'admins'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-[#FF6347] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {tab === 'hubs' ? 'Create Hubs' : 'Admins'}
          </button>
        ))}
      </div>

      {/* ── HUBS TAB ── */}
      {activeTab === 'hubs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Create Hubs</h2>
            <button onClick={openAddHub}
              className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
              Add Hub
            </button>
          </div>
          {loadingHubs ? <p className="text-gray-400">Loading...</p> : hubs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hubs yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hubs.map(hub => (
                  <tr key={hub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{hub.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{hub.code}</td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEditHub(hub)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                      <button onClick={() => handleDeleteHub(hub)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showHubModal && (
            <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingHub ? 'Edit Hub' : 'Add Hub'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hub Name</label>
                    <input type="text" value={hubForm.name}
                      onChange={e => setHubForm({ ...hubForm, name: e.target.value })}
                      placeholder="e.g. Home of Hope"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input type="text" value={hubForm.code}
                      onChange={e => setHubForm({ ...hubForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. HOH" maxLength={10}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used as prefix for user IDs (e.g. HOH-26-0001)</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSaveHub} disabled={savingHub}
                    className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50">
                    {savingHub ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setShowHubModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADMINS TAB ── */}
      {activeTab === 'admins' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Admins</h2>
            <button onClick={openAddAdmin}
              className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium">
              Add Admin
            </button>
          </div>
          {loadingAdmins ? <p className="text-gray-400">Loading...</p> : admins.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No admins yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Hub</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AdminAvatar admin={admin} />
                        <span className="text-sm text-gray-800">{admin.first_name} {admin.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{admin.username}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        admin.role === 'superadmin'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{admin.orphanage_name}</td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEditAdmin(admin)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                      <button onClick={() => handleDeleteAdmin(admin)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showAdminModal && (
            <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingAdmin ? 'Edit Admin' : 'Add Admin'}</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input type="text" value={adminForm.first_name}
                        onChange={e => setAdminForm({ ...adminForm, first_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input type="text" value={adminForm.last_name}
                        onChange={e => setAdminForm({ ...adminForm, last_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input type="text" value={adminForm.username}
                      onChange={e => setAdminForm({ ...adminForm, username: e.target.value.replace(/\s/g, '') })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingAdmin && <span className="text-gray-400 text-xs">(leave blank to keep current)</span>}
                    </label>
                    <input type={showPassword ? 'text' : 'password'} value={adminForm.password}
                      onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                    />
                    <label className="flex items-center gap-2 mt-1 cursor-pointer">
                      <input type="checkbox" checked={showPassword}
                        onChange={() => setShowPassword(!showPassword)}
                        className="w-4 h-4 accent-[#FF6347]"
                      />
                      <span className="text-xs text-gray-500">Show password</span>
                    </label>
                  </div>

                  {editingAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <AdminAvatar admin={editingAdmin} />
                      <div className="flex flex-col gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="admin-photo-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file || !editingAdmin) return
                            const ext = file.name.split('.').pop()
                            const fileName = `admin-${editingAdmin.id}.${ext}`
                            const { error: uploadError } = await supabase.storage
                              .from('profile-photos')
                              .upload(fileName, file, { upsert: true })
                            if (uploadError) { alert('Upload failed.'); return }
                            const { data: urlData } = supabase.storage
                              .from('profile-photos')
                              .getPublicUrl(fileName)
                            await supabase.from('admins')
                              .update({ photo_url: urlData.publicUrl })
                              .eq('id', editingAdmin.id)
                            await fetchAdmins()
                            // Update editingAdmin so avatar refreshes in the modal
                            setEditingAdmin(prev => prev ? { ...prev, photo_url: urlData.publicUrl } : prev)
                          }}
                        />
                        <label htmlFor="admin-photo-upload"
                          className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 text-xs cursor-pointer w-fit">
                          Upload Photo
                        </label>
                        {editingAdmin.photo_url && (
                          <button
                            onClick={async () => {
                              await supabase.from('admins').update({ photo_url: null }).eq('id', editingAdmin.id)
                              await fetchAdmins()
                              setEditingAdmin(prev => prev ? { ...prev, photo_url: null } : prev)
                            }}
                            className="text-red-500 hover:text-red-700 text-xs text-left"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={adminForm.role}
                      onChange={e => setAdminForm({ ...adminForm, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                    >
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  {adminForm.role === 'admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Hub</label>
                      <select value={adminForm.orphanage_id}
                        onChange={e => setAdminForm({ ...adminForm, orphanage_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                      >
                        <option value="">Select a hub</option>
                        {hubs.map(hub => (
                          <option key={hub.id} value={hub.id}>{hub.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSaveAdmin} disabled={savingAdmin}
                    className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50">
                    {savingAdmin ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setShowAdminModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}