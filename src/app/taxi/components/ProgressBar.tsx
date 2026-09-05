interface ProgressBarProps {
  current: number
  goal: number
  label: string
}

export function ProgressBar({ current, goal, label }: ProgressBarProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0

  return (
    <div className="p-4 bg-taxi-gray-50 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-taxi-gray-500">
          {percentage.toFixed(0)}%
        </p>
      </div>
      <div className="w-full h-3 bg-taxi-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-taxi-success transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <p className="text-taxi-gray-500">
          R$ {current.toFixed(2)}
        </p>
        <p className="text-taxi-gray-500">
          Meta: R$ {goal.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
