import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-cforange border-b border-gray-200 px-8 py-4" style={{ backgroundColor: '#FF6347' }}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        
        {/* Logo/Brand */}
        <Link 
          href="/" 
          className="text-lg font-bold text-gray-800"
        >
          Create Foundation Ticketing System
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/admin/users"
            className="text-gray-600 hover:text-blue-600 text-sm font-medium"
          >
            Users
          </Link>
          <Link
            href="/scan"
            className="text-gray-600 hover:text-blue-600 text-sm font-medium"
          >
            Scan
          </Link>
          <Link
            href="/"
            className="text-black px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium" style={{ backgroundColor: '#EEEEC6' }}
          >
            Home
          </Link>
        </div>

      </div>
    </nav>
  )
}