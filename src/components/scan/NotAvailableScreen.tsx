import { User } from '@/types/scan'

type Props = {
  user: User | null
  onReset: () => void
}

export default function NotAvailableScreen({ user, onReset }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        {/* <div className="text-6xl mb-4">⏰</div> */}
        <h2 className="text-2xl font-bold text-orange-600 mb-2">
          Not Your Time Yet!
        </h2>
        <p className="text-gray-500 mb-2">Hi {user?.first_name}! 👋</p>
        <p className="text-gray-500 mb-6">
          You are not scheduled to use the computer right now.
          Please ask a staff member for help.
        </p>
        <button
          onClick={onReset}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}