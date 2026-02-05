import { useMemo } from 'react'
import { usePermission } from '@/core/auth'
import { QC_PERMISSIONS } from '@/config/permissions'
import type { Inspection } from '../types'

/**
 * Hook for checking QC inspection-related permissions
 *
 * Combines raw permission checks with workflow state to determine
 * what actions the current user can perform on an inspection.
 *
 * @param inspection - The inspection to check permissions for (null if creating new)
 * @returns Object with permission flags for various actions
 *
 * @example
 * const { canEdit, showSaveButton, showChemistApproval } = useInspectionPermissions(inspection)
 * {canEdit && <Input disabled={false} ... />}
 * {showChemistApproval && <Button>Approve as Chemist</Button>}
 */
export function useInspectionPermissions(inspection: Inspection | null | undefined) {
  const { hasAnyPermission } = usePermission()

  return useMemo(() => {
    // Raw permission checks
    const canCreateInspection = hasAnyPermission([QC_PERMISSIONS.INSPECTION.CREATE])
    const canEditInspection = hasAnyPermission([
      QC_PERMISSIONS.INSPECTION.CREATE,
      QC_PERMISSIONS.INSPECTION.EDIT,
    ])
    const canSubmitInspection = hasAnyPermission([QC_PERMISSIONS.INSPECTION.SUBMIT])
    const canApproveAsChemist = hasAnyPermission([QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST])
    const canApproveAsQAM = hasAnyPermission([QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM])
    const canReject = hasAnyPermission([
      QC_PERMISSIONS.APPROVAL.REJECT,
      QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
      QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
    ])

    // Workflow state checks
    const isDraft = !inspection || inspection.workflow_status === 'DRAFT'
    const isSubmitted = inspection?.workflow_status === 'SUBMITTED'
    const isChemistApproved = inspection?.workflow_status === 'QA_CHEMIST_APPROVED'
    const isLocked = inspection?.is_locked ?? false
    const isCompleted =
      inspection?.workflow_status === 'QAM_APPROVED' ||
      inspection?.workflow_status === 'COMPLETED'

    // Contextual permissions (combining permission + workflow state)
    return {
      // Raw permission flags
      canCreateInspection,
      canEditInspection,
      canSubmitInspection,
      canApproveAsChemist,
      canApproveAsQAM,
      canReject,

      // UI visibility flags (what to show based on permission + state)
      /** Show save/edit button - user has edit permission and inspection is in DRAFT and not locked */
      showSaveButton: !isLocked && isDraft && canEditInspection,

      /** Show submit button - inspection exists, is in DRAFT, not locked, and user has submit permission */
      showSubmitButton: inspection && isDraft && !isLocked && canSubmitInspection,

      /** Show chemist approval section - inspection is SUBMITTED and user has chemist approval permission */
      showChemistApproval: isSubmitted && canApproveAsChemist,

      /** Show QAM approval section - inspection is QA_CHEMIST_APPROVED and user has QAM approval permission */
      showQAMApproval: isChemistApproved && canApproveAsQAM,

      /** Show reject button - inspection is in approvable state and user has reject permission */
      showRejectButton: (isSubmitted || isChemistApproved) && canReject,

      /** Can edit form fields - same as showSaveButton */
      canEditFields: !isLocked && isDraft && canEditInspection,

      /** Is inspection completed/locked */
      isCompleted,
      isLocked,
    }
  }, [inspection, hasAnyPermission])
}

/**
 * Hook for checking QC arrival slip permissions
 */
export function useArrivalSlipPermissions() {
  const { hasAnyPermission } = usePermission()

  return useMemo(
    () => ({
      canCreate: hasAnyPermission([QC_PERMISSIONS.ARRIVAL_SLIP.CREATE]),
      canEdit: hasAnyPermission([
        QC_PERMISSIONS.ARRIVAL_SLIP.CREATE,
        QC_PERMISSIONS.ARRIVAL_SLIP.EDIT,
      ]),
      canSubmit: hasAnyPermission([QC_PERMISSIONS.ARRIVAL_SLIP.SUBMIT]),
      canView: hasAnyPermission([QC_PERMISSIONS.ARRIVAL_SLIP.VIEW]),
    }),
    [hasAnyPermission]
  )
}

/**
 * Hook for checking QC master data permissions
 */
export function useMasterDataPermissions() {
  const { hasAnyPermission } = usePermission()

  return useMemo(
    () => ({
      canManageMaterialTypes: hasAnyPermission([QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES]),
      canManageQCParameters: hasAnyPermission([QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS]),
    }),
    [hasAnyPermission]
  )
}
