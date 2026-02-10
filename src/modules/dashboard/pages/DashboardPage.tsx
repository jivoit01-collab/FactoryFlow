import { APP_NAME } from '@/config/constants'
import { DashboardStats } from '../components/DashboardStats'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your {APP_NAME} management system</p>
      </div>

      <DashboardStats />
    </div>
  )
}
