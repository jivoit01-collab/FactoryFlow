# Quality Check Module

The Quality Check module manages quality control inspections for incoming materials, tracking test results and pass/fail determinations.

## Module Structure

```
src/modules/qualityCheck/
├── pages/
│   ├── QualityCheckListPage.tsx    # List all quality checks
│   └── QualityCheckDetailPage.tsx  # Check details/entry form
├── components/
│   ├── QualityCheckTable.tsx       # Checks table component
│   └── QualityStatusBadge.tsx      # Status badge component
├── api/
│   ├── qualityCheck.api.ts         # API client functions
│   └── qualityCheck.queries.ts     # React Query hooks
├── schemas/
│   └── qualityCheck.schema.ts      # Zod validation schemas
├── types/
│   └── qualityCheck.types.ts       # TypeScript types
├── constants/
│   └── qualityCheck.constants.ts   # Module constants
├── index.ts                        # Module exports
└── module.config.tsx               # Module configuration
```

## Routes

| Route | Component | Permission | Description |
|-------|-----------|------------|-------------|
| `/quality-check` | QualityCheckListPage | `qualitycheck.view_qualitycheckentry` | List all checks |
| `/quality-check/new` | QualityCheckDetailPage | `qualitycheck.add_qualitycheckentry` | Create new check |
| `/quality-check/:id` | QualityCheckDetailPage | `qualitycheck.view_qualitycheckentry` | View/edit check |

## Types

### QualityCheckStatus

```typescript
const QualityCheckStatus = {
  PENDING: 'pending',    // Awaiting inspection
  PASSED: 'passed',      // All parameters passed
  FAILED: 'failed',      // One or more parameters failed
  PARTIAL: 'partial',    // Partially completed
} as const

type QualityCheckStatus = (typeof QualityCheckStatus)[keyof typeof QualityCheckStatus]
```

### QualityCheckResult

Individual test parameter result.

```typescript
interface QualityCheckResult {
  parameter: string       // Name of the test parameter
  expectedValue: string   // Expected/standard value
  actualValue: string     // Measured/observed value
  passed: boolean         // Whether the test passed
  remarks?: string        // Optional notes
}
```

### QualityCheckEntry

Complete quality check record.

```typescript
interface QualityCheckEntry extends BaseEntity {
  gateInId: string             // Related gate entry ID
  vehicleNumber: string        // Vehicle number for reference
  materialType: string         // Type of material being checked
  supplierName: string         // Supplier name
  inspectorId: string          // Inspector user ID
  inspectorName: string        // Inspector name
  status: QualityCheckStatus   // Overall status
  checkDate: string            // Date of inspection
  results: QualityCheckResult[] // Individual test results
  overallRemarks?: string      // General comments
  samplesTaken?: number        // Number of samples tested
}
```

### Request Types

```typescript
interface CreateQualityCheckRequest {
  gateInId: string
  results: QualityCheckResult[]
  overallRemarks?: string
  samplesTaken?: number
}

interface UpdateQualityCheckRequest extends Partial<CreateQualityCheckRequest> {
  status?: QualityCheckStatus
}
```

## Pages

### QualityCheckListPage

Displays all quality check entries with search and filtering.

**Route:** `/quality-check`

**Features:**
- Search by vehicle, supplier, or inspector
- Status filtering
- Sortable columns
- Click to view/edit details
- Create new check button

**Implementation:**

```typescript
export default function QualityCheckListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQualityCheckList({ search })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Quality Check</h2>
          <p>Manage quality inspections</p>
        </div>
        <Button onClick={() => navigate('/quality-check/new')}>
          <Plus /> New Check
        </Button>
      </div>

      <SearchBar value={search} onChange={setSearch} />
      <QualityCheckTable data={data} isLoading={isLoading} />
    </div>
  )
}
```

### QualityCheckDetailPage

Form for creating or editing quality check entries.

**Routes:**
- `/quality-check/new` - Create new check
- `/quality-check/:id` - View/edit existing check

**Features:**
- Select gate entry to check
- Enter test parameters and results
- Calculate pass/fail status
- Add remarks and sample count

## Components

### QualityCheckTable

Displays quality checks in a table format.

```typescript
interface QualityCheckTableProps {
  data: QualityCheckEntry[]
  isLoading: boolean
}
```

**Columns:**
- Vehicle Number
- Material Type
- Supplier
- Inspector
- Status (badge)
- Check Date
- Actions

### QualityStatusBadge

Displays the quality check status with appropriate styling.

```typescript
interface QualityStatusBadgeProps {
  status: QualityCheckStatus
}

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  partial: 'bg-blue-100 text-blue-800',
}
```

## API Integration

### API Functions

```typescript
// src/modules/qualityCheck/api/qualityCheck.api.ts
export const qualityCheckApi = {
  // Get paginated list
  getList: (params?: ListParams) => Promise<PaginatedResponse<QualityCheckEntry>>,

  // Get by ID
  getById: (id: string) => Promise<QualityCheckEntry>,

  // Create new check
  create: (data: CreateQualityCheckRequest) => Promise<QualityCheckEntry>,

  // Update existing check
  update: (id: string, data: UpdateQualityCheckRequest) => Promise<QualityCheckEntry>,

  // Delete check
  delete: (id: string) => Promise<void>,
}
```

### Query Hooks

```typescript
// src/modules/qualityCheck/api/qualityCheck.queries.ts

export const qualityCheckKeys = {
  all: ['qualityCheck'] as const,
  lists: () => [...qualityCheckKeys.all, 'list'] as const,
  list: (filters: ListParams) => [...qualityCheckKeys.lists(), filters] as const,
  details: () => [...qualityCheckKeys.all, 'detail'] as const,
  detail: (id: string) => [...qualityCheckKeys.details(), id] as const,
}

// Hooks
export function useQualityCheckList(params?: ListParams)
export function useQualityCheckDetail(id: string)
export function useCreateQualityCheck()
export function useUpdateQualityCheck()
export function useDeleteQualityCheck()
```

## Quality Check Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              Quality Check Workflow                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Gate Entry Created                                          │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                             │
│  │   PENDING   │ ◄─── QC Entry created, awaiting inspection │
│  └──────┬──────┘                                             │
│         │                                                    │
│    Inspector performs tests                                  │
│         │                                                    │
│    ┌────┴────┐                                               │
│    │         │                                               │
│    ▼         ▼                                               │
│ ┌──────┐  ┌────────┐                                         │
│ │PARTIAL│ │Complete│                                         │
│ └──┬───┘  └───┬────┘                                         │
│    │          │                                              │
│    │     ┌────┴────┐                                         │
│    │     │         │                                         │
│    ▼     ▼         ▼                                         │
│ ┌─────────┐    ┌────────┐                                    │
│ │ PARTIAL │    │ PASSED │    All parameters passed           │
│ └─────────┘    └────────┘                                    │
│                                                              │
│                ┌────────┐                                    │
│                │ FAILED │    One or more parameters failed   │
│                └────────┘                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Status Determination Logic

```typescript
function determineStatus(results: QualityCheckResult[]): QualityCheckStatus {
  if (results.length === 0) {
    return QualityCheckStatus.PENDING
  }

  const allPassed = results.every(r => r.passed)
  const allCompleted = results.every(r => r.actualValue !== '')

  if (!allCompleted) {
    return QualityCheckStatus.PARTIAL
  }

  return allPassed ? QualityCheckStatus.PASSED : QualityCheckStatus.FAILED
}
```

## Module Configuration

```typescript
// src/modules/qualityCheck/module.config.tsx
export const qualityCheckModuleConfig: ModuleConfig = {
  name: 'qualityCheck',
  routes: [
    {
      path: '/quality-check',
      element: <QualityCheckListPage />,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      layout: 'main',
    },
    {
      path: '/quality-check/new',
      element: <QualityCheckDetailPage />,
      permissions: ['qualitycheck.add_qualitycheckentry'],
      layout: 'main',
    },
    {
      path: '/quality-check/:id',
      element: <QualityCheckDetailPage />,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/quality-check',
      title: 'Quality Check',
      icon: ClipboardCheck,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      modulePrefix: 'qualitycheck',
      showInSidebar: true,
    },
  ],
}
```

## Integration with Gate Module

Quality checks are linked to gate entries through the `gateInId` field. When a material arrives:

1. Gate entry is created in the Gate module
2. Quality check entry is created with reference to gate entry
3. Inspector performs tests and records results
4. Gate entry status may be updated based on QC result

```typescript
// Example: Creating QC for gate entry
const createQC = useCreateQualityCheck()

await createQC.mutateAsync({
  gateInId: gateEntry.id,
  results: [
    {
      parameter: 'Appearance',
      expectedValue: 'Clear',
      actualValue: 'Clear',
      passed: true,
    },
    {
      parameter: 'Purity',
      expectedValue: '>99%',
      actualValue: '99.5%',
      passed: true,
    },
  ],
  samplesTaken: 3,
  overallRemarks: 'All parameters within specification',
})
```

## Related Documentation

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md)
- [Gate Entry Module](./gateIn.md)
- [API Overview](../api/overview.md)
