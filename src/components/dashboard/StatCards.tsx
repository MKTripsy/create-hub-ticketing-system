import { Users, CircleDot, CircleCheck } from 'lucide-react'

type StatCard = {
  label: string
  value: number
  colorClass: string
  Icon: React.ElementType
}

type Props = {
  totalUsers: number
  activeNow: number
  completedToday: number
}

export default function StatCards({ totalUsers, activeNow, completedToday }: Props) {
  const cards: StatCard[] = [
    { label: 'Total Hubbers',        value: totalUsers,      colorClass: 'text-blue-500',   Icon: Users       },
    { label: 'Currently In', value: activeNow,       colorClass: 'text-green-500', Icon: CircleDot  },
    { label: 'Session Completed',          value: completedToday,  colorClass: 'text-orange-500', Icon: CircleCheck },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-3">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-xl shadow p-6">
          <div className={`inline-flex items-center gap-2 ${card.colorClass} mb-4`}>
            <card.Icon size={16} strokeWidth={2} />
            <span className="text-xl font-bold text-black">{card.label}</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{card.value}</p>
        </div>
      ))}
    </div>
  )
}