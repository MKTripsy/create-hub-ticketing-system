'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Space = {
  id: number
  space_name: string
}

type SurveyQuestion = {
  id: number
  space_id: number
  question_text: string
  answer_type: 'radio' | 'checkbox' | 'open_ended'
  survey_type: 'pre' | 'post'
  order_index: number
  is_active: boolean
}

type SurveyQuestionOption = {
  id: number
  question_id: number
  label: string
  order_index: number
}

export default function SurveyOptionSettings() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [activeSpace, setActiveSpace] = useState<number | null>(null)
  const [activeSurveyType, setActiveSurveyType] = useState<'pre' | 'post'>('pre')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<number, SurveyQuestionOption[]>>({})
  const [loading, setLoading] = useState(true)

  // Question modal
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null)
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    answer_type: 'radio' as 'radio' | 'checkbox' | 'open_ended',
  })
  const [savingQuestion, setSavingQuestion] = useState(false)

  // Option modal
  const [showOptionModal, setShowOptionModal] = useState(false)
  const [editingOption, setEditingOption] = useState<SurveyQuestionOption | null>(null)
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)
  const [optionForm, setOptionForm] = useState({ label: '' })
  const [savingOption, setSavingOption] = useState(false)

  // Fetch spaces
  useEffect(() => {
    const fetchSpaces = async () => {
      const { data } = await supabase
        .from('spaces')
        .select('id, space_name')
        .eq('is_active', true)
        .order('id')
      if (data) {
        setSpaces(data)
        if (data.length > 0) setActiveSpace(data[0].id)
      }
    }
    fetchSpaces()
  }, [])

  // Fetch questions when space or survey type changes
  useEffect(() => {
    if (!activeSpace) return
    fetchQuestions()
  }, [activeSpace, activeSurveyType])

  const fetchQuestions = async () => {
    if (!activeSpace) return
    setLoading(true)

    const { data: questionsData } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('space_id', activeSpace)
      .eq('survey_type', activeSurveyType)
      .order('order_index')

    if (!questionsData) { setLoading(false); return }
    setQuestions(questionsData)

    // Fetch options for all questions
    const optionsMap: Record<number, SurveyQuestionOption[]> = {}
    for (const question of questionsData) {
      const { data: optionsData } = await supabase
        .from('survey_question_options')
        .select('*')
        .eq('question_id', question.id)
        .order('order_index')
      optionsMap[question.id] = optionsData || []
    }
    setOptionsByQuestion(optionsMap)
    setLoading(false)
  }

  // Question handlers
  const openAddQuestion = () => {
    setEditingQuestion(null)
    setQuestionForm({ question_text: '', answer_type: 'radio' })
    setShowQuestionModal(true)
  }

  const openEditQuestion = (question: SurveyQuestion) => {
    setEditingQuestion(question)
    setQuestionForm({
      question_text: question.question_text,
      answer_type: question.answer_type,
    })
    setShowQuestionModal(true)
  }

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      alert('Please enter a question.')
      return
    }
    setSavingQuestion(true)

    if (editingQuestion) {
      await supabase
        .from('survey_questions')
        .update({
          question_text: questionForm.question_text,
          answer_type: questionForm.answer_type,
        })
        .eq('id', editingQuestion.id)
    } else {
      await supabase
        .from('survey_questions')
        .insert({
          space_id: activeSpace,
          question_text: questionForm.question_text,
          answer_type: questionForm.answer_type,
          survey_type: activeSurveyType,
          order_index: questions.length + 1,
          is_active: true,
        })
    }

    await fetchQuestions()
    setShowQuestionModal(false)
    setSavingQuestion(false)
  }

  const handleDeleteQuestion = async (question: SurveyQuestion) => {
    if (!confirm(`Delete question "${question.question_text}"? This will also delete all its options.`)) return

    // Delete options first
    await supabase
      .from('survey_question_options')
      .delete()
      .eq('question_id', question.id)

    // Delete question
    await supabase
      .from('survey_questions')
      .delete()
      .eq('id', question.id)

    await fetchQuestions()
  }

  const handleToggleQuestion = async (question: SurveyQuestion) => {
    await supabase
      .from('survey_questions')
      .update({ is_active: !question.is_active })
      .eq('id', question.id)
    await fetchQuestions()
  }

  // Option handlers
  const openAddOption = (questionId: number) => {
    setEditingOption(null)
    setActiveQuestionId(questionId)
    setOptionForm({ label: '' })
    setShowOptionModal(true)
  }

  const openEditOption = (option: SurveyQuestionOption) => {
    setEditingOption(option)
    setActiveQuestionId(option.question_id)
    setOptionForm({ label: option.label })
    setShowOptionModal(true)
  }

  const handleSaveOption = async () => {
    if (!optionForm.label.trim()) {
      alert('Please enter an option label.')
      return
    }
    setSavingOption(true)

    if (editingOption) {
      await supabase
        .from('survey_question_options')
        .update({ label: optionForm.label })
        .eq('id', editingOption.id)
    } else {
      const currentOptions = optionsByQuestion[activeQuestionId!] || []
      await supabase
        .from('survey_question_options')
        .insert({
          question_id: activeQuestionId,
          label: optionForm.label,
          order_index: currentOptions.length + 1,
        })
    }

    await fetchQuestions()
    setShowOptionModal(false)
    setSavingOption(false)
  }

  const handleDeleteOption = async (option: SurveyQuestionOption) => {
    if (!confirm(`Delete option "${option.label}"?`)) return
    await supabase
      .from('survey_question_options')
      .delete()
      .eq('id', option.id)
    await fetchQuestions()
  }

  const getAnswerTypeLabel = (type: string) => {
    switch (type) {
      case 'radio': return 'Single Choice'
      case 'checkbox': return 'Multiple Choice'
      case 'open_ended': return 'Open Ended'
      default: return type
    }
  }

  const getAnswerTypeBadge = (type: string) => {
    switch (type) {
      case 'radio': return 'bg-[#FF6347] text-black'
      case 'checkbox': return 'bg-purple-100 text-purple-700'
      case 'open_ended': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div>
      {/* Space Tabs */}
      <div className="flex border-b mb-4 overflow-x-auto">
        {spaces.map(space => (
          <button
            key={space.id}
            onClick={() => setActiveSpace(space.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeSpace === space.id
                ? 'border-[#FF6347] text-[#FF6347]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {space.space_name}
          </button>
        ))}
      </div>

      {/* Pre/Post Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSurveyType('pre')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSurveyType === 'pre'
              ? 'bg-[#FF6347] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pre Survey
        </button>
        <button
          onClick={() => setActiveSurveyType('post')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSurveyType === 'post'
              ? 'bg-[#FF6347] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Post Survey
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {spaces.find(s => s.id === activeSpace)?.space_name} — {activeSurveyType === 'pre' ? 'Pre' : 'Post'} Survey Questions
        </h2>
        <button
          onClick={openAddQuestion}
          className="bg-[#FF6347] text-white px-4 py-2 rounded-lg hover:bg-[#414141] text-sm font-medium transition-colors"
        >
           Add Question
        </button>
      </div>

      {/* Questions List */}
      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No questions yet</p>
      ) : (
        <div className="space-y-4">
          {questions.map((question, qIndex) => (
            <div key={question.id} className={`border rounded-xl p-4 ${!question.is_active ? 'opacity-50' : ''}`}>

              {/* Question Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">Q{qIndex + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAnswerTypeBadge(question.answer_type)}`}>
                      {getAnswerTypeLabel(question.answer_type)}
                    </span>
                    {!question.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{question.question_text}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleQuestion(question)}
                    className={`text-xs px-2 py-1 rounded ${
                      question.is_active
                        ? 'text-yellow-600 hover:text-yellow-800'
                        : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {question.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEditQuestion(question)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Options (for radio/checkbox) */}
              {question.answer_type !== 'open_ended' && (
                <div className="ml-4">
                  <div className="space-y-1 mb-2">
                    {(optionsByQuestion[question.id] || []).map(option => (
                      <div key={option.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-xs">
                            {question.answer_type === 'radio' ? '○' : '□'}
                          </span>
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditOption(option)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOption(option)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => openAddOption(question.id)}
                    className="text-[#FF6347] hover:text-[#414141] text-xs font-medium"
                  >
                     Add Option
                  </button>
                </div>
              )}

              {/* Open ended preview */}
              {question.answer_type === 'open_ended' && (
                <div className="ml-4">
                  <div className="bg-gray-50 rounded px-3 py-2 text-sm text-gray-400 italic">
                    Text input field
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  value={questionForm.question_text}
                  onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] text-sm"
                  placeholder="e.g. What will you create today?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer Type</label>
                <select
                  value={questionForm.answer_type}
                  onChange={e => setQuestionForm({ ...questionForm, answer_type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347] text-sm"
                >
                  <option value="radio">Single Choice (Radio)</option>
                  <option value="checkbox">Multiple Choice (Checkbox)</option>
                  <option value="open_ended">Open Ended (Text)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveQuestion}
                disabled={savingQuestion}
                className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50 transition-colors"
              >
                {savingQuestion ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-[#FAF2F0] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingOption ? 'Edit Option' : 'Add Option'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Option Label</label>
              <input
                type="text"
                value={optionForm.label}
                onChange={e => setOptionForm({ label: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#FF6347]"
                placeholder="e.g. Drawing"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveOption}
                disabled={savingOption}
                className="flex-1 bg-[#FF6347] text-white py-2 rounded-lg hover:bg-[#414141] font-medium disabled:opacity-50 transition-colors"
              >
                {savingOption ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowOptionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}