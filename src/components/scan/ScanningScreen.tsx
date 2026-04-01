type Props = {
  onCancel: () => void
}

export default function ScanningScreen({ onCancel }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-black text-center">
        <h1 className="text-2xl font-bold text-black mb-2">Scanning...</h1>
        <p className="text-black mb-6">Hold the QR card up to the camera</p>
        <p className="text-black mb-6">Click on "Request Device Permission" if camera doesn't activate</p>
        <div id="qr-reader" className="mb-6" />
        <button
          onClick={onCancel}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}