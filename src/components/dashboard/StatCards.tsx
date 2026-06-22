type StatCard = {
  label: string
  value: number
  color: string
  icon: string
}

type Props = {
  totalUsers: number
  activeNow: number
  completedToday: number
}

export default function StatCards({ totalUsers, activeNow, completedToday }: Props) {
  const cards: StatCard[] = [
    { label: 'Total Hubbers', value: totalUsers, color: 'bg-blue-50 text-blue-600', icon: '👥' },
    { label: 'Currently Clocked-In', value: activeNow, color: 'bg-purple-50 text-purple-600', icon: '🟢' },
    { label: 'Clocked-Out', value: completedToday, color: 'bg-orange-50 text-orange-600', icon: '🏁' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-3">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-xl shadow p-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${card.color} text-2xl mb-4`}>
            {card.icon}
          </div>
          <p className="text-3xl font-bold text-gray-800 mb-1">{card.value}</p>
          <p className="text-sm text-gray-500">{card.label}</p>
        </div>
      ))}
    </div>
  )
}