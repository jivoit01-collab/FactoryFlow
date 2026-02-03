# Gate Entry Module

The Gate Entry module (`gateIn`) provides generic gate entry operations for tracking vehicle entries and exits at factory gates.

## Module Structure

```
src/modules/gateIn/
├── pages/
│   ├── GateInListPage.tsx       # Entry list with search
│   └── GateInDetailPage.tsx     # Entry details view
├── components/
│   ├── GateInForm.tsx           # Entry form component
│   ├── GateInTable.tsx          # Entries table
│   └── GateInStatusBadge.tsx    # Status badge component
├── api/
│   ├── gateIn.api.ts            # API client functions
│   └── gateIn.queries.ts        # React Query hooks
├── schemas/
│   └── gateIn.schema.ts         # Zod validation schemas
├── types/
│   └── gateIn.types.ts          # TypeScript types
├── constants/
│   └── gateIn.constants.ts      # Module constants
├── index.ts                     # Module exports
└── module.config.tsx            # Module configuration
```

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/gate-in` | GateInListPage | List all gate entries |
| `/gate-in/:id` | GateInDetailPage | View entry details |

## Types

### GateInEntry

```typescript
interface GateInEntry extends BaseEntity {
  vehicleNumber: string
  driverName: string
  driverPhone: string
  materialType: string
  quantity: number
  unit: string
  supplierName: string
  poNumber?: string
  remarks?: string
  status: GateInStatus
  entryTime: string
  exitTime?: string
}
```

### GateInStatus

```typescript
const GateInStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
} as const

type GateInStatus = (typeof GateInStatus)[keyof typeof GateInStatus]
```

### Request Types

```typescript
interface CreateGateInRequest {
  vehicleNumber: string
  driverName: string
  driverPhone: string
  materialType: string
  quantity: number
  unit: string
  supplierName: string
  poNumber?: string
  remarks?: string
}

interface UpdateGateInRequest extends Partial<CreateGateInRequest> {
  status?: GateInStatus
}
```

## Pages

### GateInListPage

Displays a list of all gate entries with search and filtering capabilities.

**Route:** `/gate-in`

**Features:**
- Search by vehicle number, driver name, or supplier
- Status filtering
- Sortable columns
- Click to view details

**Implementation:**

```typescript
export default function GateInListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useGateInList({ search })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate In</h2>
          <p className="text-muted-foreground">Manage incoming vehicle entries</p>
        </div>
        <Button onClick={() => navigate('/gate-in/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <SearchBar value={search} onChange={setSearch} />
      <GateInTable data={data} isLoading={isLoading} />
    </div>
  )
}
```

### GateInDetailPage

Displays detailed information about a specific gate entry.

**Route:** `/gate-in/:id`

**Features:**
- Full entry details
- Status update actions
- Edit capability
- Entry history

## Components

### GateInTable

Displays gate entries in a table format.

```typescript
interface GateInTableProps {
  data: GateInEntry[]
  isLoading: boolean
}

function GateInTable({ data, isLoading }: GateInTableProps) {
  // Table implementation with columns:
  // - Vehicle Number
  // - Driver
  // - Material Type
  // - Quantity
  // - Supplier
  // - Status
  // - Entry Time
}
```

### GateInStatusBadge

Displays the status with appropriate styling.

```typescript
interface GateInStatusBadgeProps {
  status: GateInStatus
}

function GateInStatusBadge({ status }: GateInStatusBadgeProps) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs', variants[status])}>
      {status}
    </span>
  )
}
```

### GateInForm

Form component for creating and editing gate entries.

```typescript
interface GateInFormProps {
  initialData?: GateInEntry
  onSubmit: (data: CreateGateInRequest) => void
  isSubmitting?: boolean
}
```

## API Integration

### API Functions

```typescript
// src/modules/gateIn/api/gateIn.api.ts
export const gateInApi = {
  // Get paginated list of entries
  getList: (params?: ListParams) => Promise<PaginatedResponse<GateInEntry>>,

  // Get entry by ID
  getById: (id: string) => Promise<GateInEntry>,

  // Create new entry
  create: (data: CreateGateInRequest) => Promise<GateInEntry>,

  // Update existing entry
  update: (id: string, data: UpdateGateInRequest) => Promise<GateInEntry>,

  // Delete entry
  delete: (id: string) => Promise<void>,
}
```

### Query Hooks

```typescript
// src/modules/gateIn/api/gateIn.queries.ts

// Query keys
export const gateInKeys = {
  all: ['gateIn'] as const,
  lists: () => [...gateInKeys.all, 'list'] as const,
  list: (filters: ListParams) => [...gateInKeys.lists(), filters] as const,
  details: () => [...gateInKeys.all, 'detail'] as const,
  detail: (id: string) => [...gateInKeys.details(), id] as const,
}

// Hooks
export function useGateInList(params?: ListParams)
export function useGateInDetail(id: string)
export function useCreateGateIn()
export function useUpdateGateIn()
export function useDeleteGateIn()
```

## Validation Schemas

```typescript
// src/modules/gateIn/schemas/gateIn.schema.ts
import { z } from 'zod'

export const createGateInSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverName: z.string().min(1, 'Driver name is required'),
  driverPhone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  materialType: z.string().min(1, 'Material type is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  poNumber: z.string().optional(),
  remarks: z.string().optional(),
})

export type CreateGateInFormData = z.infer<typeof createGateInSchema>
```

## Status Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Gate In Status Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  New Entry Created                                           │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                             │
│  │   PENDING   │ ◄─── Initial status                        │
│  └──────┬──────┘                                             │
│         │                                                    │
│    ┌────┴────┐                                               │
│    │         │                                               │
│    ▼         ▼                                               │
│ ┌──────┐  ┌──────────┐                                       │
│ │REJECT│  │IN_PROGRESS│                                      │
│ └──────┘  └─────┬────┘                                       │
│                 │                                            │
│                 ▼                                            │
│           ┌──────────┐                                       │
│           │ APPROVED │                                       │
│           └──────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Module Configuration

```typescript
// src/modules/gateIn/module.config.tsx
export const gateInModuleConfig: ModuleConfig = {
  name: 'gateIn',
  routes: [
    {
      path: '/gate-in',
      element: <GateInListPage />,
      layout: 'main',
    },
    {
      path: '/gate-in/:id',
      element: <GateInDetailPage />,
      layout: 'main',
    },
  ],
  // Navigation handled through Gate module
  navigation: [],
}
```

## Integration with Gate Module

The Gate Entry module is designed to work alongside the Gate module. While the Gate module handles specific entry types (raw materials, daily needs, etc.), the Gate Entry module provides a generic entry management interface.

## Related Documentation

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md)
- [API Overview](../api/overview.md)
