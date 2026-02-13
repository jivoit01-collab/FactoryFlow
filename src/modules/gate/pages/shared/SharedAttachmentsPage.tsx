import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, FileText, Paperclip, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiError } from '@/core/api'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'

import { useGateAttachments, useUploadAttachment } from '../../api/attachment/attachment.queries'
import { StepFooter, StepHeader } from '../../components'
import type { EntryFlowConfig } from '../../constants/entryFlowConfig'
import { useEntryId } from '../../hooks'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext))
}

interface SharedAttachmentsPageProps {
  config: EntryFlowConfig
}

export default function SharedAttachmentsPage({ config }: SharedAttachmentsPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentStep = config.totalSteps
  const previousStep = `step${config.totalSteps - 1}`

  const [error, setError] = useState<string | null>(null)

  // Fetch existing attachments
  const {
    data: attachments,
    isLoading,
  } = useGateAttachments(entryIdNumber)

  // Upload mutation
  const uploadAttachment = useUploadAttachment(entryIdNumber || 0)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !entryIdNumber) return

    setError(null)

    for (const file of Array.from(files)) {
      try {
        await uploadAttachment.mutateAsync(file)
      } catch (err) {
        const apiError = err as ApiError
        setError(apiError.message || `Failed to upload ${file.name}`)
      }
    }

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`${config.routePrefix}/edit/${entryId}/${previousStep}`)
    } else {
      navigate(`${config.routePrefix}/new/${previousStep}?entryId=${entryId}`)
    }
  }

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    navigate(config.routePrefix)
  }

  const handleNext = () => {
    if (isEditMode && entryId) {
      navigate(`${config.routePrefix}/edit/${entryId}/review`)
    } else {
      navigate(`${config.routePrefix}/new/review?entryId=${entryId}`)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={currentStep}
        totalSteps={config.totalSteps}
        title={config.headerTitle}
        error={error}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={handleUploadClick}
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Images, documents, and other files
                    </p>
                  </div>
                  {uploadAttachment.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Uploading...
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Uploaded Attachments */}
                {attachments && attachments.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} uploaded
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {attachments.map((attachment) => {
                        const url = attachment.file
                        const fileName = attachment.file_name || url.split('/').pop() || 'File'
                        const isImage = isImageUrl(url)

                        return (
                          <div
                            key={attachment.id}
                            className="group relative rounded-lg border bg-card overflow-hidden"
                          >
                            {isImage ? (
                              <div className="aspect-square">
                                <img
                                  src={url}
                                  alt={fileName}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    // Fallback to file icon on image load error
                                    const target = e.currentTarget
                                    target.style.display = 'none'
                                    const parent = target.parentElement
                                    if (parent) {
                                      parent.classList.add(
                                        'flex',
                                        'items-center',
                                        'justify-center',
                                        'bg-muted'
                                      )
                                      const icon = document.createElement('div')
                                      icon.innerHTML = '📄'
                                      icon.className = 'text-4xl'
                                      parent.appendChild(icon)
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="aspect-square flex items-center justify-center bg-muted">
                                <FileText className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            <div className="p-2">
                              <p className="text-xs font-medium truncate" title={fileName}>
                                {fileName}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!attachments || attachments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No attachments yet. Upload files or skip to continue.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <StepFooter
        onPrevious={handlePrevious}
        onCancel={handleCancel}
        onNext={handleNext}
        isSaving={uploadAttachment.isPending}
        nextLabel="Review"
      />
    </div>
  )
}
