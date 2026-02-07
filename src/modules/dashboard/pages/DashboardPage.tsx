import { DashboardStats } from '../components/DashboardStats'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your Sampooran management system</p>
      </div>

      <DashboardStats />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Gate In</h3>
          <p className="text-sm text-muted-foreground">
            Recent gate in entries will be displayed here.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Quality Checks</h3>
          <p className="text-sm text-muted-foreground">
            Recent quality check results will be displayed here.
          </p>
        </div>
      </div>
    </div>
  )
}
