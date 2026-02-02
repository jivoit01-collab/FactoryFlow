import { z } from 'zod'
import { PassFailResult } from '../types/qualityCheck.types'

// Schema for individual parameter result
const parameterResultSchema = z.object({
  observedValue: z.string(),
  passFail: z.enum([PassFailResult.PASS, PassFailResult.FAIL, PassFailResult.NOT_CHECKED]),
})

// Visual Inspection schema
export const visualInspectionSchema = z.object({
  appearance: parameterResultSchema,
  odor: parameterResultSchema,
  packaging: parameterResultSchema,
})

// Lab Parameters schema
export const labParametersSchema = z.object({
  purity: parameterResultSchema,
  ph: parameterResultSchema,
  moisture: parameterResultSchema,
  heavyMetals: parameterResultSchema,
})

// Complete QC Inspection form schema
export const qcInspectionSchema = z.object({
  visualInspection: visualInspectionSchema,
  labParameters: labParametersSchema,
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
})

// Schema for QC submission with action
export const submitQCSchema = z.object({
  action: z.enum(['accept', 'reject', 'hold']),
  visualInspection: visualInspectionSchema,
  labParameters: labParametersSchema,
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
})

// Type inference from schemas
export type VisualInspectionFormData = z.infer<typeof visualInspectionSchema>
export type LabParametersFormData = z.infer<typeof labParametersSchema>
export type QCInspectionFormData = z.infer<typeof qcInspectionSchema>
export type SubmitQCFormData = z.infer<typeof submitQCSchema>

// Validation helper - check if all parameters have been checked
export function areAllParametersChecked(data: QCInspectionFormData): boolean {
  const visualParams = Object.values(data.visualInspection)
  const labParams = Object.values(data.labParameters)
  const allParams = [...visualParams, ...labParams]

  return allParams.every((param) => param.passFail !== PassFailResult.NOT_CHECKED)
}

// Validation helper - check if any parameter failed
export function hasAnyFailedParameter(data: QCInspectionFormData): boolean {
  const visualParams = Object.values(data.visualInspection)
  const labParams = Object.values(data.labParameters)
  const allParams = [...visualParams, ...labParams]

  return allParams.some((param) => param.passFail === PassFailResult.FAIL)
}

// Validation helper - count passed/failed parameters
export function getParameterCounts(data: QCInspectionFormData): {
  passed: number
  failed: number
  notChecked: number
  total: number
} {
  const visualParams = Object.values(data.visualInspection)
  const labParams = Object.values(data.labParameters)
  const allParams = [...visualParams, ...labParams]

  return {
    passed: allParams.filter((p) => p.passFail === PassFailResult.PASS).length,
    failed: allParams.filter((p) => p.passFail === PassFailResult.FAIL).length,
    notChecked: allParams.filter((p) => p.passFail === PassFailResult.NOT_CHECKED).length,
    total: allParams.length,
  }
}
