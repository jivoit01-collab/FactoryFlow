import { useCallback, useState } from 'react'
import { Upload, X, File, Image, FileText } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import { MAX_FILE_SIZE } from '../constants/qualityCheck.constants'

interface QCFileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
}

export function QCFileUpload({
  files,
  onFilesChange,
  disabled,
  maxFiles = 10,
}: QCFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 10MB.`
    }
    return null
  }

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles || disabled) return

      setError(null)
      const validFiles: File[] = []

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]
        const error = validateFile(file)
        if (error) {
          setError(error)
          continue
        }
        validFiles.push(file)
      }

      if (files.length + validFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      onFilesChange([...files, ...validFiles])
    },
    [files, onFilesChange, disabled, maxFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = '' // Reset input
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image
    if (file.type === 'application/pdf') return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Upload Area - Touch friendly */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          id="qc-file-upload"
          accept="image/*,.pdf,.doc,.docx"
        />
        <label
          htmlFor="qc-file-upload"
          className={cn(
            'cursor-pointer block min-h-[100px] flex flex-col items-center justify-center',
            disabled && 'cursor-not-allowed'
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-primary font-medium text-sm sm:text-base">
            Click to upload test reports
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Upload QC test reports, photos, or certificates
          </p>
        </label>
      </div>

      {/* Error Message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* File List - Touch friendly */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const FileIcon = getFileIcon(file)
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 min-h-[52px]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
