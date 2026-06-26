'use client'

import { useState, useEffect } from 'react'
import { SurveyQuestionSummary, fetchWeeklySurveyData, getWeekBounds } from '@/lib/api/dashboard'

type Props = {
  spaceIds: number[]
}

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week'
  const { start, end } = getWeekBounds(weekOffset)
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })
  return `${fmt(start)} – ${fmt(end)}`
}

// ─── Multiple choice card ─────────────────────────────────────────────────

function MultipleChoiceCard({ summary }: { summary: SurveyQuestionSummary }) {
  const total = summary.option_counts.reduce((sum, o) => sum + o.count, 0)

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-gray-700 leading-snug">{summary.question_text}</p>
      {total === 0 ? (
        <p className="text-xs text-gray-300">No responses this week.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {summary.option_counts.map(opt => {
            const pct = Math.round((opt.count / total) * 100)
            return (
              <div key={opt.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span>{opt.label}</span>
                  <span>{opt.count} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#FF6347] h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          <p className="text-xs text-gray-400 mt-1">{total} response{total !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}

// ─── Open-ended card ──────────────────────────────────────────────────────

function OpenEndedCard({ summary }: { summary: SurveyQuestionSummary }) {
  const [expanded, setExpanded] = useState(false)
  const responses = summary.open_responses
  const preview = expanded ? responses : responses.slice(0, 3)

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-gray-700 leading-snug">{summary.question_text}</p>
      {responses.length === 0 ? (
        <p className="text-xs text-gray-300">No responses this week.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {preview.map((r, i) => (
              <li key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                "{r}"
              </li>
            ))}
          </ul>
          {responses.length > 3 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-[#FF6347] hover:underline self-start"
            >
              {expanded ? 'Show less' : `Show ${responses.length - 3} more`}
            </button>
          )}
          <p className="text-xs text-gray-400">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
        </>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────

function SurveySection({
  title, questions
}: {
  title: string
  questions: SurveyQuestionSummary[]
}) {
  if (questions.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map(q =>
          q.answer_type === 'open_ended'
            ? <OpenEndedCard key={q.question_id} summary={q} />
            : <MultipleChoiceCard key={q.question_id} summary={q} />
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function SurveyStatCards({ spaceIds }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<SurveyQuestionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (spaceIds.length === 0) return
    setLoading(true)
    fetchWeeklySurveyData(spaceIds, weekOffset)
      .then(setData)
      .finally(() => setLoading(false))
  }, [weekOffset, spaceIds])

  const preQuestions = data.filter(q => q.survey_type === 'pre')
  const postQuestions = data.filter(q => q.survey_type === 'post')

  return (
    <div className="bg-white rounded-xl shadow p-6">

      {/* Header with week nav */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Survey Responses</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 text-lg leading-none"
          >
            ‹
          </button>
          <span className="text-sm text-gray-600 w-36 text-center">{getWeekLabel(weekOffset)}</span>
          <button
            onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 text-lg leading-none"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-300 text-center py-8">Loading survey data...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-8">No survey responses for this week.</p>
      ) : (
        <>
          <SurveySection title="Pre-Session Survey" questions={preQuestions} />
          <SurveySection title="Post-Session Survey" questions={postQuestions} />
        </>
      )}
    </div>
  )
}