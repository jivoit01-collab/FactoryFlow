/**
 * Get user initials from name or email
 * 
 * @param name - User's full name
 * @param email - User's email address
 * @returns Two-letter initials string
 */
export function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return 'U'
}

/**
 * Format date string to readable format
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Group permissions by app label (e.g., 'accounts', 'admin')
 * Permissions are in format: 'app_label.permission_codename'
 * 
 * @param permissions - Array of permission strings
 * @returns Object with app labels as keys and arrays of permissions as values
 */
export function groupPermissionsByApp(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}

  permissions.forEach((permission) => {
    const [appLabel] = permission.split('.')
    if (!grouped[appLabel]) {
      grouped[appLabel] = []
    }
    grouped[appLabel].push(permission)
  })

  return grouped
}

/**
 * Format permission codename to readable text
 * Converts 'add_user' to 'Add User', 'view_logentry' to 'View Log Entry', etc.
 * 
 * @param permission - Full permission string (e.g., 'accounts.add_user')
 * @returns Formatted permission name (e.g., 'Add User')
 */
export function formatPermissionName(permission: string): string {
  // Extract codename (part after the dot)
  const codename = permission.split('.').slice(1).join('.')
  
  // Split by underscore and capitalize each word
  return codename
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
