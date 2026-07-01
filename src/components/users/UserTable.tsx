import { User } from '@/lib/api/users'

type Props = {
  users: User[]
  onViewQR: (user: User) => void
}

function formatGrade(grade_level: string) {
  return isNaN(parseInt(grade_level)) ? grade_level : `Grade ${grade_level}`
}

export default function UserTable({ users, onViewQR }: Props) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Profile Picture</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">ID</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Grade</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Component</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {user.photo_url ? (
                    <img
                      src={user.photo_url}
                      alt={user.first_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      👤
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user.custom_id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-800">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatGrade(user.grade_level)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.spaces?.space_name}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    user.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onViewQR(user)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View QR
                    </button>
                    <a
                      href={`/admin/users/${user.id}/edit`}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Edit
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
    </div>
  )
}