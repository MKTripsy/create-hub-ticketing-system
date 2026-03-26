import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        
        {/* Logo/Brand */}
        <Link 
          href="/" 
          className="text-lg font-bold text-gray-800 hover:text-blue-600"
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Home
          </Link>
        </div>

      </div>
    </nav>
  )
}