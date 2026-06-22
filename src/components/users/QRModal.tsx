'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { toPng } from 'html-to-image'
import { User } from '@/lib/api/users'

type Props = {
  user: User
  onClose: () => void
}

function formatGrade(grade_level: string) {
  return isNaN(parseInt(grade_level)) ? grade_level : `Grade ${grade_level}`
}

export default function QRModal({ user, onClose }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${user.custom_id}</title>
          <style>
            body { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: sans-serif; }
          </style>
        </head>
        <body>
          <h2>${user.first_name} ${user.last_name}</h2>
          <p style="color: gray; font-size: 14px;">${user.custom_id}</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user.qr_code)}" width="200" height="200" />
          <script>window.onload = () => window.print()</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadPng = async () => {
    if (!qrRef.current) return
    try {
      const dataUrl = await toPng(qrRef.current, { quality: 1.0 })
      const link = document.createElement('a')
      link.download = `${user.custom_id}-qr.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error downloading QR:', error)
      alert('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">

        {/* Printable / downloadable area */}
        <div ref={qrRef} className="text-center p-4 bg-white">
          <h2 className="text-xl font-bold text-black mb-1">
            {user.first_name} {user.last_name}
          </h2>
          <p className="text-black text-sm mb-4">{user.custom_id}</p>
          <div className="flex justify-center mb-4">
            <QRCode value={user.qr_code} size={200} />
          </div>
          <p className="text-black text-xs">
            {user.spaces?.space_name} — {formatGrade(user.grade_level)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownloadPng}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
          >
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}