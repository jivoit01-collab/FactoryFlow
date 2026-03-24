import { useMemo } from 'react';

import { Input, Label, Switch } from '@/shared/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useConditionTypes } from '../api';
import type { ConditionParamSchema } from '../types';

interface ConditionParamsFormProps {
  conditionType: string;
  value: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

export function ConditionParamsForm({ conditionType, value, onChange }: ConditionParamsFormProps) {
  const { data: conditionTypes } = useConditionTypes();

  const schema = useMemo(() => {
    if (!conditionTypes) return [];
    const ct = conditionTypes.find((c) => c.key === conditionType);
    return ct?.params_schema ?? [];
  }, [conditionTypes, conditionType]);

  const handleParamChange = (paramName: string, paramValue: unknown) => {
    onChange({ ...value, [paramName]: paramValue });
  };

  if (schema.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        {conditionType
          ? 'This condition type has no configurable parameters'
          : 'Select a condition type to configure parameters'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.map((param) => (
        <ParamField
          key={param.name}
          param={param}
          value={value[param.name] ?? param.default_value}
          onChange={(v) => handleParamChange(param.name, v)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Individual Parameter Field Renderer
// ============================================================================

interface ParamFieldProps {
  param: ConditionParamSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

function ParamField({ param, value, onChange }: ParamFieldProps) {
  switch (param.type) {
    case 'enum':
      return (
        <div className="space-y-2">
          <Label>
            {param.label}
            {param.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <Select value={String(value ?? '')} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${param.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {param.help_text && (
            <p className="text-xs text-muted-foreground">{param.help_text}</p>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label>
            {param.label}
            {param.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <Input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === '' ? undefined : Number(v));
            }}
            placeholder={`Enter ${param.label.toLowerCase()}`}
          />
          {param.help_text && (
            <p className="text-xs text-muted-foreground">{param.help_text}</p>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>{param.label}</Label>
            {param.help_text && (
              <p className="text-xs text-muted-foreground">{param.help_text}</p>
            )}
          </div>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case 'time':
      return (
        <div className="space-y-2">
          <Label>
            {param.label}
            {param.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <Input
            type="time"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.help_text && (
            <p className="text-xs text-muted-foreground">{param.help_text}</p>
          )}
        </div>
      );

    case 'enum_multi':
      return (
        <div className="space-y-2">
          <Label>
            {param.label}
            {param.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <div className="space-y-1 rounded-lg border p-3">
            {param.options?.map((opt) => {
              const selected = Array.isArray(value) ? (value as string[]).includes(opt) : false;
              return (
                <label
                  key={opt}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted/50',
                    selected && 'bg-primary/5',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = Array.isArray(value) ? (value as string[]) : [];
                      const next = selected
                        ? current.filter((v) => v !== opt)
                        : [...current, opt];
                      onChange(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
          {param.help_text && (
            <p className="text-xs text-muted-foreground">{param.help_text}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
