import { User, TimeSlot, SurveyOption } from '@/types/scan'

type Props = {
  user: User | null
  timeSlot: TimeSlot | null
  surveyOptions: SurveyOption[]
  selectedOption: number | null
  onSelectOption: (id: number) => void
  onClockIn: () => void
  onCancel: () => void
}

export default function PreSurveyScreen({
  user,
  timeSlot,
  surveyOptions,
  selectedOption,
  onSelectOption,
  onClockIn,
  onCancel
}: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
        <div className="text-center mb-6">
          {/* <div className="text-4xl mb-2">👋</div> */}
          <h2 className="text-2xl font-bold text-gray-800">
            Hi {user?.first_name}!
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {user?.spaces?.space_name} — {timeSlot?.label}
          </p>
        </div>

        {surveyOptions.length > 0 && (
          <div className="mb-6">
            <p className="font-medium text-gray-700 mb-3">
              What will you make today? (Optional)
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
            onClick={onClockIn}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            ✅ Clock In
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