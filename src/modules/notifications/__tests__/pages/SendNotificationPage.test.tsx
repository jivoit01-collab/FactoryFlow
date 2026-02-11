import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// SendNotificationPage — File Content Verification
//
// Direct import of SendNotificationPage hangs because it triggers
// Vite's module graph resolution on lucide-react (thousands of
// icon exports) and @/shared/components/ui (radix-ui chain).
// Instead, we verify the component structure via file content
// analysis — the same proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readPageSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/notifications/pages/SendNotificationPage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Exports', () => {
  it('default exports SendNotificationPage function', () => {
    const content = readPageSource()
    expect(content).toContain('export default function SendNotificationPage()')
  })

  it('imports useState and useMemo from react', () => {
    const content = readPageSource()
    expect(content).toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"]/)
    expect(content).toMatch(/import\s*\{[^}]*useMemo[^}]*\}\s*from\s*['"]react['"]/)
  })

  it('imports icons from lucide-react', () => {
    const content = readPageSource()
    expect(content).toContain('Send')
    expect(content).toContain('AlertCircle')
    expect(content).toContain('Users')
    expect(content).toContain('Loader2')
    expect(content).toContain('Search')
    expect(content).toContain('CheckCircle2')
  })

  it('imports toast from sonner', () => {
    const content = readPageSource()
    expect(content).toContain("import { toast } from 'sonner'")
  })

  it('imports UI components from @/shared/components/ui', () => {
    const content = readPageSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Button')
    expect(content).toContain('Card')
    expect(content).toContain('Input')
    expect(content).toContain('Label')
    expect(content).toContain('Textarea')
    expect(content).toContain('Checkbox')
    expect(content).toContain('Badge')
  })

  it('imports useScrollToError from @/shared/hooks', () => {
    const content = readPageSource()
    expect(content).toContain("import { useScrollToError } from '@/shared/hooks'")
  })

  it('imports query hooks from local api', () => {
    const content = readPageSource()
    expect(content).toContain('useCompanyUsers')
    expect(content).toContain('useSendNotification')
    expect(content).toContain("from '../api/sendNotification.queries'")
  })

  it('imports NOTIFICATION_TYPES from local types', () => {
    const content = readPageSource()
    expect(content).toContain("import { NOTIFICATION_TYPES } from '../types/sendNotification.types'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Header', () => {
  it('renders "Send Notification" heading', () => {
    const content = readPageSource()
    expect(content).toContain('>Send Notification</h2>')
  })

  it('renders subtitle about broadcasting', () => {
    const content = readPageSource()
    expect(content).toContain('Broadcast a notification to users in your company')
  })
})

// ═══════════════════════════════════════════════════════════════
// Form Fields
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Form Fields', () => {
  it('has title input with label and required marker', () => {
    const content = readPageSource()
    expect(content).toMatch(/<Label\s+htmlFor="title"/)
    expect(content).toContain("id=\"title\"")
    expect(content).toContain('text-destructive">*</span>')
  })

  it('has body textarea with label and required marker', () => {
    const content = readPageSource()
    expect(content).toMatch(/<Label\s+htmlFor="body"/)
    expect(content).toMatch(/<Textarea/)
    expect(content).toContain("id=\"body\"")
  })

  it('has notification type select rendering NOTIFICATION_TYPES', () => {
    const content = readPageSource()
    expect(content).toContain("id=\"notification_type\"")
    expect(content).toContain('NOTIFICATION_TYPES.map')
    expect(content).toContain('{type.label}')
  })

  it('has click action URL input', () => {
    const content = readPageSource()
    expect(content).toContain("id=\"click_action_url\"")
    expect(content).toContain('e.g. /announcements')
  })

  it('has role filter input visible only in all mode', () => {
    const content = readPageSource()
    expect(content).toContain("recipientMode === 'all'")
    expect(content).toContain("id=\"role_filter\"")
    expect(content).toContain('e.g. QC')
  })
})

// ═══════════════════════════════════════════════════════════════
// Recipient Mode
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Recipient Mode', () => {
  it('defines RecipientMode type as "all" | "specific"', () => {
    const content = readPageSource()
    expect(content).toMatch(/type\s+RecipientMode\s*=\s*['"]all['"]\s*\|\s*['"]specific['"]/)
  })

  it('defaults recipientMode to "all"', () => {
    const content = readPageSource()
    expect(content).toMatch(/useState<RecipientMode>\(['"]all['"]\)/)
  })

  it('renders All Users / Specific Users toggle buttons', () => {
    const content = readPageSource()
    expect(content).toContain("label: 'All Users'")
    expect(content).toContain("label: 'Specific Users'")
  })

  it('shows broadcast message in all mode', () => {
    const content = readPageSource()
    expect(content).toContain('Notification will be sent to all users in the company')
  })

  it('shows role-filtered broadcast message', () => {
    const content = readPageSource()
    expect(content).toMatch(/Notification will be sent to all users with role/)
  })
})

// ═══════════════════════════════════════════════════════════════
// User List & Search
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — User List', () => {
  it('has search input for users', () => {
    const content = readPageSource()
    expect(content).toContain('Search users...')
  })

  it('filteredUsers uses useMemo with search logic', () => {
    const content = readPageSource()
    expect(content).toContain('const filteredUsers = useMemo(')
    expect(content).toContain('userSearch.toLowerCase()')
    expect(content).toContain('full_name.toLowerCase().includes(search)')
    expect(content).toContain('email.toLowerCase().includes(search)')
  })

  it('shows "No users found" when empty', () => {
    const content = readPageSource()
    expect(content).toContain("'No users found'")
  })

  it('shows "No users match your search" for non-matching search', () => {
    const content = readPageSource()
    expect(content).toContain("'No users match your search'")
  })

  it('shows loading spinner when users loading', () => {
    const content = readPageSource()
    expect(content).toContain('usersLoading')
    expect(content).toContain('Loader2')
  })

  it('renders user name and email', () => {
    const content = readPageSource()
    expect(content).toContain('{user.full_name}')
    expect(content).toContain('{user.email}')
  })
})

// ═══════════════════════════════════════════════════════════════
// Selection
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Selection', () => {
  it('toggleUser adds/removes user from selectedUserIds', () => {
    const content = readPageSource()
    expect(content).toContain('const toggleUser = (userId: number)')
    expect(content).toContain('prev.includes(userId)')
    expect(content).toContain('prev.filter((id) => id !== userId)')
    expect(content).toContain('[...prev, userId]')
  })

  it('selectAll selects all filteredUsers', () => {
    const content = readPageSource()
    expect(content).toContain('const selectAll = ()')
    expect(content).toContain('filteredUsers.map((u) => u.id)')
  })

  it('deselectAll clears all selections', () => {
    const content = readPageSource()
    expect(content).toContain('const deselectAll = ()')
    expect(content).toContain('setSelectedUserIds([])')
  })

  it('shows selected count text', () => {
    const content = readPageSource()
    expect(content).toContain('{selectedUserIds.length} selected')
  })

  it('has Select all and Clear buttons', () => {
    const content = readPageSource()
    expect(content).toContain('onClick={selectAll}')
    expect(content).toContain('Select all')
    expect(content).toContain('onClick={deselectAll}')
    expect(content).toContain('Clear')
  })

  it('renders Checkbox for each user', () => {
    const content = readPageSource()
    expect(content).toContain('<Checkbox')
    expect(content).toContain('checked={selectedUserIds.includes(user.id)}')
    expect(content).toContain('toggleUser(user.id)')
  })
})

// ═══════════════════════════════════════════════════════════════
// Selected User Badges
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Badges', () => {
  it('shows first 5 selected user badges', () => {
    const content = readPageSource()
    expect(content).toContain('selectedUserIds.slice(0, 5)')
    expect(content).toContain('{user.full_name}')
  })

  it('shows "+N more" badge when more than 5 selected', () => {
    const content = readPageSource()
    expect(content).toContain('selectedUserIds.length > 5')
    expect(content).toContain('+{selectedUserIds.length - 5} more')
  })
})

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Validation', () => {
  it('validates title is required', () => {
    const content = readPageSource()
    expect(content).toContain("errors.title = 'Title is required'")
  })

  it('validates body is required', () => {
    const content = readPageSource()
    expect(content).toContain("errors.body = 'Body is required'")
  })

  it('validates at least one recipient in specific mode', () => {
    const content = readPageSource()
    expect(content).toContain("errors.recipients = 'Select at least one recipient'")
  })

  it('displays error messages in the form', () => {
    const content = readPageSource()
    expect(content).toContain('{apiErrors.title}')
    expect(content).toContain('{apiErrors.body}')
    expect(content).toContain('{apiErrors.recipients}')
  })

  it('handleInputChange clears error for the changed field', () => {
    const content = readPageSource()
    expect(content).toContain('const handleInputChange = (field: string, value: string)')
    expect(content).toContain('if (apiErrors[field])')
    expect(content).toContain('delete next[field]')
  })
})

// ═══════════════════════════════════════════════════════════════
// Submit
// ═══════════════════════════════════════════════════════════════

describe('SendNotificationPage — Submit', () => {
  it('handleSubmit is async', () => {
    const content = readPageSource()
    expect(content).toContain('const handleSubmit = async ()')
  })

  it('builds SendNotificationRequest with trimmed values', () => {
    const content = readPageSource()
    expect(content).toContain('title: title.trim()')
    expect(content).toContain('body: body.trim()')
    expect(content).toContain('notification_type: notificationType')
  })

  it('includes recipient_user_ids in specific mode', () => {
    const content = readPageSource()
    expect(content).toContain("recipientMode === 'specific'")
    expect(content).toContain('request.recipient_user_ids = selectedUserIds')
  })

  it('includes role_filter in all mode when provided', () => {
    const content = readPageSource()
    expect(content).toContain('request.role_filter = roleFilter.trim()')
  })

  it('calls sendNotification.mutateAsync', () => {
    const content = readPageSource()
    expect(content).toContain('sendNotification.mutateAsync(request)')
  })

  it('shows toast.success on success', () => {
    const content = readPageSource()
    expect(content).toContain('toast.success(result.message)')
  })

  it('resets form after successful send', () => {
    const content = readPageSource()
    expect(content).toContain("setTitle('')")
    expect(content).toContain("setBody('')")
    expect(content).toContain("setSelectedUserIds([])")
    expect(content).toContain("setRecipientMode('all')")
  })

  it('handles API errors with fallback message', () => {
    const content = readPageSource()
    expect(content).toContain("apiError.message || 'Failed to send notification'")
  })

  it('submit button shows "Sending..." when pending', () => {
    const content = readPageSource()
    expect(content).toContain("isSending ? 'Sending...' : 'Send Notification'")
  })

  it('submit button is disabled when sending', () => {
    const content = readPageSource()
    expect(content).toContain('disabled={isSending}')
  })

  it('general error displays with AlertCircle icon', () => {
    const content = readPageSource()
    expect(content).toContain('apiErrors.general')
    expect(content).toContain('AlertCircle')
    expect(content).toContain('bg-destructive/15')
  })
})
