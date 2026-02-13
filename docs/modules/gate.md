# Gate Module

The Gate module is the primary business feature of the Factory Management System, handling all gate entry operations for raw materials, daily needs, maintenance, and other entry types.

## Module Structure

```
src/modules/gate/
├── pages/
│   ├── GateDashboardPage.tsx         # Main gate dashboard
│   ├── RawMaterialsPage.tsx          # Raw materials entry list
│   ├── DailyNeedsPage.tsx            # Daily needs entries
│   ├── ConstructionPage.tsx          # Construction entries
│   ├── ContractorLaborPage.tsx       # Contractor/Labor redirect
│   ├── rawMaterialPages/             # Multi-step entry workflow
│   │   ├── Step1Page.tsx             # Driver, Transporter, Vehicle
│   │   ├── Step2Page.tsx             # Purchase Order
│   │   ├── Step3Page.tsx             # PO Receipt
│   │   ├── Step4Page.tsx             # Weighment
│   │   ├── Step5Page.tsx             # Quality Control
│   │   └── ReviewPage.tsx            # Final Review
│   ├── dailyNeedsPages/              # Daily needs workflow
│   ├── constructionPages/            # Construction workflow
│   ├── maintenancePages/             # Maintenance workflow
│   └── personGateInPages/            # Visitor/Labour management
│       ├── PersonGateInDashboard.tsx # Dashboard with stats
│       ├── PersonGateInAllPage.tsx   # All entries list
│       ├── NewEntryPage.tsx          # Create new entry
│       ├── InsidePage.tsx            # Currently inside list
│       ├── VisitorsPage.tsx          # Visitor management
│       └── LaboursPage.tsx           # Labour management
├── api/
│   ├── driver.api.ts                 # Driver API functions
│   ├── driver.queries.ts             # Driver React Query hooks
│   ├── transporter.api.ts
│   ├── transporter.queries.ts
│   ├── vehicle.api.ts
│   ├── vehicle.queries.ts
│   ├── vehicleEntry.api.ts
│   ├── vehicleEntry.queries.ts
│   ├── personGateIn/                 # Person gate-in API
│   │   ├── personGateIn.api.ts       # API functions & types
│   │   └── personGateIn.queries.ts   # React Query hooks
│   └── [other API files]
├── components/
│   ├── DriverSelect.tsx
│   ├── TransporterSelect.tsx
│   ├── VehicleSelect.tsx
│   ├── CreateVehicleDialog.tsx
│   ├── StepHeader.tsx
│   ├── StepFooter.tsx
│   ├── DateRangePicker.tsx           # Date range selection
│   ├── personGateIn/                 # Person gate-in components
│   │   ├── VisitorSelect.tsx         # Visitor search/select
│   │   ├── LabourSelect.tsx          # Labour search/select
│   │   ├── GateSelect.tsx            # Gate selection
│   │   ├── CreateVisitorDialog.tsx   # Create new visitor
│   │   ├── CreateLabourDialog.tsx    # Create new labour
│   │   └── index.ts
│   └── index.ts
├── hooks/
│   └── [Custom hooks]
├── schemas/
│   └── [Zod schemas]
├── constants/
│   └── [Gate constants]
└── utils/
    └── [Utility functions]
```

## Entry Types

The gate module supports multiple entry types:

| Type | Description | Route Prefix |
|------|-------------|--------------|
| Raw Materials | Raw material deliveries | `/gate/raw-materials` |
| Daily Needs | Food and consumables | `/gate/daily-needs` |
| Maintenance | Spare parts and tools | `/gate/maintenance` |
| Construction | Civil and building materials | `/gate/construction` |
| **Visitor/Labour** | Person gate-in tracking | `/gate/visitor-labour` |
| Returnable | Tools and equipment (returnable) | `/gate/returnable` |

## Raw Materials Workflow

The raw materials entry follows a 5-step workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│              Raw Materials Entry Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Vehicle Information                                     │
│  ├── Select Driver                                               │
│  ├── Select Transporter                                          │
│  └── Select Vehicle (or create new)                              │
│              │                                                   │
│              ▼                                                   │
│  Step 2: Purchase Order                                          │
│  ├── Enter/Search PO Number                                      │
│  ├── PO Details display                                          │
│  └── Validate PO status                                          │
│              │                                                   │
│              ▼                                                   │
│  Step 3: PO Receipt                                              │
│  ├── Received quantity                                           │
│  ├── Unit of measure                                             │
│  └── Receipt remarks                                             │
│              │                                                   │
│              ▼                                                   │
│  Step 4: Weighment                                               │
│  ├── Gross weight                                                │
│  ├── Tare weight                                                 │
│  ├── Net weight (calculated)                                     │
│  └── Weighbridge details                                         │
│              │                                                   │
│              ▼                                                   │
│  Step 5: Quality Control                                         │
│  ├── Quality parameters                                          │
│  ├── Test results                                                │
│  └── Pass/Fail determination                                     │
│              │                                                   │
│              ▼                                                   │
│  Review: Final Submission                                        │
│  ├── Review all entered data                                     │
│  ├── Validate completeness                                       │
│  └── Submit entry                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Pages

### RawMaterialsDashboard

Statistics and overview dashboard for raw material entries.

**Route:** `/gate/raw-materials`

**Features:**
- Entry counts by status
- Recent entries list
- Quick action buttons

### RawMaterialsPage

List view with filtering capabilities.

**Route:** `/gate/raw-materials/all`

**Features:**
- Paginated entry list
- Status filtering
- Date range filtering
- Search functionality
- Quick actions (edit, view, delete)

```typescript
function RawMaterialsPage() {
  const { dateRange } = useGlobalDateRange();
  const [filters, setFilters] = useState({ status: 'all', search: '' });

  const { data, isLoading } = useVehicleEntries({
    ...filters,
    fromDate: dateRange.from,
    toDate: dateRange.to,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Raw Materials Entries"
        action={<NewEntryButton />}
      />
      <FilterBar filters={filters} onChange={setFilters} />
      <DataTable
        data={data?.data}
        loading={isLoading}
        pagination={data?.pagination}
      />
    </div>
  );
}
```

### Step Pages

Each step page follows a consistent pattern:

```typescript
// Example: Step1Page.tsx
function Step1Page() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
  });

  // Load existing data if editing
  const { data: entry } = useVehicleEntry(entryId);

  useEffect(() => {
    if (entry) {
      form.reset({
        driverId: entry.driverId,
        transporterId: entry.transporterId,
        vehicleId: entry.vehicleId,
      });
    }
  }, [entry]);

  const createEntry = useCreateVehicleEntry();
  const updateEntry = useUpdateVehicleEntry();

  const onSubmit = async (data: Step1FormData) => {
    try {
      if (entryId) {
        await updateEntry.mutateAsync({ id: entryId, data });
      } else {
        const newEntry = await createEntry.mutateAsync(data);
        navigate(`/gate/raw-materials/new/step2?entryId=${newEntry.id}`);
        return;
      }
      navigate('/gate/raw-materials/new/step2');
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div>
      <StepHeader currentStep={1} totalSteps={5} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DriverSelect
          value={form.watch('driverId')}
          onChange={(value) => form.setValue('driverId', value)}
          error={form.formState.errors.driverId?.message}
        />

        <TransporterSelect
          value={form.watch('transporterId')}
          onChange={(value) => form.setValue('transporterId', value)}
          error={form.formState.errors.transporterId?.message}
        />

        <VehicleSelect
          transporterId={form.watch('transporterId')}
          value={form.watch('vehicleId')}
          onChange={(value) => form.setValue('vehicleId', value)}
          error={form.formState.errors.vehicleId?.message}
        />

        <StepFooter
          onBack={() => navigate(-1)}
          isSubmitting={createEntry.isPending || updateEntry.isPending}
        />
      </form>
    </div>
  );
}
```

## Components

### DriverSelect

Searchable dropdown for driver selection with create capability.

```typescript
interface DriverSelectProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function DriverSelect({ value, onChange, error, disabled }: DriverSelectProps) {
  const { data: drivers, isLoading } = useDriverNames();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>Driver</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select driver" />
        </SelectTrigger>
        <SelectContent>
          {isLoading && <SelectItem disabled>Loading...</SelectItem>}
          {drivers?.map((driver) => (
            <SelectItem key={driver.id} value={driver.id}>
              {driver.name}
            </SelectItem>
          ))}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setIsCreateOpen(true)}
          >
            + Add New Driver
          </Button>
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <CreateDriverDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(driver) => onChange(driver.id)}
      />
    </div>
  );
}
```

### TransporterSelect

Similar to DriverSelect, for transporter selection.

### VehicleSelect

Vehicle selection with transporter filtering and create capability.

```typescript
interface VehicleSelectProps {
  transporterId?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

function VehicleSelect({ transporterId, value, onChange, error }: VehicleSelectProps) {
  const { data: vehicles, isLoading } = useVehicleNames({ transporterId });

  // Filter vehicles by transporter
  const filteredVehicles = useMemo(() => {
    if (!transporterId) return vehicles;
    return vehicles?.filter(v => v.transporterId === transporterId);
  }, [vehicles, transporterId]);

  return (
    <Select value={value} onValueChange={onChange}>
      {/* Similar structure to DriverSelect */}
    </Select>
  );
}
```

### StepHeader

Navigation header showing current step progress.

```typescript
interface StepHeaderProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
}

function StepHeader({ currentStep, totalSteps, title }: StepHeaderProps) {
  const steps = [
    'Vehicle Info',
    'Purchase Order',
    'Receipt',
    'Weighment',
    'Quality Check',
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        {steps.map((step, index) => (
          <div
            key={step}
            className={cn(
              'flex items-center',
              index < currentStep ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              index < currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              {index < currentStep - 1 ? '✓' : index + 1}
            </div>
            <span className="ml-2 hidden md:inline">{step}</span>
          </div>
        ))}
      </div>
      <Progress value={(currentStep / totalSteps) * 100} />
    </div>
  );
}
```

### StepFooter

Navigation footer with back/next buttons.

```typescript
interface StepFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  isSubmitting?: boolean;
  isLastStep?: boolean;
  showSaveDraft?: boolean;
}

function StepFooter({
  onBack,
  onNext,
  isSubmitting,
  isLastStep,
  showSaveDraft
}: StepFooterProps) {
  return (
    <div className="flex justify-between mt-8 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isSubmitting}
      >
        Back
      </Button>

      <div className="space-x-2">
        {showSaveDraft && (
          <Button type="button" variant="outline">
            Save Draft
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isLastStep ? 'Submit' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
```

## API Integration

### Query Hooks Pattern

```typescript
// src/modules/gate/api/vehicleEntry.queries.ts

export const vehicleEntryKeys = {
  all: ['vehicleEntries'] as const,
  lists: () => [...vehicleEntryKeys.all, 'list'] as const,
  list: (filters: VehicleEntryFilters) => [...vehicleEntryKeys.lists(), filters] as const,
  details: () => [...vehicleEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleEntryKeys.details(), id] as const,
};

export function useVehicleEntries(filters: VehicleEntryFilters) {
  return useQuery({
    queryKey: vehicleEntryKeys.list(filters),
    queryFn: () => vehicleEntryApi.getAll(filters),
  });
}

export function useVehicleEntry(id: string | undefined) {
  return useQuery({
    queryKey: vehicleEntryKeys.detail(id!),
    queryFn: () => vehicleEntryApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateVehicleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vehicleEntryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleEntryKeys.all });
    },
  });
}

export function useUpdateVehicleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleEntryDto }) =>
      vehicleEntryApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: vehicleEntryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vehicleEntryKeys.lists() });
    },
  });
}
```

## Entry Status Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Entry Status Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DRAFT ──────► IN_PROGRESS ──────► QC_COMPLETED             │
│    │               │                     │                   │
│    │               │                     ▼                   │
│    │               │              ┌─────────────┐           │
│    │               │              │  COMPLETED  │           │
│    │               │              └─────────────┘           │
│    │               │                     │                   │
│    ▼               ▼                     │                   │
│  CANCELLED     REJECTED◄─────────────────┘                  │
│                                                              │
│  Status Descriptions:                                        │
│  • DRAFT: Entry started, not submitted                       │
│  • IN_PROGRESS: Entry submitted, awaiting QC                 │
│  • QC_COMPLETED: Quality check completed                     │
│  • COMPLETED: Fully processed                                │
│  • CANCELLED: Cancelled by user                              │
│  • REJECTED: Rejected during QC                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Validation Schemas

```typescript
// src/modules/gate/schemas/vehicleEntry.schema.ts

export const step1Schema = z.object({
  driverId: z.string().min(1, 'Driver is required'),
  transporterId: z.string().min(1, 'Transporter is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
});

export const step2Schema = z.object({
  poNumber: z.string().min(1, 'PO Number is required'),
  poId: z.string().optional(),
});

export const step3Schema = z.object({
  receivedQuantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  remarks: z.string().optional(),
});

export const step4Schema = z.object({
  grossWeight: z.number().positive('Gross weight is required'),
  tareWeight: z.number().positive('Tare weight is required'),
  netWeight: z.number().optional(),
  weighbridgeNumber: z.string().optional(),
});

export const step5Schema = z.object({
  parameters: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.string(),
    result: z.enum(['pass', 'fail']),
  })),
  overallResult: z.enum(['pass', 'fail']),
  remarks: z.string().optional(),
});
```

## Person Gate In (Visitor/Labour)

The Person Gate In feature manages visitor and labour entry/exit tracking at factory gates.

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              Person Gate In Module                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard (/gate/visitor-labour)                                │
│  ├── Current Status (Total Inside, Visitors, Labours)           │
│  ├── Today's Activity (Entries, Exits by type)                  │
│  ├── Recent Entries                                              │
│  ├── Gate-wise Inside Count                                      │
│  └── Person Type Breakdown                                       │
│                                                                  │
│  Entry Management                                                │
│  ├── New Entry (/gate/visitor-labour/new)                       │
│  ├── All Entries (/gate/visitor-labour/all)                     │
│  └── Currently Inside (/gate/visitor-labour/inside)             │
│                                                                  │
│  Master Data                                                     │
│  ├── Visitors (/gate/visitor-labour/visitors)                   │
│  └── Labours (/gate/visitor-labour/labours)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Person Types

| ID | Type | Description |
|----|------|-------------|
| 1 | Labour | Contract workers under contractors |
| 3 | Visitor | External visitors to the factory |

### Pages

#### PersonGateInDashboard

Main dashboard showing current status and activity.

**Route:** `/gate/visitor-labour`

**Features:**
- Total persons currently inside (clickable to view list)
- Breakdown by visitors and labours
- Long duration alerts
- Today's activity statistics (clickable for filtered views)
- Recent entries list
- Gate-wise inside count (clickable for filtered views)
- Person type breakdown (clickable for filtered views)
- Quick action buttons

#### NewEntryPage

Create a new gate entry for visitor or labour.

**Route:** `/gate/visitor-labour/new`

**Query Parameters:**
- `type=visitor` - Pre-select visitor type
- `type=labour` - Pre-select labour type

**Features:**
- Toggle between visitor and labour entry
- Search and select existing visitor/labour
- Create new visitor/labour inline
- Gate selection
- Purpose, vehicle number, and remarks fields

#### PersonGateInAllPage

View all entries with filtering capabilities.

**Route:** `/gate/visitor-labour/all`

**Query Parameters:**
- `person_type` - Filter by person type ID (1=Labour, 3=Visitor)
- `status` - Filter by status (IN, OUT, CANCELLED)
- `gate_in` - Filter by entry gate ID

**Features:**
- Date range filtering (global date range)
- Status filtering via URL params
- Person type filtering
- Gate filtering
- Search by name, purpose, gate, vehicle
- Click on row to view entry details

### Components

#### VisitorSelect

Searchable dropdown for selecting existing visitors.

```typescript
interface VisitorSelectProps {
  value?: number | null
  onChange: (visitor: Visitor | null) => void
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
}
```

#### LabourSelect

Searchable dropdown for selecting existing labours.

```typescript
interface LabourSelectProps {
  value?: number | null
  onChange: (labour: Labour | null) => void
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
}
```

#### GateSelect

Dropdown for selecting entry/exit gates.

```typescript
interface GateSelectProps {
  value?: number | null
  onChange: (gate: Gate | null) => void
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
}
```

#### CreateVisitorDialog

Dialog for creating a new visitor inline.

#### CreateLabourDialog

Dialog for creating a new labour inline with contractor selection.

### API Integration

#### Constants

```typescript
// Person Type IDs
export const PERSON_TYPE_IDS = {
  LABOUR: 1,
  VISITOR: 3,
} as const
```

#### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/person-gatein/dashboard/` | GET | Dashboard statistics |
| `/person-gatein/entry/create/` | POST | Create new entry |
| `/person-gatein/entry/{id}/` | GET | Get entry details |
| `/person-gatein/entry/{id}/exit/` | POST | Mark entry as exited |
| `/person-gatein/entry/{id}/cancel/` | POST | Cancel an entry |
| `/person-gatein/entry/inside/` | GET | List persons inside |
| `/person-gatein/entries/` | GET | List all entries with filters |
| `/person-gatein/visitors/` | GET/POST | Visitor CRUD |
| `/person-gatein/labours/` | GET/POST | Labour CRUD |
| `/person-gatein/gates/` | GET | List gates |
| `/person-gatein/contractors/` | GET | List contractors |

#### Entry Filters

```typescript
interface EntryFilters {
  from_date?: string      // Start date (YYYY-MM-DD)
  to_date?: string        // End date (YYYY-MM-DD)
  status?: string         // IN, OUT, CANCELLED
  person_type?: number    // 1=Labour, 3=Visitor
  gate_in?: number        // Filter by entry gate ID
  search?: string         // Search query
}
```

#### Query Hooks

```typescript
// Dashboard data
const { data: dashboard } = usePersonGateInDashboard()

// Create entry
const createEntry = useCreatePersonEntry()
await createEntry.mutateAsync({
  person_type: PERSON_TYPE_IDS.VISITOR,
  visitor: visitorId,
  gate_in: gateId,
  purpose: 'Meeting',
})

// Get entries with filters
const { data: entries } = usePersonEntries({
  from_date: '2026-01-01',
  to_date: '2026-01-31',
  person_type: PERSON_TYPE_IDS.VISITOR,
  status: 'IN',
})
```

### Entry Status Flow

```
┌─────────────────────────────────────────────────────────────┐
│               Entry Status Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Create Entry                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                 │
│  │   IN    │ ◄─── Entry created, person is inside           │
│  └────┬────┘                                                 │
│       │                                                      │
│       ├──────────────┐                                       │
│       │              │                                       │
│       ▼              ▼                                       │
│  ┌─────────┐    ┌───────────┐                               │
│  │   OUT   │    │ CANCELLED │                               │
│  └─────────┘    └───────────┘                               │
│       │              │                                       │
│       │              │                                       │
│  Exit recorded   Entry cancelled                             │
│  (gate_out set)  (before exit)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Types

```typescript
interface EntryLog {
  id: number
  person_type: EntryPersonType
  gate_in: EntryGate
  gate_out: EntryGate | null
  name_snapshot: string
  photo_snapshot?: string | null
  entry_time: string
  exit_time?: string | null
  purpose?: string | null
  vehicle_no?: string | null
  remarks?: string | null
  status: 'IN' | 'OUT' | 'CANCELLED'
  created_at: string
  updated_at: string
  visitor?: number | null
  labour?: number | null
}

interface Visitor {
  id: number
  name: string
  mobile?: string
  company_name?: string
  id_proof_type?: string
  id_proof_no?: string
  photo?: string
  blacklisted: boolean
}

interface Labour {
  id: number
  name: string
  contractor: number
  contractor_name?: string
  mobile?: string
  id_proof_no?: string
  photo?: string
  skill_type?: string
  permit_valid_till?: string
  is_active: boolean
}
```

## Related Documentation

- [Modules Overview](./overview.md)
- [API Endpoints](../api/endpoints.md)
- [State Management](../architecture/state-management.md)
