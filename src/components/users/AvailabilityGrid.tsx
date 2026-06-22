import { TimeSlot, SpaceTimeslotLimit } from '@/lib/api/spaces'

type Props = {
  operatingDays: string[]
  timeSlots: TimeSlot[]
  isSelected: (day: string, timeSlotId: number) => boolean
  isSlotFull: (timeSlotId: number, day: string) => boolean
  onToggle: (day: string, timeSlotId: number) => void
  disabled?: boolean
  accentColor?: string
}

export default function AvailabilityGrid({
  operatingDays,
  timeSlots,
  isSelected,
  isSlotFull,
  onToggle,
  disabled = false,
  accentColor = '#FF6347',
}: Props) {
  if (operatingDays.length === 0 || timeSlots.length === 0) {
    return <p className="text-gray-400 text-sm">Loading schedule...</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Time</th>
            {operatingDays.map(day => (
              <th key={day} className="text-center py-2 px-2 text-gray-500 font-medium text-xs">
                {day.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(slot => (
            <tr key={slot.id} className="border-t">
              <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">{slot.label}</td>
              {operatingDays.map(day => {
                const full = isSlotFull(slot.id, day)
                const selected = isSelected(day, slot.id)
                const isDisabled = disabled || (full && !selected)

                return (
                  <td key={day} className="text-center py-2 px-2">
                    {full && !selected && (
                      <span className="block text-red-400 text-xs">Full</span>
                    )}
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => !isDisabled && onToggle(day, slot.id)}
                      disabled={isDisabled}
                      style={{ accentColor }}
                      className={`w-4 h-4 disabled:cursor-not-allowed ${
                        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}