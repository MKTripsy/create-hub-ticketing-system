type Props = {
  onReset: () => void
}

export default function NotFoundScreen({ onReset }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-red-600 mb-2">User Not Found</h2>
        <p className="text-gray-500 mb-6">
          No registered user found with that QR code or ID.
        </p>
        <button
          onClick={onReset}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}