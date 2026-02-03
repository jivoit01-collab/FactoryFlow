# Dashboard Module

The Dashboard module provides the main overview page for the Factory Management System, displaying key metrics and quick access to important features.

## Module Structure

```
src/modules/dashboard/
├── pages/
│   └── DashboardPage.tsx      # Main dashboard page
├── components/
│   └── DashboardStats.tsx     # Statistics cards component
├── index.ts                   # Module exports
└── module.config.tsx          # Module configuration
```

## Pages

### DashboardPage

The main entry point and landing page after login.

**Route:** `/`

**Required Permission:** `gatein.view_dashboard`

**Features:**
- Overview statistics
- Recent gate-in entries summary
- Recent quality check results
- Quick navigation to other modules

**Implementation:**

```typescript
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your factory management system
        </p>
      </div>

      <DashboardStats />

      <div className="grid gap-4 md:grid-cols-2">
        <RecentGateInCard />
        <RecentQualityChecksCard />
      </div>
    </div>
  )
}
```

## Components

### DashboardStats

Displays key performance indicators and statistics cards.

**Features:**
- Total entries count
- Pending quality checks
- Today's entries
- Active vehicles inside

```typescript
function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Entries"
        value={stats.totalEntries}
        icon={<Truck />}
      />
      <StatCard
        title="Pending QC"
        value={stats.pendingQC}
        icon={<ClipboardCheck />}
      />
      {/* More stat cards */}
    </div>
  )
}
```

## Module Configuration

```typescript
// src/modules/dashboard/module.config.tsx
export const dashboardModuleConfig: ModuleConfig = {
  name: 'dashboard',
  routes: [
    {
      path: '/',
      element: <DashboardPage />,
      permissions: ['gatein.view_dashboard'],
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/',
      title: 'Dashboard',
      icon: LayoutDashboard,
      permissions: ['gatein.view_dashboard'],
      modulePrefix: 'gatein',
      showInSidebar: true,
    },
  ],
}
```

## Layout

The dashboard uses the main layout with:
- Sidebar navigation
- Header with user menu
- Main content area

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                            [User]   │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  Dashboard                                       │
│          │  ─────────────────────────────                   │
│ • Home   │                                                  │
│ • Gate   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│ • QC     │  │ Stat 1 │ │ Stat 2 │ │ Stat 3 │ │ Stat 4 │     │
│          │  └────────┘ └────────┘ └────────┘ └────────┘     │
│          │                                                  │
│          │  ┌─────────────────┐ ┌─────────────────┐         │
│          │  │ Recent Gate In  │ │ Recent QC       │         │
│          │  │                 │ │                 │         │
│          │  │ • Entry 1       │ │ • Check 1       │         │
│          │  │ • Entry 2       │ │ • Check 2       │         │
│          │  └─────────────────┘ └─────────────────┘         │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

## Future Enhancements

- [ ] Real-time statistics updates
- [ ] Customizable dashboard widgets
- [ ] Date range selector for statistics
- [ ] Export dashboard data
- [ ] Charts and graphs for trends

## Related Documentation

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md)
- [Quality Check Module](./qualityCheck.md)
- [Layout Components](../components/layout.md)
