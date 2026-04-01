import { User, SurveyOption } from '@/types/scan'

type Props = {
  user: User | null
  surveyOptions: SurveyOption[]
  selectedOption: number | null
  onSelectOption: (id: number) => void
  onClockOut: () => void
  onCancel: () => void
}

export default function AlreadyClockedInScreen({
  user,
  surveyOptions,
  selectedOption,
  onSelectOption,
  onClockOut,
  onCancel
}: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        {/* <div className="text-6xl mb-4">✅</div> */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome back, {user?.first_name}!
        </h2>
        <p className="text-gray-500 mb-6">
          You are currently clocked in. Would you like to clock out?
        </p>

        {surveyOptions.length > 0 && (
          <div className="text-left mb-6">
            <p className="font-medium text-gray-700 mb-3">
              What did you make today? (Optional)
            </p>
            <div className="space-y-2 text-black">
              {surveyOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => onSelectOption(option.id)}
                  className={`w-full text-left text-black px-4 py-2 rounded-lg border transition-colors ${
                    selectedOption === option.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClockOut}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 font-medium"
          >
            Clock Out
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}