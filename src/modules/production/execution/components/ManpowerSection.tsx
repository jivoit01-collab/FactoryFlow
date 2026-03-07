import { Plus, Users } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { SHIFT_LABELS, SHIFT_ICONS } from '../constants';
import type { CreateManpowerRequest, ProductionManpower, Shift } from '../types';

const SHIFTS: Shift[] = ['MORNING', 'AFTERNOON', 'NIGHT'];

interface ManpowerSectionProps {
  manpower: ProductionManpower[];
  disabled?: boolean;
  onAdd: (data: CreateManpowerRequest) => void;
  onUpdate: (manpowerId: number, data: Partial<CreateManpowerRequest>) => void;
}

export function ManpowerSection({
  manpower,
  disabled = false,
  onAdd,
  onUpdate,
}: ManpowerSectionProps) {
  const existingShifts = new Set(manpower.map((m) => m.shift));
  const missingShifts = SHIFTS.filter((s) => !existingShifts.has(s));

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manpower
          </CardTitle>
          {!disabled && missingShifts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onAdd({
                  shift: missingShifts[0],
                  worker_count: 0,
                  supervisor: '',
                  engineer: '',
                })
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Shift
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {manpower.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No manpower entries yet. Click "Add Shift" to add one.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {manpower.map((entry) => {
              const ShiftIcon = SHIFT_ICONS[entry.shift];
              return (
                <Card key={entry.id} className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <ShiftIcon className="h-4 w-4" />
                      {SHIFT_LABELS[entry.shift]}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Workers</Label>
                        <Input
                          type="number"
                          min={0}
                          value={entry.worker_count || ''}
                          disabled={disabled}
                          placeholder="0"
                          className="h-8 text-xs"
                          onChange={(e) =>
                            onUpdate(entry.id, {
                              worker_count: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Supervisor</Label>
                        <Input
                          value={entry.supervisor}
                          disabled={disabled}
                          placeholder="Name"
                          className="h-8 text-xs"
                          onChange={(e) =>
                            onUpdate(entry.id, { supervisor: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Engineer</Label>
                        <Input
                          value={entry.engineer}
                          disabled={disabled}
                          placeholder="Name"
                          className="h-8 text-xs"
                          onChange={(e) =>
                            onUpdate(entry.id, { engineer: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
