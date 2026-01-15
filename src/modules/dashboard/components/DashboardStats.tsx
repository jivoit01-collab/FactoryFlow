import { Truck, ClipboardCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui'

interface StatCard {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

const stats: StatCard[] = [
  {
    title: 'Total Gate In',
    value: '124',
    description: 'This month',
    icon: <Truck className="h-4 w-4 text-muted-foreground" />,
    trend: { value: 12, isPositive: true },
  },
  {
    title: 'Quality Checks',
    value: '98',
    description: 'Completed this month',
    icon: <ClipboardCheck className="h-4 w-4 text-muted-foreground" />,
    trend: { value: 8, isPositive: true },
  },
  {
    title: 'Pending Checks',
    value: '12',
    description: 'Awaiting inspection',
    icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
    trend: { value: 3, isPositive: false },
  },
  {
    title: 'Approval Rate',
    value: '94%',
    description: 'Quality passed',
    icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
    trend: { value: 2, isPositive: true },
  },
]

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
              {stat.trend && (
                <span
                  className={stat.trend.isPositive ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}
                >
                  {stat.trend.isPositive ? '+' : '-'}
                  {stat.trend.value}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
