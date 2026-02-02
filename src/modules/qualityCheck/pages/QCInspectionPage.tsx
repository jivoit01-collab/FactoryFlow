import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, Button } from '@/shared/components/ui'
import { QCStatusBadge } from '../components/QCStatusBadge'
import { QCTabs } from '../components/QCTabs'
import { QCParameterRow } from '../components/QCParameterRow'
import { QCFileUpload } from '../components/QCFileUpload'
import { QCActionButtons } from '../components/QCActionButtons'
import {
  QCStatus,
  PassFailResult,
  type QCItem,
  type VisualInspectionData,
  type LabParametersData,
} from '../types/qualityCheck.types'
import {
  QC_TABS,
  QC_FORM_DEFAULTS,
  VISUAL_INSPECTION_PARAMS,
  LAB_PARAMETERS,
  type QCTab,
} from '../constants/qualityCheck.constants'
import { useQCInspection, useSubmitQCInspection } from '../api/qualityCheck.queries'

// Mock data for development
const mockItem: QCItem = {
  id: 1,
  grnNumber: 'GRN-2026-0123',
  itemName: 'Sodium Chloride',
  batchNo: 'BATCH-2026-001',
  vendor: 'ABC Chemicals Ltd',
  receivedDate: '2026-01-12',
  status: QCStatus.PENDING,
}

export default function QCInspectionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const itemId = parseInt(id || '0', 10)

  // State
  const [activeTab, setActiveTab] = useState<QCTab>(QC_TABS.VISUAL)
  const [visualInspection, setVisualInspection] = useState<VisualInspectionData>(
    QC_FORM_DEFAULTS.visualInspection
  )
  const [labParameters, setLabParameters] = useState<LabParametersData>(
    QC_FORM_DEFAULTS.labParameters
  )
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API queries
  const { data: inspection } = useQCInspection(itemId)
  const submitMutation = useSubmitQCInspection(itemId)

  // Use API data or mock data
  const item = inspection || mockItem

  // Visual inspection handlers
  const updateVisualParam = useCallback(
    (
      param: keyof VisualInspectionData,
      field: 'observedValue' | 'passFail',
      value: string | PassFailResult
    ) => {
      setVisualInspection((prev) => ({
        ...prev,
        [param]: {
          ...prev[param],
          [field]: value,
        },
      }))
    },
    []
  )

  // Lab parameters handlers
  const updateLabParam = useCallback(
    (
      param: keyof LabParametersData,
      field: 'observedValue' | 'passFail',
      value: string | PassFailResult
    ) => {
      setLabParameters((prev) => ({
        ...prev,
        [param]: {
          ...prev[param],
          [field]: value,
        },
      }))
    },
    []
  )

  // Submit handlers
  const handleSubmit = async (action: 'accept' | 'reject' | 'hold') => {
    setIsSubmitting(true)
    try {
      await submitMutation.mutateAsync({
        action,
        visualInspection,
        labParameters,
      })
      navigate('/quality-check')
    } catch (error) {
      console.error('Failed to submit QC:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/quality-check')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with back button - Mobile optimized */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/quality-check')}
          className="h-10 w-10 flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Factory Quality Check</h2>
          <p className="text-sm text-muted-foreground truncate">
            QC Inspection for Raw Materials & Packaging
          </p>
        </div>
      </div>

      {/* Inspection Form Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Item Header - Matches design */}
          <div className="mb-6 pb-4 border-b space-y-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold">QC Inspection - {item.grnNumber}</h3>
              <p className="text-sm text-muted-foreground">
                {item.itemName} • Batch: {item.batchNo}
              </p>
            </div>
            {/* Status badge - fixed small size */}
            <QCStatusBadge status={item.status} />
          </div>

          {/* Tabs */}
          <QCTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          <div className="mt-6">
            {/* Visual Inspection Tab */}
            {activeTab === QC_TABS.VISUAL && (
              <div className="rounded-md border overflow-hidden">
                <div
                  className="overflow-x-auto"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium w-1/5">Parameter</th>
                        <th className="p-3 text-left text-sm font-medium w-1/5">Standard Value</th>
                        <th className="p-3 text-left text-sm font-medium w-2/5">Observed Value</th>
                        <th className="p-3 text-left text-sm font-medium w-1/5">Pass / Fail</th>
                      </tr>
                    </thead>
                    <tbody>
                      <QCParameterRow
                        parameter={VISUAL_INSPECTION_PARAMS.appearance.parameter}
                        standardValue={VISUAL_INSPECTION_PARAMS.appearance.standardValue}
                        observedValue={visualInspection.appearance.observedValue}
                        passFail={visualInspection.appearance.passFail}
                        placeholder={VISUAL_INSPECTION_PARAMS.appearance.placeholder}
                        onObservedValueChange={(value) =>
                          updateVisualParam('appearance', 'observedValue', value)
                        }
                        onPassFailChange={(value) =>
                          updateVisualParam('appearance', 'passFail', value)
                        }
                        disabled={isSubmitting}
                      />
                      <QCParameterRow
                        parameter={VISUAL_INSPECTION_PARAMS.odor.parameter}
                        standardValue={VISUAL_INSPECTION_PARAMS.odor.standardValue}
                        observedValue={visualInspection.odor.observedValue}
                        passFail={visualInspection.odor.passFail}
                        placeholder={VISUAL_INSPECTION_PARAMS.odor.placeholder}
                        onObservedValueChange={(value) =>
                          updateVisualParam('odor', 'observedValue', value)
                        }
                        onPassFailChange={(value) => updateVisualParam('odor', 'passFail', value)}
                        disabled={isSubmitting}
                      />
                      <QCParameterRow
                        parameter={VISUAL_INSPECTION_PARAMS.packaging.parameter}
                        standardValue={VISUAL_INSPECTION_PARAMS.packaging.standardValue}
                        observedValue={visualInspection.packaging.observedValue}
                        passFail={visualInspection.packaging.passFail}
                        placeholder={VISUAL_INSPECTION_PARAMS.packaging.placeholder}
                        onObservedValueChange={(value) =>
                          updateVisualParam('packaging', 'observedValue', value)
                        }
                        onPassFailChange={(value) =>
                          updateVisualParam('packaging', 'passFail', value)
                        }
                        disabled={isSubmitting}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lab Parameters Tab */}
            {activeTab === QC_TABS.LAB && (
              <div className="rounded-md border overflow-hidden">
                <div
                  className="overflow-x-auto"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium w-1/5">Parameter</th>
                        <th className="p-3 text-left text-sm font-medium w-1/5">Standard Value</th>
                        <th className="p-3 text-left text-sm font-medium w-2/5">Observed Value</th>
                        <th className="p-3 text-left text-sm font-medium w-1/5">Pass / Fail</th>
                      </tr>
                    </thead>
                    <tbody>
                      <QCParameterRow
                        parameter={LAB_PARAMETERS.purity.parameter}
                        standardValue={LAB_PARAMETERS.purity.standardValue}
                        observedValue={labParameters.purity.observedValue}
                        passFail={labParameters.purity.passFail}
                        placeholder={LAB_PARAMETERS.purity.placeholder}
                        onObservedValueChange={(value) =>
                          updateLabParam('purity', 'observedValue', value)
                        }
                        onPassFailChange={(value) => updateLabParam('purity', 'passFail', value)}
                        disabled={isSubmitting}
                      />
                      <QCParameterRow
                        parameter={LAB_PARAMETERS.ph.parameter}
                        standardValue={LAB_PARAMETERS.ph.standardValue}
                        observedValue={labParameters.ph.observedValue}
                        passFail={labParameters.ph.passFail}
                        placeholder={LAB_PARAMETERS.ph.placeholder}
                        onObservedValueChange={(value) =>
                          updateLabParam('ph', 'observedValue', value)
                        }
                        onPassFailChange={(value) => updateLabParam('ph', 'passFail', value)}
                        disabled={isSubmitting}
                      />
                      <QCParameterRow
                        parameter={LAB_PARAMETERS.moisture.parameter}
                        standardValue={LAB_PARAMETERS.moisture.standardValue}
                        observedValue={labParameters.moisture.observedValue}
                        passFail={labParameters.moisture.passFail}
                        placeholder={LAB_PARAMETERS.moisture.placeholder}
                        onObservedValueChange={(value) =>
                          updateLabParam('moisture', 'observedValue', value)
                        }
                        onPassFailChange={(value) => updateLabParam('moisture', 'passFail', value)}
                        disabled={isSubmitting}
                      />
                      <QCParameterRow
                        parameter={LAB_PARAMETERS.heavyMetals.parameter}
                        standardValue={LAB_PARAMETERS.heavyMetals.standardValue}
                        observedValue={labParameters.heavyMetals.observedValue}
                        passFail={labParameters.heavyMetals.passFail}
                        placeholder={LAB_PARAMETERS.heavyMetals.placeholder}
                        onObservedValueChange={(value) =>
                          updateLabParam('heavyMetals', 'observedValue', value)
                        }
                        onPassFailChange={(value) =>
                          updateLabParam('heavyMetals', 'passFail', value)
                        }
                        disabled={isSubmitting}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === QC_TABS.ATTACHMENTS && (
              <QCFileUpload
                files={attachments}
                onFilesChange={setAttachments}
                disabled={isSubmitting}
              />
            )}
          </div>

          {/* Action Buttons */}
          <QCActionButtons
            onAccept={() => handleSubmit('accept')}
            onReject={() => handleSubmit('reject')}
            onHold={() => handleSubmit('hold')}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
