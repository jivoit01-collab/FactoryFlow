import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useCreateRule, useUpdateRule, useWorkflowRule } from '../api';
import { ActionPointPicker, ConditionParamsForm, ConditionTypePicker } from '../components';
import { createRuleSchema } from '../schemas';
import type { CreateRuleFormData } from '../schemas';

const STEPS = [
  { id: 1, title: 'Action Point', description: 'What action should this rule gate?' },
  { id: 2, title: 'Condition', description: 'What condition must be met?' },
  { id: 3, title: 'Parameters', description: 'Configure the condition parameters' },
  { id: 4, title: 'Details', description: 'Name and finalize the rule' },
];

export default function RuleEditorPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(ruleId);
  const ruleIdNum = ruleId ? Number(ruleId) : null;

  const { data: existingRule, isLoading: isLoadingRule } = useWorkflowRule(ruleIdNum);
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();

  const [step, setStep] = useState(1);

  const form = useForm<CreateRuleFormData>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      action_key: '',
      condition_type: '',
      params: {},
      is_active: true,
      sort_order: 0,
    },
  });

  const { watch, setValue, handleSubmit, register, formState } = form;
  const actionKey = watch('action_key');
  const conditionType = watch('condition_type');
  const params = watch('params');
  const isActive = watch('is_active');

  // Pre-populate form when editing
  useEffect(() => {
    if (existingRule && isEditing) {
      setValue('name', existingRule.name);
      setValue('description', existingRule.description || '');
      setValue('action_key', existingRule.action_key);
      setValue('condition_type', existingRule.condition_type);
      setValue('params', existingRule.params);
      setValue('is_active', existingRule.is_active);
      setValue('sort_order', existingRule.sort_order);
    }
  }, [existingRule, isEditing, setValue]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return Boolean(actionKey);
      case 2:
        return Boolean(conditionType);
      case 3:
        return true; // params are optional
      case 4:
        return Boolean(watch('name'));
      default:
        return false;
    }
  }, [step, actionKey, conditionType, watch]);

  const onSubmit = (data: CreateRuleFormData) => {
    if (isEditing && ruleIdNum) {
      updateMutation.mutate(
        {
          id: ruleIdNum,
          data: {
            name: data.name,
            description: data.description,
            params: data.params,
            is_active: data.is_active,
            sort_order: data.sort_order,
          },
        },
        { onSuccess: () => navigate('/settings/rules') },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => navigate('/settings/rules'),
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingRule) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={isEditing ? 'Edit Rule' : 'Create Rule'}
        description={isEditing ? `Editing: ${existingRule?.name}` : 'Set up a new workflow rule'}
      >
        <Button variant="outline" onClick={() => navigate('/settings/rules')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Only allow going back, or forward if allowed
                if (s.id < step) setStep(s.id);
              }}
              disabled={s.id > step}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === s.id
                  ? 'bg-primary text-primary-foreground'
                  : s.id < step
                    ? 'bg-primary/20 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {s.id < step ? <Check className="h-4 w-4" /> : s.id}
            </button>
            <span
              className={cn(
                'hidden text-sm sm:block',
                step === s.id ? 'font-medium' : 'text-muted-foreground',
              )}
            >
              {s.title}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-px w-6 sm:w-10',
                  s.id < step ? 'bg-primary/40' : 'bg-muted',
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
            <CardDescription>{STEPS[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <ActionPointPicker
                value={actionKey}
                onChange={(key) => {
                  setValue('action_key', key);
                  // Reset condition type when action changes (unless editing)
                  if (!isEditing) {
                    setValue('condition_type', '');
                    setValue('params', {});
                  }
                }}
              />
            )}

            {step === 2 && (
              <ConditionTypePicker
                value={conditionType}
                onChange={(key) => {
                  setValue('condition_type', key);
                  // Reset params when condition type changes (unless editing)
                  if (!isEditing) {
                    setValue('params', {});
                  }
                }}
                actionKey={actionKey}
              />
            )}

            {step === 3 && (
              <ConditionParamsForm
                conditionType={conditionType}
                value={params}
                onChange={(p) => setValue('params', p)}
              />
            )}

            {step === 4 && (
              <div className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">
                    Rule Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rule-name"
                    {...register('name')}
                    placeholder="e.g., Require line clearance before production start"
                  />
                  {formState.errors.name && (
                    <p className="text-sm text-destructive">{formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    {...register('description')}
                    placeholder="Describe what this rule enforces and why"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-sort-order">Sort Order</Label>
                  <Input
                    id="rule-sort-order"
                    type="number"
                    {...register('sort_order', { valueAsNumber: true })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Rules with lower numbers are evaluated first
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive rules are not enforced
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => setValue('is_active', checked)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={!canProceed}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSaving || !canProceed}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
