import { User, TimeSlot } from '@/types/scan'

type Props = {
  user: User | null
  timeSlot: TimeSlot | null
}

export default function ClockedInScreen({ user, timeSlot }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        {/* <div className="text-6xl mb-4">🎉</div> */}
        <h2 className="text-3xl font-bold text-green-600 mb-2">Clocked In!</h2>
        <p className="text-black mb-6">
          {user?.first_name} {user?.last_name}
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-black text-sm">Space</span>
            <span className="font-medium text-black">{user?.spaces?.space_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black text-sm">Time Slot</span>
            <span className="font-medium text-black">{timeSlot?.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black text-sm">Time</span>
            <span className="font-medium text-black">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        <p className="text-gray-400 text-sm">Returning to home in 5 seconds...</p>
      </div>
    </div>
  )
}