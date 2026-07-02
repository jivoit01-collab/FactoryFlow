import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  Button,
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

import type {
  AssetCategoryPayload,
  AssetLocationPayload,
  OrgDepartmentPayload,
} from '../types';

export type MaintenanceMasterKind = 'category' | 'location' | 'department';

export type MaintenanceMasterPayload =
  | AssetCategoryPayload
  | AssetLocationPayload
  | OrgDepartmentPayload;

interface MasterDataDialogProps {
  open: boolean;
  kind: MaintenanceMasterKind;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (kind: MaintenanceMasterKind, payload: MaintenanceMasterPayload) => Promise<void> | void;
}

const LABELS: Record<MaintenanceMasterKind, string> = {
  category: 'Category',
  location: 'Location',
  department: 'Department',
};

export function MasterDataDialog({
  open,
  kind,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: MasterDataDialogProps) {
  const [selectedKind, setSelectedKind] = useState<MaintenanceMasterKind>(() => kind);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [line, setLine] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const base = { name: name.trim(), description: description.trim() };
    if (selectedKind === 'location') {
      await onSubmit(selectedKind, { ...base, area: area.trim(), line: line.trim() });
      return;
    }
    await onSubmit(selectedKind, base);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {LABELS[selectedKind]}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="master_kind">Type</Label>
            <NativeSelect
              id="master_kind"
              value={selectedKind}
              onChange={(event) => setSelectedKind(event.target.value as MaintenanceMasterKind)}
            >
              <SelectOption value="category">Category</SelectOption>
              <SelectOption value="location">Location</SelectOption>
              <SelectOption value="department">Department</SelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="master_name">Name</Label>
            <Input
              id="master_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          {selectedKind === 'location' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="master_area">Area</Label>
                <Input
                  id="master_area"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="master_line">Line</Label>
                <Input
                  id="master_line"
                  value={line}
                  onChange={(event) => setLine(event.target.value)}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="master_description">Description</Label>
            <Textarea
              id="master_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
