import { DashboardStats } from '../components/DashboardStats'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your Sampooran management system</p>
      </div>

      <DashboardStats />
    </div>
  )
}
