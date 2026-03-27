'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Html5QrcodeScanner } from 'html5-qrcode'

type Space = {
  space_name: string
}

type User = {
  id: number
  custom_id: string
  first_name: string
  last_name: string
  grade_level: string
  space_id: number
  spaces: Space | null
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<User | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const lookupUser = async (qrCode: string) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        custom_id,
        first_name,
        last_name,
        grade_level,
        space_id,
        spaces (
          space_name
        )
      `)
      .eq('qr_code', qrCode)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setResult(data as unknown as User)
    }
  }

  const lookupByCustomId = async () => {
    if (!manualId.trim()) return
    setManualLoading(true)
    setNotFound(false)

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        custom_id,
        first_name,
        last_name,
        grade_level,
        space_id,
        spaces (
          space_name
        )
      `)
      .eq('custom_id', manualId.trim().toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setResult(data as unknown as User)
    }
    setManualLoading(false)
  }

  const startScanner = () => {
    setScanning(true)
    setResult(null)
    setNotFound(false)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setScanning(false)
  }

  const handleReset = () => {
    setResult(null)
    setNotFound(false)
    setManualId('')
    setScanning(false)
  }

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: 250 },
        false
      )

      scanner.render(
        async (decodedText) => {
          scanner.clear()
          setScanning(false)
          await lookupUser(decodedText)
        },
        (errorMessage) => {
          console.log(errorMessage)
        }
      )

      scannerRef.current = scanner
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [scanning])

  // Result screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-3xl font-bold text-green-600 mb-2">
            Welcome, {result.first_name}!
          </h2>
          <p className="text-gray-500 mb-6">
            Successfully verified in the system
          </p>
          <div className="rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-black text-sm">Full Name</span>
              <span className="font-medium text-black">
                {result.first_name} {result.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black text-sm">ID</span>
              <span className="font-medium text-black">{result.custom_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black text-sm">Grade</span>
              <span className="font-medium text-black">Grade {result.grade_level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black text-sm">Space</span>
              <span className="font-medium text-black">
                {result.spaces?.space_name}
              </span>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Scan Another
          </button>
        </div>
      </div>
    )
  }

  // Not found screen
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            User Not Found
          </h2>
          <p className="text-gray-500 mb-6">
            No registered user found with that QR code or ID.
          </p>
          <button
            onClick={handleReset}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Main scan page
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="rounded-xl shadow p-8 max-w-md w-full" style={{ backgroundColor: '#CEE4B8' }}>

        <h1 className="text-2xl font-bold text-black mb-2 text-center">
          Verify User
        </h1>
        <p className="text-black text-center mb-6">
          Scan QR code or enter ID manually
        </p>
        <p className="text-black text-center mb-6">
          Please click on Request Camera Permissions if the camera does not turn on automatically
        </p>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => { setActiveTab('qr'); stopScanner() }}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'qr'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Scan QR Code
          </button>
          <button
            onClick={() => { setActiveTab('manual'); stopScanner() }}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Enter ID
          </button>
        </div>

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <div className="text-center">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full text-black py-3 rounded-lg hover:bg-blue-700 font-medium text-lg" style={{ backgroundColor: '#EEEEC6' }}
              >
                 Start Scanning
              </button>
            ) : (
              <div>
                <div id="qr-reader" className="mb-4 text-black" />
                <button
                  onClick={stopScanner}
                  className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300"
                >
                  ✖ Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual ID Tab */}
        {activeTab === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter User ID
            </label>
            <input
              type="text"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupByCustomId()}
              placeholder="e.g. HOH-26-0001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4  text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={lookupByCustomId}
              disabled={manualLoading || !manualId.trim()}
              className="w-full text-black py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#EEEEC6' }}
            >
              {manualLoading ? 'Searching...' : 'Search User'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}



// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import { supabase } from '@/lib/supabase'
// import { Html5QrcodeScanner } from 'html5-qrcode'

// type Space = {
//   space_name: string
// }



// type User = {
//   id: number
//   custom_id: string
//   first_name: string
//   last_name: string
//   grade_level: string
//   space_id: number
//   spaces: Space | null
// }

// export default function ScanPage() {
//   const [scanning, setScanning] = useState(false)
//   const [result, setResult] = useState<User | null>(null)
//   const [notFound, setNotFound] = useState(false)
//   const [error, setError] = useState('')
//   const scannerRef = useRef<Html5QrcodeScanner | null>(null)

//   const startScanner = () => {
//     setScanning(true)
//     setResult(null)
//     setNotFound(false)
//     setError('')
//   }

//   const stopScanner = () => {
//     if (scannerRef.current) {
//       scannerRef.current.clear()
//       scannerRef.current = null
//     }
//     setScanning(false)
//   }

//   useEffect(() => {
//     if (scanning) {
//       const scanner = new Html5QrcodeScanner(
//         'qr-reader',
//         { fps: 10, qrbox: 250 },
//         false
//       )

//       scanner.render(
//         async (decodedText) => {
//           // Stop scanning after first successful scan
//           scanner.clear()
//           setScanning(false)

//           // Look up user in database
//           const { data, error } = await supabase
//             .from('users')
//             .select(`
//               id,
//               custom_id,
//               first_name,
//               last_name,
//               grade_level,
//               space_id,
//               spaces (
//                 space_name
//               )
//             `)
//             .eq('qr_code', decodedText)
//             .eq('is_active', true)
//             .single()

//         //   if (error || !data) {
//         //     setNotFound(true)
//         //   } else {
//         //     setResult(data as User)
//         //   }
//         if (error || !data) {
//             setNotFound(true)
//         } else {
//             setResult(data as unknown as User)
//         }
//         },
//         (errorMessage) => {
//           // Ignore scan errors — they fire constantly while scanning
//           console.log(errorMessage)
//         }
//       )

//       scannerRef.current = scanner
//     }

//     return () => {
//       if (scannerRef.current) {
//         scannerRef.current.clear()
//         scannerRef.current = null
//       }
//     }
//   }, [scanning])

//   // Default screen
//   if (!scanning && !result && !notFound) {
//     return (
//       <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-8">
//         <div className="bg-white rounded-xl shadow text-black p-8 max-w-md w-full text-center">
//           <h1 className="text-2xl font-bold text-black mb-2">
//             QR Code Scanner
//           </h1>
//           <p className="text-black mb-8">
//             Scan a child's QR card to verify registration
//           </p>
//           <button
//             onClick={startScanner}
//             className="w-full bg-blue-600 text-black py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
//           >
//             📷 Start Scanning
//           </button>
//         </div>
//       </div>
//     )
//   }

//   // Scanner screen
//   if (scanning) {
//     return (
//       <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-8">
//         <div className="bg-white rounded-xl  text-black shadow p-8 max-w-md w-full text-center">
//           <h1 className="text-2xl font-bold text-black mb-2">
//             Scanning...
//           </h1>
//           <p className="text-black mb-6">
//             Hold the QR card up to the camera
//           </p>
//           <div id="qr-reader" className="mb-6" />
//           <button
//             onClick={stopScanner}
//             className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300"
//           >
//             ✖ Cancel
//           </button>
//         </div>
//       </div>
//     )
//   }

//   // User found screen
//   if (result) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//         <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
//           <div className="text-6xl mb-4">👋</div>
//           <h2 className="text-3xl font-bold text-green-600 mb-2">
//             Welcome, {result.first_name}!
//           </h2>
//           <p className="text-gray-500 mb-6">
//             Successfully verified in the system
//           </p>

//           <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
//             <div className="flex justify-between">
//               <span className="text-black text-sm">Full Name</span>
//               <span className="font-medium text-black">
//                 {result.first_name} {result.last_name}
//               </span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-black text-sm">ID</span>
//               <span className="font-medium text-black">{result.custom_id}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-black text-sm">Grade</span>
//               <span className="font-medium text-black">Grade {result.grade_level}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-black text-sm">Space</span>
//               <span className="font-medium text-black">
//                 {result.spaces?.space_name}
//               </span>
//             </div>
//           </div>

//           <button
//             onClick={startScanner}
//             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
//           >
//             📷 Scan Another
//           </button>
//         </div>
//       </div>
//     )
//   }

//   // Not found screen
//   if (notFound) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//         <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
//           <div className="text-6xl mb-4">❌</div>
//           <h2 className="text-2xl font-bold text-red-600 mb-2">
//             User Not Found
//           </h2>
//           <p className="text-gray-500 mb-6">
//             This QR code is not registered in the system.
//           </p>
//           <button
//             onClick={startScanner}
//             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
//           >
//             📷 Try Again
//           </button>
//         </div>
//       </div>
//     )
//   }
// }