import { ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

type FieldType = 'text' | 'date' | 'number' | 'textarea' | 'select' | 'checkbox';
type SelectOptionConfig = string | { label: string; value: string; disabled?: boolean };

export interface GateFormField {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  options?: SelectOptionConfig[];
  required?: boolean;
  min?: string;
  step?: string;
  defaultValue?: FormValue;
}

export interface GateFormSection {
  title: string;
  fields: GateFormField[];
}

export interface GateSubmoduleFormConfig {
  storageKey: string;
  completedEntriesKey?: string;
  title: string;
  subtitle: string;
  backPath: string;
  backLabel?: string;
  afterSavePath?: string;
  entryPrefix?: string;
  saveButtonLabel?: string;
  sections: GateFormSection[];
}

type FormValue = string | boolean;
type FormValues = Record<string, FormValue>;

function buildInitialValues(sections: GateFormSection[]): FormValues {
  return sections.reduce<FormValues>((acc, section) => {
    section.fields.forEach((field) => {
      acc[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    });
    return acc;
  }, {});
}

function readDraft(storageKey: string, fallback: FormValues): FormValues {
  const draft = window.localStorage.getItem(storageKey);
  if (!draft) return fallback;

  try {
    return { ...fallback, ...JSON.parse(draft) };
  } catch {
    return fallback;
  }
}

function buildEntryNo(prefix = 'GATE'): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${prefix}-${datePart}-${timePart}`;
}

interface GateSubmoduleFormPageProps {
  config: GateSubmoduleFormConfig;
}

export default function GateSubmoduleFormPage({ config }: GateSubmoduleFormPageProps) {
  const navigate = useNavigate();
  const emptyValues = useMemo(() => buildInitialValues(config.sections), [config.sections]);
  const [values, setValues] = useState<FormValues>(() => readDraft(config.storageKey, emptyValues));
  const [savedAt, setSavedAt] = useState<string>('');

  const updateValue = (name: string, value: FormValue) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSave = () => {
    window.localStorage.setItem(config.storageKey, JSON.stringify(values));

    if (config.completedEntriesKey) {
      const existingEntries = window.localStorage.getItem(config.completedEntriesKey);
      let parsedEntries: unknown[] = [];

      try {
        parsedEntries = existingEntries ? JSON.parse(existingEntries) : [];
      } catch {
        parsedEntries = [];
      }

      const now = new Date().toISOString();
      const entry = {
        id: `${Date.now()}`,
        entryNo: buildEntryNo(config.entryPrefix),
        status: 'COMPLETED',
        values,
        createdAt: now,
        updatedAt: now,
      };

      window.localStorage.setItem(
        config.completedEntriesKey,
        JSON.stringify([entry, ...parsedEntries]),
      );
      window.localStorage.removeItem(config.storageKey);
      setValues(emptyValues);
    }

    const savedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSavedAt(savedTime);

    if (config.afterSavePath) {
      navigate(config.afterSavePath);
    }
  };

  const handleReset = () => {
    window.localStorage.removeItem(config.storageKey);
    setValues(emptyValues);
    setSavedAt('');
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => navigate(config.backPath)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {config.backLabel || 'Gate'}
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            {config.saveButtonLabel || 'Save Draft'}
          </Button>
        </div>
      </div>

      {savedAt && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Draft saved at {savedAt}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {config.sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(value) => updateValue(field.name, value)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </form>
  );
}

interface FormFieldProps {
  field: GateFormField;
  value: FormValue;
  onChange: (value: FormValue) => void;
}

function FormField({ field, value, onChange }: FormFieldProps) {
  const fieldType = field.type ?? 'text';
  const fieldId = `gate-${field.name}`;
  const commonLabel = (
    <Label htmlFor={fieldId}>
      {field.label}
      {field.required ? <span className="ml-1 text-destructive">*</span> : null}
    </Label>
  );

  if (fieldType === 'checkbox') {
    return (
      <div className="flex items-center gap-3 rounded-md border px-3 py-2">
        <Checkbox
          id={fieldId}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
        {commonLabel}
      </div>
    );
  }

  if (fieldType === 'textarea') {
    return (
      <div className="space-y-2 sm:col-span-2">
        {commonLabel}
        <Textarea
          id={fieldId}
          value={String(value)}
          required={field.required}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      </div>
    );
  }

  if (fieldType === 'select') {
    return (
      <div className="space-y-2">
        {commonLabel}
        <NativeSelect
          id={fieldId}
          value={String(value)}
          required={field.required}
          placeholder={field.placeholder ?? 'Select'}
          onChange={(event) => onChange(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <SelectOption
              key={typeof option === 'string' ? option : option.value}
              value={typeof option === 'string' ? option : option.value}
              disabled={typeof option === 'string' ? false : option.disabled}
            >
              {typeof option === 'string' ? option : option.label}
            </SelectOption>
          ))}
        </NativeSelect>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {commonLabel}
      <Input
        id={fieldId}
        type={fieldType}
        value={String(value)}
        required={field.required}
        placeholder={field.placeholder}
        min={field.min}
        step={field.step}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
