import { Upload } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { pickPhotos } from '@/shared/utils';

import type {
  AssetDocumentType,
  AssetDocumentUploadPayload,
  AssetPhotoUploadPayload,
  MaintenanceChoice,
} from '../types';

interface AssetPhotoUploadDialogProps {
  open: boolean;
  assetId: number;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AssetPhotoUploadPayload) => Promise<void> | void;
}

interface AssetDocumentUploadDialogProps {
  open: boolean;
  assetId: number;
  documentTypes?: MaintenanceChoice<AssetDocumentType>[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AssetDocumentUploadPayload) => Promise<void> | void;
}

function todayValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, '');
}

export function AssetPhotoUploadDialog({
  open,
  assetId,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: AssetPhotoUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [takenOn, setTakenOn] = useState(todayValue());
  const [isMonthlyPhoto, setIsMonthlyPhoto] = useState(true);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(pickPhotos(event.target)[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    await onSubmit({
      asset: assetId,
      file,
      caption,
      taken_on: takenOn,
      is_monthly_photo: isMonthlyPhoto,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Asset Photo</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="asset_photo_file">Photo</Label>
            <Input
              id="asset_photo_file"
              type="file"
              onChange={handleFileChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset_photo_caption">Caption</Label>
            <Input
              id="asset_photo_caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset_photo_taken_on">Taken On</Label>
            <Input
              id="asset_photo_taken_on"
              type="date"
              value={takenOn}
              onChange={(event) => setTakenOn(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium" htmlFor="asset_photo_monthly">
            <Checkbox
              id="asset_photo_monthly"
              checked={isMonthlyPhoto}
              onCheckedChange={setIsMonthlyPhoto}
            />
            Monthly photo
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssetDocumentUploadDialog({
  open,
  assetId,
  documentTypes,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: AssetDocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<AssetDocumentType>('OTHER');
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile && !title) {
      setTitle(titleFromFile(selectedFile));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !title.trim()) return;

    await onSubmit({
      asset: assetId,
      file,
      document_type: documentType,
      title,
      document_date: documentDate || null,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Asset Document</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="asset_document_file">Document</Label>
            <Input id="asset_document_file" type="file" onChange={handleFileChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset_document_title">Title</Label>
            <Input
              id="asset_document_title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset_document_type">Type</Label>
              <NativeSelect
                id="asset_document_type"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as AssetDocumentType)}
              >
                {documentTypes?.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
                {(documentTypes?.length ?? 0) === 0 && (
                  <SelectOption value="OTHER">Other</SelectOption>
                )}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset_document_date">Document Date</Label>
              <Input
                id="asset_document_date"
                type="date"
                value={documentDate}
                onChange={(event) => setDocumentDate(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset_document_notes">Notes</Label>
            <Textarea
              id="asset_document_notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !file || !title.trim()}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
