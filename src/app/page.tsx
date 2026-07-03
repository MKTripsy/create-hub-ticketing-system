import Link from 'next/link'
import CFLogo from '@/app/images/CREATE FOUNDATION logo A Dark Mode.svg'

export default function Home() {
  return (
    <main className="min-h-screen flex justify-center" style={{ backgroundColor: '#FAF2F0' }}>
      <div className="max-w-250px text-center">

        {/* Logo */}
        <div className="flex justify-center items-center text-center w-full">
          <img src={CFLogo.src} alt="Create Hub Logo" style={{height: "40%", width: "40%"}}/>
        </div>

        {/* Organization Name */}
        <div className="mb-18">
          <h1 className="text-7xl font-extrabold text-[#ff6347]">
            LET'S START CREATING
          </h1>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 items-center justify-center">
          <Link
            href="/admin/login"
            className="bg-[#ff6347] w-fit px-8 items-center justify-center gap-3 text-[#FAF2F0] py-4 rounded-4xl hover:bg-[#414141] font-extrabold text-3xl transition-colors">
            Enter Create Hub Portal
          </Link>

          <Link
            href="/scan"
            className="w-fit px-8 items-center justify-center gap-3 text-[#FF6347] py-4 rounded-4xl hover:text-[#414141] font-medium text-xl transition-colors">
            Scan QR Code
          </Link>
        </div>

        {/* Footer */}
        <p className="text-black text-sm mt-12">
          © 2026 Create Foundation
        </p>

      </div>
    </main>
  )
}