import { User, SurveyQuestion } from '@/types/scan'

type Props = {
  user: User | null
  surveyQuestions: SurveyQuestion[]
  surveyAnswers: Record<number, string | string[]>
  onAnswerChange: (questionId: number, answer: string | string[]) => void
  onClockOut: () => void
  onCancel: () => void
}

export default function AlreadyClockedInScreen({
  user,
  surveyQuestions,
  surveyAnswers,
  onAnswerChange,
  onClockOut,
  onCancel
}: Props) {

  const handleRadioChange = (questionId: number, optionId: string) => {
    onAnswerChange(questionId, optionId)
  }

  const handleCheckboxChange = (questionId: number, optionId: string, checked: boolean) => {
    const current = (surveyAnswers[questionId] as string[]) || []
    if (checked) {
      onAnswerChange(questionId, [...current, optionId])
    } else {
      onAnswerChange(questionId, current.filter(id => id !== optionId))
    }
  }

  const handleTextChange = (questionId: number, text: string) => {
    onAnswerChange(questionId, text)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
        <div className="text-center mb-6">
          {user?.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.first_name}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-green-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">👤</div>
          )}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-gray-500 text-sm">
            You are currently clocked in. Would you like to clock out?
          </p>
        </div>

        {surveyQuestions.length > 0 && (
          <div className="mb-6 space-y-5">
            {surveyQuestions.map((question, index) => (
              <div key={question.id}>
                <p className="font-medium text-gray-700 mb-2 text-sm">
                  {index + 1}. {question.question_text}
                  <span className="text-gray-400 text-xs ml-1">(Optional)</span>
                </p>

                {/* Radio */}
                {question.answer_type === 'radio' && (
                  <div className="space-y-2">
                    {question.options.map(option => (
                      <button
                        key={option.id}
                        onClick={() => handleRadioChange(question.id, option.id.toString())}
                        className={`w-full text-left px-4 py-2 rounded-lg border transition-colors text-sm ${
                          surveyAnswers[question.id] === option.id.toString()
                            ? 'bg-[#FF6347] border-[#FF6347] text-white'
                            : 'border-gray-200 hover:bg-gray-50 text-black'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Checkbox */}
                {question.answer_type === 'checkbox' && (
                  <div className="space-y-2">
                    {question.options.map(option => {
                      const selected = ((surveyAnswers[question.id] as string[]) || [])
                        .includes(option.id.toString())
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleCheckboxChange(question.id, option.id.toString(), !selected)}
                          className={`w-full text-left px-4 py-2 rounded-lg border transition-colors text-sm ${
                            selected
                              ? 'bg-[#FF6347] border-[#FF6347] text-white'
                              : 'border-gray-200 hover:bg-gray-50 text-black'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Open ended */}
                {question.answer_type === 'open_ended' && (
                  <textarea
                    value={(surveyAnswers[question.id] as string) || ''}
                    onChange={e => handleTextChange(question.id, e.target.value)}
                    rows={3}
                    placeholder="Type your answer here..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6347] text-black"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClockOut}
            className="flex-1 bg-[#FF6347] text-[#FAF2F0] py-2 rounded-lg hover:bg-[#414141] font-medium transition-colors"
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