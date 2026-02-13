import { Check } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/config/routes.config'
import { switchCompany } from '@/core/auth'
import { indexedDBService } from '@/core/auth/services/indexedDb.service'
import { useAppDispatch, useAppSelector } from '@/core/store'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'

/**
 * CompanySelectionPage component
 *
 * Allows user to select a company from their available companies.
 * After selection, saves the company to IndexedDB and Redux, then navigates to LoadingUserPage.
 */
export default function CompanySelectionPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppSelector((state) => state.auth)

  // Get the intended URL from navigation state (passed from AuthInitializer)
  const from = (location.state as { from?: string })?.from

  // Get active companies from user
  const companies = user?.companies || []

  const handleContinue = async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)

    try {
      // Find the selected company
      const selectedCompany = companies.find((c) => c.company_id.toString() === selectedCompanyId)

      if (!selectedCompany) {
        console.error('Selected company not found')
        return
      }

      // Save company to IndexedDB
      await indexedDBService.updateCurrentCompany(selectedCompany)

      // Update Redux state
      dispatch(switchCompany(selectedCompany))

      // Navigate to loading user page, passing through the intended URL
      navigate(ROUTES.LOADING_USER.path, { replace: true, state: { from } })
    } catch (error) {
      console.error('Failed to select company:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || companies.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No Companies Available</CardTitle>
          <CardDescription>
            You don't have access to any companies. Please contact your administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/JivoWellnessLogo.png"
            alt="Jivo Wellness Logo"
            className="h-16 w-auto dark:invert"
          />
        </div>
        <CardTitle className="text-2xl font-bold">Select Company</CardTitle>
        <CardDescription>Choose a company to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select a company</label>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {companies.map((company) => {
              const isSelected = selectedCompanyId === company.company_id.toString()
              return (
                <Card
                  key={company.company_id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedCompanyId(company.company_id.toString())}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{company.company_name}</p>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {company.role} • {company.company_code}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedCompanyId || isLoading}
          className="w-full"
        >
          {isLoading ? 'Loading...' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  )
}
