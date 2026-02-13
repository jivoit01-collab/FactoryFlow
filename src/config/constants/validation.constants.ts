export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  vehicleNumber: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^[0-9]+$/,
  // Indian ID document patterns
  aadhar: /^[0-9]{12}$/, // 12 digits only
  panCard: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, // 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
  voterId: /^[A-Z]{3}[0-9]{7}$/, // 3 letters + 7 digits (e.g., ABC1234567)
  drivingLicense: /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/, // State code + RTO code + year + number (e.g., MH0220150001234)
} as const;

export const VALIDATION_LIMITS = {
  name: { min: 2, max: 100 },
  email: { min: 5, max: 255 },
  password: { min: 8, max: 128 },
  description: { min: 0, max: 500 },
  vehicleNumber: { min: 6, max: 15 },
  phone: { min: 10, max: 15 },
} as const;

export const VALIDATION_MESSAGES = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must be at most ${max} characters`,
  invalidEmail: 'Please enter a valid email address',
  invalidPhone: 'Please enter a valid phone number',
  invalidVehicleNumber: 'Please enter a valid vehicle number (e.g., MH12AB1234)',
} as const;
