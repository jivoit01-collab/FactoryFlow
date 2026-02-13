import { AlertCircle, CheckCircle2, Loader2, Search, Send, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { ApiError } from '@/core/api'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'

import { useCompanyUsers, useSendNotification } from '../api/sendNotification.queries'
import type { SendNotificationRequest } from '../types/sendNotification.types'
import { NOTIFICATION_TYPES } from '../types/sendNotification.types'

type RecipientMode = 'all' | 'specific'

export default function SendNotificationPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [notificationType, setNotificationType] = useState('GENERAL_ANNOUNCEMENT')
  const [clickActionUrl, setClickActionUrl] = useState('')
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  useScrollToError(apiErrors)

  const { data: users = [], isLoading: usersLoading } = useCompanyUsers()
  const sendNotification = useSendNotification()

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const search = userSearch.toLowerCase()
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    )
  }, [users, userSearch])

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
    if (apiErrors.recipients) {
      setApiErrors((prev) => {
        const next = { ...prev }
        delete next.recipients
        return next
      })
    }
  }

  const selectAll = () => {
    setSelectedUserIds(filteredUsers.map((u) => u.id))
  }

  const deselectAll = () => {
    setSelectedUserIds([])
  }

  const handleInputChange = (field: string, value: string) => {
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    switch (field) {
      case 'title':
        setTitle(value)
        break
      case 'body':
        setBody(value)
        break
      case 'click_action_url':
        setClickActionUrl(value)
        break
      case 'role_filter':
        setRoleFilter(value)
        break
    }
  }

  const handleSubmit = async () => {
    const errors: Record<string, string> = {}

    if (!title.trim()) errors.title = 'Title is required'
    if (!body.trim()) errors.body = 'Body is required'
    if (recipientMode === 'specific' && selectedUserIds.length === 0) {
      errors.recipients = 'Select at least one recipient'
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors)
      return
    }

    const request: SendNotificationRequest = {
      title: title.trim(),
      body: body.trim(),
      notification_type: notificationType,
    }

    if (clickActionUrl.trim()) {
      request.click_action_url = clickActionUrl.trim()
    }

    if (recipientMode === 'specific') {
      request.recipient_user_ids = selectedUserIds
    } else if (roleFilter.trim()) {
      request.role_filter = roleFilter.trim()
    }

    try {
      setApiErrors({})
      const result = await sendNotification.mutateAsync(request)
      toast.success(result.message)
      // Reset form
      setTitle('')
      setBody('')
      setNotificationType('GENERAL_ANNOUNCEMENT')
      setClickActionUrl('')
      setSelectedUserIds([])
      setRoleFilter('')
      setUserSearch('')
      setRecipientMode('all')
    } catch (error) {
      const apiError = error as ApiError
      setApiErrors({ general: apiError.message || 'Failed to send notification' })
    }
  }

  const isSending = sendNotification.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Send Notification</h2>
        <p className="text-muted-foreground">Broadcast a notification to users in your company</p>
      </div>

      {/* General error */}
      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {apiErrors.general}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Details</CardTitle>
            <CardDescription>Compose the notification to send</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Maintenance Scheduled"
                value={title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={apiErrors.title ? 'border-destructive' : ''}
              />
              {apiErrors.title && <p className="text-sm text-destructive">{apiErrors.title}</p>}
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">
                Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="body"
                placeholder="Write the notification message..."
                rows={4}
                value={body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                className={apiErrors.body ? 'border-destructive' : ''}
              />
              {apiErrors.body && <p className="text-sm text-destructive">{apiErrors.body}</p>}
            </div>

            {/* Notification Type */}
            <div className="space-y-2">
              <Label htmlFor="notification_type">Notification Type</Label>
              <select
                id="notification_type"
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Click Action URL */}
            <div className="space-y-2">
              <Label htmlFor="click_action_url">Click Action URL</Label>
              <Input
                id="click_action_url"
                placeholder="e.g. /announcements"
                value={clickActionUrl}
                onChange={(e) => handleInputChange('click_action_url', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Frontend route to redirect when the notification is clicked
              </p>
            </div>

            {/* Role Filter (only for broadcast) */}
            {recipientMode === 'all' && (
              <div className="space-y-2">
                <Label htmlFor="role_filter">Role Filter</Label>
                <Input
                  id="role_filter"
                  placeholder="e.g. QC"
                  value={roleFilter}
                  onChange={(e) => handleInputChange('role_filter', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to broadcast to all users, or enter a role to filter recipients
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <Button onClick={handleSubmit} disabled={isSending} className="w-full sm:w-auto">
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients
            </CardTitle>
            <CardDescription>Choose who receives this notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient Mode Toggle */}
            <div className="flex gap-1 rounded-lg border bg-muted p-1">
              {[
                { key: 'all' as const, label: 'All Users' },
                { key: 'specific' as const, label: 'Specific Users' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRecipientMode(key)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    recipientMode === key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {recipientMode === 'all' ? (
              <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {roleFilter.trim()
                    ? `Notification will be sent to all users with role "${roleFilter.trim()}"`
                    : 'Notification will be sent to all users in the company'}
                </p>
              </div>
            ) : (
              <>
                {/* User Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Selection controls */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{selectedUserIds.length} selected</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {apiErrors.recipients && (
                  <p className="text-sm text-destructive">{apiErrors.recipients}</p>
                )}

                {/* User List */}
                <div className="max-h-[400px] overflow-y-auto rounded-md border">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {userSearch ? 'No users match your search' : 'No users found'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors"
                        >
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected users badges */}
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUserIds.slice(0, 5).map((id) => {
                      const user = users.find((u) => u.id === id)
                      return user ? (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {user.full_name}
                        </Badge>
                      ) : null
                    })}
                    {selectedUserIds.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedUserIds.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
