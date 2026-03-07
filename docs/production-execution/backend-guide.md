# Production Execution Module - Backend Development Guide

> **Stack:** Django 4.2+ / Django REST Framework 3.14+
> **Database:** PostgreSQL
> **Auth:** JWT (SimpleJWT) with company-scoped tenancy
> **Django App:** `production_execution`
> **Depends on:** `production_planning` app (for ProductionPlan model), `accounts` app (for User model)

---

## Table of Contents

1. [Django App Setup](#1-django-app-setup)
2. [Models](#2-models)
3. [Serializers](#3-serializers)
4. [Views & ViewSets](#4-views--viewsets)
5. [URLs](#5-urls)
6. [Permissions](#6-permissions)
7. [Signals & Auto-Calculations](#7-signals--auto-calculations)
8. [Business Logic & Validation](#8-business-logic--validation)
9. [Admin Configuration](#9-admin-configuration)
10. [Management Commands & Seed Data](#10-management-commands--seed-data)
11. [API Endpoint Reference](#11-api-endpoint-reference)
12. [Testing Guide](#12-testing-guide)

---

## 1. Django App Setup

### Create the app

```bash
python manage.py startapp production_execution
```

### App structure

```
production_execution/
    __init__.py
    apps.py
    models/
        __init__.py              # imports all models
        master.py                # ProductionLine, Machine, ChecklistTemplate
        run.py                   # ProductionRun, ProductionLog
        breakdown.py             # MachineBreakdown
        material.py              # ProductionMaterialUsage
        machine_runtime.py       # MachineRuntime
        manpower.py              # ProductionManpower
        line_clearance.py        # LineClearance, ClearanceChecklistItem
        machine_checklist.py     # MachineChecklistEntry
        waste.py                 # WasteLog
    serializers/
        __init__.py
        master.py
        run.py
        breakdown.py
        material.py
        machine_runtime.py
        manpower.py
        line_clearance.py
        machine_checklist.py
        waste.py
        reports.py
    views/
        __init__.py
        master.py
        run.py
        breakdown.py
        material.py
        machine_runtime.py
        manpower.py
        line_clearance.py
        machine_checklist.py
        waste.py
        reports.py
        dashboard.py
    urls.py
    permissions.py
    signals.py
    services/
        __init__.py
        calculations.py          # OEE, efficiency, speed formulas
        report_generator.py      # Daily Production Report, Yield Report compilation
        waste_approval.py        # Sequential approval state machine
    filters.py
    admin.py
    tests/
        __init__.py
        test_models.py
        test_runs.py
        test_line_clearance.py
        test_breakdowns.py
        test_waste_approval.py
        test_reports.py
    management/
        commands/
            seed_checklist_templates.py
            seed_production_lines.py
    migrations/
```

### Register in settings

```python
# settings.py
INSTALLED_APPS = [
    ...
    'production_execution',
]
```

---

## 2. Models

### 2.1 Enums (choices)

```python
# models/choices.py

from django.db import models


class MachineType(models.TextChoices):
    FILLER = 'FILLER', 'Filler'
    CAPPER = 'CAPPER', 'Capper'
    CONVEYOR = 'CONVEYOR', 'Conveyor'
    LABELER = 'LABELER', 'Labeler'
    CODING = 'CODING', 'Coding'
    SHRINK_PACK = 'SHRINK_PACK', 'Shrink Pack'
    STICKER_LABELER = 'STICKER_LABELER', 'Sticker Labeler'
    TAPPING_MACHINE = 'TAPPING_MACHINE', 'Tapping Machine'


class RunStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'


class MachineStatus(models.TextChoices):
    RUNNING = 'RUNNING', 'Running'
    IDLE = 'IDLE', 'Idle'
    BREAKDOWN = 'BREAKDOWN', 'Breakdown'
    CHANGEOVER = 'CHANGEOVER', 'Changeover'


class BreakdownType(models.TextChoices):
    LINE = 'LINE', 'Line'
    EXTERNAL = 'EXTERNAL', 'External'


class ClearanceResult(models.TextChoices):
    YES = 'YES', 'Yes'
    NO = 'NO', 'No'
    NA = 'NA', 'N/A'


class ClearanceStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    CLEARED = 'CLEARED', 'Cleared'
    NOT_CLEARED = 'NOT_CLEARED', 'Not Cleared'


class ChecklistFrequency(models.TextChoices):
    DAILY = 'DAILY', 'Daily'
    WEEKLY = 'WEEKLY', 'Weekly'
    MONTHLY = 'MONTHLY', 'Monthly'


class ChecklistStatus(models.TextChoices):
    OK = 'OK', 'OK'
    NOT_OK = 'NOT_OK', 'Not OK'
    NA = 'NA', 'N/A'


class WasteApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PARTIALLY_APPROVED = 'PARTIALLY_APPROVED', 'Partially Approved'
    FULLY_APPROVED = 'FULLY_APPROVED', 'Fully Approved'
    REJECTED = 'REJECTED', 'Rejected'


class Shift(models.TextChoices):
    MORNING = 'MORNING', 'Morning'
    AFTERNOON = 'AFTERNOON', 'Afternoon'
    NIGHT = 'NIGHT', 'Night'
```

### 2.2 Master Data Models

```python
# models/master.py

import uuid
from django.db import models
from django.conf import settings
from .choices import MachineType, ChecklistFrequency


class ProductionLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='production_lines'
    )
    name = models.CharField(max_length=100)  # "Line-1", "Line-2"
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'production_line'
        ordering = ['name']
        unique_together = ['company', 'name']

    def __str__(self):
        return self.name


class Machine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='machines'
    )
    name = models.CharField(max_length=200)  # "10-Head Filler", "Tapping Machine Line-1"
    machine_type = models.CharField(max_length=30, choices=MachineType.choices)
    line = models.ForeignKey(
        ProductionLine, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='machines'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'machine'
        ordering = ['line__name', 'machine_type']

    def __str__(self):
        return f"{self.name} ({self.get_machine_type_display()})"


class ChecklistTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='checklist_templates'
    )
    machine_type = models.CharField(max_length=30, choices=MachineType.choices)
    task = models.CharField(max_length=500)
    frequency = models.CharField(max_length=10, choices=ChecklistFrequency.choices)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'checklist_template'
        ordering = ['machine_type', 'frequency', 'sort_order']

    def __str__(self):
        return f"{self.get_machine_type_display()} - {self.task} ({self.get_frequency_display()})"
```

### 2.3 Production Run & Hourly Log Models

```python
# models/run.py

import uuid
from django.db import models
from django.conf import settings
from .choices import RunStatus, MachineStatus


class ProductionRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='production_runs'
    )
    production_order = models.ForeignKey(
        'production_planning.ProductionPlan', on_delete=models.CASCADE,
        related_name='runs'
    )
    run_number = models.PositiveIntegerField()  # 1, 2, 3
    date = models.DateField()
    line = models.ForeignKey(
        'production_execution.ProductionLine', on_delete=models.PROTECT,
        related_name='runs'
    )
    brand = models.CharField(max_length=200, blank=True, default='')
    pack = models.CharField(max_length=200, blank=True, default='')
    sap_order_no = models.CharField(max_length=100, blank=True, default='')
    rated_speed = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Rated speed in units per hour'
    )

    # Calculated/summary fields (updated via signals or on save)
    total_production = models.PositiveIntegerField(default=0)
    total_minutes_pe = models.PositiveIntegerField(
        default=0, help_text='Total production equipment minutes'
    )
    total_minutes_me = models.PositiveIntegerField(
        default=0, help_text='Total machine efficiency minutes'
    )
    total_breakdown_time = models.PositiveIntegerField(default=0)
    line_breakdown_time = models.PositiveIntegerField(default=0)
    external_breakdown_time = models.PositiveIntegerField(default=0)
    unrecorded_time = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=20, choices=RunStatus.choices, default=RunStatus.DRAFT
    )

    # Signatures
    associate_sign = models.CharField(max_length=200, blank=True, default='')
    associate_signed_at = models.DateTimeField(null=True, blank=True)
    engineer_sign = models.CharField(max_length=200, blank=True, default='')
    engineer_signed_at = models.DateTimeField(null=True, blank=True)
    hod_sign = models.CharField(max_length=200, blank=True, default='')
    hod_signed_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_runs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'production_run'
        ordering = ['-date', '-run_number']
        unique_together = ['production_order', 'date', 'run_number']
        permissions = [
            ('can_view_production_run', 'Can view production run'),
            ('can_create_production_run', 'Can create production run'),
        ]

    def __str__(self):
        return f"Run #{self.run_number} - {self.brand} {self.pack} ({self.date})"

    @property
    def efficiency(self):
        """Line efficiency = actual output / theoretical max output."""
        if not self.rated_speed or not self.total_minutes_me:
            return 0
        theoretical_max = float(self.rated_speed) * (self.total_minutes_me / 60)
        if theoretical_max == 0:
            return 0
        return round((self.total_production / theoretical_max) * 100, 2)

    @property
    def actual_speed(self):
        """Cases per hour based on operating time."""
        operating_minutes = self.total_minutes_me - self.total_breakdown_time
        if operating_minutes <= 0:
            return 0
        return round(self.total_production / (operating_minutes / 60), 2)

    def recalculate_totals(self):
        """Recalculate all summary fields from child records."""
        from django.db.models import Sum

        # Total production from hourly logs
        log_agg = self.logs.aggregate(
            total_prod=Sum('produced_cases'),
            total_recd=Sum('recd_minutes'),
        )
        self.total_production = log_agg['total_prod'] or 0
        self.total_minutes_me = log_agg['total_recd'] or 0

        # Breakdown totals
        breakdown_agg = self.breakdowns.aggregate(
            total=Sum('breakdown_minutes'),
            line_total=Sum('breakdown_minutes', filter=models.Q(type='LINE')),
            ext_total=Sum('breakdown_minutes', filter=models.Q(type='EXTERNAL')),
        )
        self.total_breakdown_time = breakdown_agg['total'] or 0
        self.line_breakdown_time = breakdown_agg['line_total'] or 0
        self.external_breakdown_time = breakdown_agg['ext_total'] or 0

        self.save(update_fields=[
            'total_production', 'total_minutes_me',
            'total_breakdown_time', 'line_breakdown_time',
            'external_breakdown_time', 'updated_at',
        ])


class ProductionLog(models.Model):
    """Hourly production entry — one row per time slot."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    production_run = models.ForeignKey(
        ProductionRun, on_delete=models.CASCADE, related_name='logs'
    )
    time_slot = models.CharField(max_length=20)  # "07:00-08:00"
    time_start = models.TimeField()
    time_end = models.TimeField()
    produced_cases = models.PositiveIntegerField(default=0)
    machine_status = models.CharField(
        max_length=20, choices=MachineStatus.choices,
        default=MachineStatus.RUNNING
    )
    recd_minutes = models.PositiveIntegerField(
        default=0, help_text='Recorded minutes of actual production'
    )
    breakdown_detail = models.CharField(max_length=500, blank=True, default='')
    remarks = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'production_log'
        ordering = ['time_start']
        unique_together = ['production_run', 'time_slot']
        permissions = [
            ('can_edit_production_log', 'Can edit production log'),
            ('can_view_production_log', 'Can view production log'),
        ]

    def __str__(self):
        return f"{self.time_slot}: {self.produced_cases} cases"
```

### 2.4 Breakdown Model

```python
# models/breakdown.py

import uuid
from django.db import models
from .choices import BreakdownType


class MachineBreakdown(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    production_run = models.ForeignKey(
        'production_execution.ProductionRun', on_delete=models.CASCADE,
        related_name='breakdowns'
    )
    machine = models.ForeignKey(
        'production_execution.Machine', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='breakdowns'
    )
    machine_name = models.CharField(
        max_length=200, blank=True, default='',
        help_text='Denormalized for display. Set to "All" for line-wide breakdowns.'
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    breakdown_minutes = models.PositiveIntegerField(
        help_text='Auto-calculated from start/end, editable for overrides'
    )
    type = models.CharField(max_length=10, choices=BreakdownType.choices)
    is_unrecovered = models.BooleanField(default=False)
    reason = models.CharField(max_length=500)
    remarks = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'machine_breakdown'
        ordering = ['start_time']
        permissions = [
            ('can_view_breakdown', 'Can view breakdown'),
            ('can_create_breakdown', 'Can create breakdown'),
            ('can_edit_breakdown', 'Can edit breakdown'),
        ]

    def __str__(self):
        return f"{self.machine_name}: {self.reason} ({self.breakdown_minutes} min)"

    def save(self, *args, **kwargs):
        # Auto-calculate breakdown_minutes if not explicitly set
        if self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.breakdown_minutes = int(delta.total_seconds() / 60)
        super().save(*args, **kwargs)
```

### 2.5 Material Usage Model

```python
# models/material.py

import uuid
from django.db import models


class ProductionMaterialUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    production_run = models.ForeignKey(
        'production_execution.ProductionRun', on_delete=models.CASCADE,
        related_name='material_usages'
    )
    material_name = models.CharField(max_length=200)  # "Bottle (500gm)", "Cap"
    opening_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    issued_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wastage_qty = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Auto-calculated: opening + issued - closing'
    )
    uom = models.CharField(max_length=20, blank=True, default='PCS')
    batch_number = models.PositiveIntegerField(
        default=1, help_text='Batch/shift identifier (1, 2, 3)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'production_material_usage'
        ordering = ['batch_number', 'material_name']
        unique_together = ['production_run', 'material_name', 'batch_number']
        permissions = [
            ('can_view_material_usage', 'Can view material usage'),
            ('can_create_material_usage', 'Can create material usage'),
            ('can_edit_material_usage', 'Can edit material usage'),
        ]

    def __str__(self):
        return f"{self.material_name} (Batch {self.batch_number})"

    def save(self, *args, **kwargs):
        # Auto-calculate wastage
        self.wastage_qty = self.opening_qty + self.issued_qty - self.closing_qty
        super().save(*args, **kwargs)
```

### 2.6 Machine Runtime Model

```python
# models/machine_runtime.py

import uuid
from django.db import models
from .choices import MachineType


class MachineRuntime(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    production_run = models.ForeignKey(
        'production_execution.ProductionRun', on_delete=models.CASCADE,
        related_name='machine_runtimes'
    )
    machine = models.ForeignKey(
        'production_execution.Machine', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='runtimes'
    )
    machine_type = models.CharField(max_length=30, choices=MachineType.choices)
    runtime_minutes = models.PositiveIntegerField(default=0)
    downtime_minutes = models.PositiveIntegerField(default=0)
    remarks = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'machine_runtime'
        ordering = ['machine_type']
        unique_together = ['production_run', 'machine_type']
        permissions = [
            ('can_view_machine_runtime', 'Can view machine runtime'),
            ('can_create_machine_runtime', 'Can create machine runtime'),
        ]

    def __str__(self):
        return f"{self.get_machine_type_display()}: {self.runtime_minutes} min"
```

### 2.7 Manpower Model

```python
# models/manpower.py

import uuid
from django.db import models
from .choices import Shift


class ProductionManpower(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    production_run = models.ForeignKey(
        'production_execution.ProductionRun', on_delete=models.CASCADE,
        related_name='manpower_entries'
    )
    shift = models.CharField(max_length=10, choices=Shift.choices)
    worker_count = models.PositiveIntegerField(default=0)
    supervisor = models.CharField(max_length=200, blank=True, default='')
    engineer = models.CharField(max_length=200, blank=True, default='')
    remarks = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'production_manpower'
        ordering = ['shift']
        unique_together = ['production_run', 'shift']
        permissions = [
            ('can_view_manpower', 'Can view manpower'),
            ('can_create_manpower', 'Can create manpower'),
        ]

    def __str__(self):
        return f"{self.get_shift_display()}: {self.worker_count} workers"
```

### 2.8 Line Clearance Models

```python
# models/line_clearance.py

import uuid
from django.db import models
from django.conf import settings
from .choices import ClearanceResult, ClearanceStatus


class LineClearance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='line_clearances'
    )
    date = models.DateField()
    line = models.ForeignKey(
        'production_execution.ProductionLine', on_delete=models.PROTECT,
        related_name='clearances'
    )
    production_order = models.ForeignKey(
        'production_planning.ProductionPlan', on_delete=models.CASCADE,
        related_name='clearances'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verified_clearances'
    )

    # QA Approval
    qa_approved = models.BooleanField(default=False)
    qa_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='qa_approved_clearances'
    )
    qa_approved_at = models.DateTimeField(null=True, blank=True)

    # Signatures
    production_supervisor_sign = models.CharField(max_length=200, blank=True, default='')
    production_supervisor_signed_at = models.DateTimeField(null=True, blank=True)
    production_incharge_sign = models.CharField(max_length=200, blank=True, default='')
    production_incharge_signed_at = models.DateTimeField(null=True, blank=True)

    # Decision
    status = models.CharField(
        max_length=20, choices=ClearanceStatus.choices, default=ClearanceStatus.DRAFT
    )
    not_cleared_reason = models.TextField(blank=True, default='')

    document_id = models.CharField(
        max_length=100, blank=True, default='PRD-OIL-FRM-15-00-00-04'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_clearances'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'line_clearance'
        ordering = ['-date', '-created_at']
        permissions = [
            ('can_view_line_clearance', 'Can view line clearance'),
            ('can_create_line_clearance', 'Can create line clearance'),
            ('can_approve_line_clearance_qa', 'Can QA approve line clearance'),
        ]

    def __str__(self):
        return f"Clearance - {self.line.name} ({self.date})"


class ClearanceChecklistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clearance = models.ForeignKey(
        LineClearance, on_delete=models.CASCADE, related_name='checklist_items'
    )
    checkpoint = models.CharField(max_length=500)
    sort_order = models.PositiveIntegerField(default=0)
    result = models.CharField(
        max_length=5, choices=ClearanceResult.choices,
        null=True, blank=True
    )
    remarks = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clearance_checklist_item'
        ordering = ['sort_order']

    def __str__(self):
        return f"#{self.sort_order}: {self.checkpoint}"
```

### 2.9 Machine Checklist Entry Model

```python
# models/machine_checklist.py

import uuid
from django.db import models
from .choices import MachineType, ChecklistFrequency, ChecklistStatus


class MachineChecklistEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='checklist_entries'
    )
    machine = models.ForeignKey(
        'production_execution.Machine', on_delete=models.CASCADE,
        related_name='checklist_entries'
    )
    machine_type = models.CharField(max_length=30, choices=MachineType.choices)
    template = models.ForeignKey(
        'production_execution.ChecklistTemplate', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='entries'
    )
    task_description = models.CharField(max_length=500)  # Denormalized from template
    date = models.DateField()
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    frequency = models.CharField(max_length=10, choices=ChecklistFrequency.choices)
    status = models.CharField(max_length=10, choices=ChecklistStatus.choices)
    operator = models.CharField(max_length=200, blank=True, default='')
    shift_incharge = models.CharField(max_length=200, blank=True, default='')
    remarks = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'machine_checklist_entry'
        ordering = ['date', 'machine_type']
        unique_together = ['machine', 'template', 'date']
        permissions = [
            ('can_view_machine_checklist', 'Can view machine checklist'),
            ('can_create_machine_checklist', 'Can create machine checklist'),
            ('can_manage_checklist_template', 'Can manage checklist template'),
        ]

    def __str__(self):
        return f"{self.machine_type} - {self.task_description} ({self.date})"

    def save(self, *args, **kwargs):
        self.month = self.date.month
        self.year = self.date.year
        super().save(*args, **kwargs)
```

### 2.10 Waste Log Model

```python
# models/waste.py

import uuid
from django.db import models
from django.conf import settings
from .choices import WasteApprovalStatus


class WasteLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE,
        related_name='waste_logs'
    )
    production_run = models.ForeignKey(
        'production_execution.ProductionRun', on_delete=models.CASCADE,
        related_name='waste_logs'
    )
    material_name = models.CharField(max_length=200)
    wastage_qty = models.DecimalField(max_digits=12, decimal_places=2)
    uom = models.CharField(max_length=20, default='PCS')
    reason = models.TextField()

    # Sequential approval chain
    engineer_sign = models.CharField(max_length=200, blank=True, default='')
    engineer_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waste_engineer_approvals'
    )
    engineer_signed_at = models.DateTimeField(null=True, blank=True)
    engineer_remarks = models.TextField(blank=True, default='')

    am_sign = models.CharField(max_length=200, blank=True, default='')
    am_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waste_am_approvals'
    )
    am_signed_at = models.DateTimeField(null=True, blank=True)
    am_remarks = models.TextField(blank=True, default='')

    store_sign = models.CharField(max_length=200, blank=True, default='')
    store_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waste_store_approvals'
    )
    store_signed_at = models.DateTimeField(null=True, blank=True)
    store_remarks = models.TextField(blank=True, default='')

    hod_sign = models.CharField(max_length=200, blank=True, default='')
    hod_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waste_hod_approvals'
    )
    hod_signed_at = models.DateTimeField(null=True, blank=True)
    hod_remarks = models.TextField(blank=True, default='')

    wastage_approval_status = models.CharField(
        max_length=25, choices=WasteApprovalStatus.choices,
        default=WasteApprovalStatus.PENDING
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waste_rejections'
    )
    rejection_reason = models.TextField(blank=True, default='')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_waste_logs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'waste_log'
        ordering = ['-created_at']
        permissions = [
            ('can_view_waste_log', 'Can view waste log'),
            ('can_create_waste_log', 'Can create waste log'),
            ('can_approve_waste_engineer', 'Can approve waste as engineer'),
            ('can_approve_waste_am', 'Can approve waste as AM'),
            ('can_approve_waste_store', 'Can approve waste as store'),
            ('can_approve_waste_hod', 'Can approve waste as HOD'),
        ]

    def __str__(self):
        return f"{self.material_name}: {self.wastage_qty} {self.uom}"

    @property
    def current_approval_step(self):
        """Returns which approval step is currently pending."""
        if not self.engineer_sign:
            return 'engineer'
        if not self.am_sign:
            return 'am'
        if not self.store_sign:
            return 'store'
        if not self.hod_sign:
            return 'hod'
        return 'complete'

    def update_approval_status(self):
        """Update the overall approval status based on signatures."""
        if self.wastage_approval_status == WasteApprovalStatus.REJECTED:
            return  # Don't change rejected status

        if self.hod_sign:
            self.wastage_approval_status = WasteApprovalStatus.FULLY_APPROVED
        elif self.engineer_sign or self.am_sign or self.store_sign:
            self.wastage_approval_status = WasteApprovalStatus.PARTIALLY_APPROVED
        else:
            self.wastage_approval_status = WasteApprovalStatus.PENDING
```

### 2.11 Models `__init__.py`

```python
# models/__init__.py

from .choices import *
from .master import ProductionLine, Machine, ChecklistTemplate
from .run import ProductionRun, ProductionLog
from .breakdown import MachineBreakdown
from .material import ProductionMaterialUsage
from .machine_runtime import MachineRuntime
from .manpower import ProductionManpower
from .line_clearance import LineClearance, ClearanceChecklistItem
from .machine_checklist import MachineChecklistEntry
from .waste import WasteLog
```

---

## 3. Serializers

### 3.1 Master Data Serializers

```python
# serializers/master.py

from rest_framework import serializers
from ..models import ProductionLine, Machine, ChecklistTemplate


class ProductionLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionLine
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id']


class MachineSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='line.name', read_only=True)

    class Meta:
        model = Machine
        fields = ['id', 'name', 'machine_type', 'line', 'line_name', 'is_active']
        read_only_fields = ['id']


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistTemplate
        fields = ['id', 'machine_type', 'task', 'frequency', 'sort_order', 'is_active']
        read_only_fields = ['id']
```

### 3.2 Production Run Serializers

```python
# serializers/run.py

from rest_framework import serializers
from ..models import ProductionRun, ProductionLog


class ProductionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionLog
        fields = [
            'id', 'time_slot', 'time_start', 'time_end',
            'produced_cases', 'machine_status', 'recd_minutes',
            'breakdown_detail', 'remarks',
        ]
        read_only_fields = ['id']


class ProductionRunListSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='line.name', read_only=True)
    efficiency = serializers.ReadOnlyField()
    actual_speed = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )

    class Meta:
        model = ProductionRun
        fields = [
            'id', 'production_order', 'run_number', 'date',
            'line', 'line_name', 'brand', 'pack', 'sap_order_no',
            'rated_speed', 'total_production', 'total_breakdown_time',
            'status', 'efficiency', 'actual_speed',
            'created_by_name', 'created_at',
        ]


class ProductionRunDetailSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='line.name', read_only=True)
    efficiency = serializers.ReadOnlyField()
    actual_speed = serializers.ReadOnlyField()
    logs = ProductionLogSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )

    class Meta:
        model = ProductionRun
        fields = [
            'id', 'production_order', 'run_number', 'date',
            'line', 'line_name', 'brand', 'pack', 'sap_order_no',
            'rated_speed', 'total_production', 'total_minutes_pe',
            'total_minutes_me', 'total_breakdown_time',
            'line_breakdown_time', 'external_breakdown_time',
            'unrecorded_time', 'status', 'efficiency', 'actual_speed',
            'associate_sign', 'associate_signed_at',
            'engineer_sign', 'engineer_signed_at',
            'hod_sign', 'hod_signed_at',
            'logs', 'created_by_name', 'created_at', 'updated_at',
        ]


class CreateProductionRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionRun
        fields = [
            'production_order', 'date', 'line', 'sap_order_no',
            'rated_speed', 'brand', 'pack',
        ]

    def validate(self, data):
        # Auto-assign run_number
        existing_runs = ProductionRun.objects.filter(
            production_order=data['production_order'],
            date=data['date'],
        ).count()
        data['run_number'] = existing_runs + 1

        # Validate line clearance exists
        from ..models import LineClearance, ClearanceStatus
        clearance_exists = LineClearance.objects.filter(
            production_order=data['production_order'],
            line=data['line'],
            status=ClearanceStatus.CLEARED,
        ).exists()
        if not clearance_exists:
            raise serializers.ValidationError({
                'line': 'No approved line clearance found for this order and line. '
                        'Complete line clearance before starting production.'
            })

        return data

    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user.company
        validated_data['created_by'] = self.context['request'].user
        validated_data['status'] = 'IN_PROGRESS'
        return super().create(validated_data)


class BulkProductionLogSerializer(serializers.Serializer):
    """For saving all 12 time slots at once."""
    logs = ProductionLogSerializer(many=True)

    def create(self, validated_data):
        run = self.context['run']
        logs = validated_data['logs']
        created = []
        for log_data in logs:
            obj, _ = ProductionLog.objects.update_or_create(
                production_run=run,
                time_slot=log_data['time_slot'],
                defaults=log_data,
            )
            created.append(obj)
        # Recalculate run totals
        run.recalculate_totals()
        return created
```

### 3.3 Breakdown Serializer

```python
# serializers/breakdown.py

from rest_framework import serializers
from ..models import MachineBreakdown


class MachineBreakdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineBreakdown
        fields = [
            'id', 'machine', 'machine_name', 'start_time', 'end_time',
            'breakdown_minutes', 'type', 'is_unrecovered', 'reason',
            'remarks', 'created_at',
        ]
        read_only_fields = ['id', 'breakdown_minutes', 'created_at']

    def validate(self, data):
        if data.get('end_time') and data.get('start_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time.'
                })
        # Denormalize machine name
        if data.get('machine'):
            data['machine_name'] = data['machine'].name
        elif not data.get('machine_name'):
            data['machine_name'] = 'All'
        return data
```

### 3.4 Material Usage Serializer

```python
# serializers/material.py

from rest_framework import serializers
from ..models import ProductionMaterialUsage


class ProductionMaterialUsageSerializer(serializers.ModelSerializer):
    wastage_qty = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ProductionMaterialUsage
        fields = [
            'id', 'material_name', 'opening_qty', 'issued_qty',
            'closing_qty', 'wastage_qty', 'uom', 'batch_number',
        ]
        read_only_fields = ['id', 'wastage_qty']
```

### 3.5 Machine Runtime Serializer

```python
# serializers/machine_runtime.py

from rest_framework import serializers
from ..models import MachineRuntime


class MachineRuntimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineRuntime
        fields = [
            'id', 'machine', 'machine_type', 'runtime_minutes',
            'downtime_minutes', 'remarks',
        ]
        read_only_fields = ['id']
```

### 3.6 Manpower Serializer

```python
# serializers/manpower.py

from rest_framework import serializers
from ..models import ProductionManpower


class ProductionManpowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionManpower
        fields = [
            'id', 'shift', 'worker_count', 'supervisor', 'engineer', 'remarks',
        ]
        read_only_fields = ['id']
```

### 3.7 Line Clearance Serializers

```python
# serializers/line_clearance.py

from rest_framework import serializers
from ..models import LineClearance, ClearanceChecklistItem


class ClearanceChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClearanceChecklistItem
        fields = ['id', 'checkpoint', 'sort_order', 'result', 'remarks']
        read_only_fields = ['id']


class LineClearanceListSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='line.name', read_only=True)
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', read_only=True
    )
    checklist_summary = serializers.SerializerMethodField()

    class Meta:
        model = LineClearance
        fields = [
            'id', 'date', 'line', 'line_name', 'production_order',
            'status', 'qa_approved', 'verified_by_name',
            'document_id', 'checklist_summary', 'created_at',
        ]

    def get_checklist_summary(self, obj):
        items = obj.checklist_items.all()
        total = items.count()
        yes_count = items.filter(result='YES').count()
        return {'total': total, 'yes_count': yes_count}


class LineClearanceDetailSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='line.name', read_only=True)
    checklist_items = ClearanceChecklistItemSerializer(many=True, read_only=True)
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', read_only=True
    )
    qa_approved_by_name = serializers.CharField(
        source='qa_approved_by.get_full_name', read_only=True
    )

    class Meta:
        model = LineClearance
        fields = [
            'id', 'date', 'line', 'line_name', 'production_order',
            'status', 'qa_approved', 'qa_approved_by', 'qa_approved_by_name',
            'qa_approved_at', 'verified_by', 'verified_by_name',
            'production_supervisor_sign', 'production_supervisor_signed_at',
            'production_incharge_sign', 'production_incharge_signed_at',
            'not_cleared_reason', 'document_id',
            'checklist_items', 'created_at', 'updated_at',
        ]


class CreateLineClearanceSerializer(serializers.ModelSerializer):
    checklist_items = ClearanceChecklistItemSerializer(many=True)

    class Meta:
        model = LineClearance
        fields = [
            'date', 'line', 'production_order', 'document_id',
            'checklist_items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('checklist_items')
        user = self.context['request'].user
        validated_data['company'] = user.company
        validated_data['created_by'] = user
        validated_data['verified_by'] = user
        clearance = LineClearance.objects.create(**validated_data)
        for item_data in items_data:
            ClearanceChecklistItem.objects.create(clearance=clearance, **item_data)
        return clearance


class LineClearanceApprovalSerializer(serializers.Serializer):
    approved = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, default='')
```

### 3.8 Machine Checklist Serializers

```python
# serializers/machine_checklist.py

from rest_framework import serializers
from ..models import MachineChecklistEntry


class MachineChecklistEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineChecklistEntry
        fields = [
            'id', 'machine', 'machine_type', 'template',
            'task_description', 'date', 'month', 'year',
            'frequency', 'status', 'operator', 'shift_incharge',
            'remarks',
        ]
        read_only_fields = ['id', 'month', 'year']


class BulkChecklistSerializer(serializers.Serializer):
    """Save an entire month's checklist in one request."""
    entries = MachineChecklistEntrySerializer(many=True)

    def create(self, validated_data):
        company = self.context['request'].user.company
        results = []
        for entry_data in validated_data['entries']:
            obj, _ = MachineChecklistEntry.objects.update_or_create(
                company=company,
                machine=entry_data['machine'],
                template=entry_data.get('template'),
                date=entry_data['date'],
                defaults={
                    'machine_type': entry_data['machine_type'],
                    'task_description': entry_data['task_description'],
                    'frequency': entry_data['frequency'],
                    'status': entry_data['status'],
                    'operator': entry_data.get('operator', ''),
                    'shift_incharge': entry_data.get('shift_incharge', ''),
                    'remarks': entry_data.get('remarks', ''),
                },
            )
            results.append(obj)
        return results
```

### 3.9 Waste Log Serializers

```python
# serializers/waste.py

from rest_framework import serializers
from ..models import WasteLog


class WasteLogListSerializer(serializers.ModelSerializer):
    run_brand = serializers.CharField(source='production_run.brand', read_only=True)
    run_pack = serializers.CharField(source='production_run.pack', read_only=True)
    run_number = serializers.IntegerField(source='production_run.run_number', read_only=True)
    current_approval_step = serializers.ReadOnlyField()

    class Meta:
        model = WasteLog
        fields = [
            'id', 'production_run', 'run_brand', 'run_pack', 'run_number',
            'material_name', 'wastage_qty', 'uom', 'reason',
            'engineer_sign', 'engineer_signed_at',
            'am_sign', 'am_signed_at',
            'store_sign', 'store_signed_at',
            'hod_sign', 'hod_signed_at',
            'wastage_approval_status', 'current_approval_step',
            'created_at',
        ]


class WasteLogDetailSerializer(serializers.ModelSerializer):
    run_brand = serializers.CharField(source='production_run.brand', read_only=True)
    run_pack = serializers.CharField(source='production_run.pack', read_only=True)
    current_approval_step = serializers.ReadOnlyField()

    class Meta:
        model = WasteLog
        fields = [
            'id', 'production_run', 'run_brand', 'run_pack',
            'material_name', 'wastage_qty', 'uom', 'reason',
            'engineer_sign', 'engineer_signed_by', 'engineer_signed_at', 'engineer_remarks',
            'am_sign', 'am_signed_by', 'am_signed_at', 'am_remarks',
            'store_sign', 'store_signed_by', 'store_signed_at', 'store_remarks',
            'hod_sign', 'hod_signed_by', 'hod_signed_at', 'hod_remarks',
            'wastage_approval_status', 'current_approval_step',
            'rejected_by', 'rejection_reason',
            'created_by', 'created_at', 'updated_at',
        ]


class CreateWasteLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteLog
        fields = [
            'production_run', 'material_name', 'wastage_qty', 'uom', 'reason',
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['company'] = user.company
        validated_data['created_by'] = user
        return super().create(validated_data)


class WasteApprovalSerializer(serializers.Serializer):
    approved = serializers.BooleanField()
    remarks = serializers.CharField(required=False, allow_blank=True, default='')
```

### 3.10 Report Serializers

```python
# serializers/reports.py

from rest_framework import serializers


class DailyProductionReportSerializer(serializers.Serializer):
    """Read-only serializer for the compiled Daily Production Report."""
    date = serializers.DateField()
    brand = serializers.CharField()
    pack = serializers.CharField()
    line_name = serializers.CharField()
    sap_order_no = serializers.CharField()
    total_production = serializers.IntegerField()
    rated_speed = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_minutes_pe = serializers.IntegerField()
    total_minutes_me = serializers.IntegerField()
    total_breakdown_time = serializers.IntegerField()
    line_breakdown_time = serializers.IntegerField()
    external_breakdown_time = serializers.IntegerField()
    unrecorded_time = serializers.IntegerField()
    manpower = serializers.IntegerField()
    efficiency = serializers.DecimalField(max_digits=6, decimal_places=2)
    actual_speed = serializers.DecimalField(max_digits=10, decimal_places=2)
    runs = serializers.ListField()
    hourly_logs = serializers.ListField()
    signatures = serializers.DictField()


class YieldReportSerializer(serializers.Serializer):
    """Read-only serializer for the compiled Yield Report."""
    run_id = serializers.UUIDField()
    brand = serializers.CharField()
    pack = serializers.CharField()
    date = serializers.DateField()
    line_name = serializers.CharField()
    machine_runtimes = serializers.ListField()
    material_usages = serializers.ListField()  # Grouped by batch_number
    manpower = serializers.ListField()
    total_machine_time = serializers.IntegerField()
    total_wastage = serializers.DictField()  # Per material
    signatures = serializers.DictField()


class AnalyticsSerializer(serializers.Serializer):
    """OEE and efficiency analytics."""
    oee = serializers.DecimalField(max_digits=6, decimal_places=2)
    availability = serializers.DecimalField(max_digits=6, decimal_places=2)
    performance = serializers.DecimalField(max_digits=6, decimal_places=2)
    quality = serializers.DecimalField(max_digits=6, decimal_places=2)
    line_efficiency = serializers.DecimalField(max_digits=6, decimal_places=2)
    material_loss_pct = serializers.DecimalField(max_digits=6, decimal_places=2)
    downtime_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    production_vs_plan_pct = serializers.DecimalField(max_digits=6, decimal_places=2)


class DashboardSummarySerializer(serializers.Serializer):
    """Execution dashboard summary data."""
    todays_production = serializers.IntegerField()
    active_runs = serializers.IntegerField()
    total_breakdown_minutes = serializers.IntegerField()
    line_efficiency = serializers.DecimalField(max_digits=6, decimal_places=2)
    pending_clearances = serializers.IntegerField()
    pending_waste_approvals = serializers.IntegerField()
    overdue_checklists = serializers.IntegerField()
```

---

## 4. Views & ViewSets

### 4.1 Master Data Views

```python
# views/master.py

from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from ..models import ProductionLine, Machine, ChecklistTemplate
from ..serializers.master import (
    ProductionLineSerializer, MachineSerializer, ChecklistTemplateSerializer,
)


class ProductionLineViewSet(viewsets.ModelViewSet):
    serializer_class = ProductionLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active']

    def get_queryset(self):
        return ProductionLine.objects.filter(
            company=self.request.user.company
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class MachineViewSet(viewsets.ModelViewSet):
    serializer_class = MachineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['machine_type', 'line', 'is_active']

    def get_queryset(self):
        return Machine.objects.filter(
            company=self.request.user.company
        ).select_related('line')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['machine_type', 'frequency', 'is_active']

    def get_queryset(self):
        return ChecklistTemplate.objects.filter(
            company=self.request.user.company
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
```

### 4.2 Production Run Views

```python
# views/run.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from ..models import ProductionRun, ProductionLog, RunStatus
from ..serializers.run import (
    ProductionRunListSerializer, ProductionRunDetailSerializer,
    CreateProductionRunSerializer, ProductionLogSerializer,
    BulkProductionLogSerializer,
)


class ProductionRunViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['date', 'line', 'status', 'production_order']

    def get_queryset(self):
        return ProductionRun.objects.filter(
            company=self.request.user.company
        ).select_related('line', 'created_by')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateProductionRunSerializer
        if self.action in ['retrieve']:
            return ProductionRunDetailSerializer
        return ProductionRunListSerializer

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a run as completed. Triggers summary recalculation."""
        run = self.get_object()
        if run.status == RunStatus.COMPLETED:
            return Response(
                {'detail': 'Run is already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        run.recalculate_totals()
        run.status = RunStatus.COMPLETED
        run.save(update_fields=['status', 'updated_at'])
        return Response(ProductionRunDetailSerializer(run).data)

    @action(detail=True, methods=['post'], url_path='sign/(?P<role>[a-z]+)')
    def sign(self, request, pk=None, role=None):
        """Sign the production run report as associate/engineer/hod."""
        run = self.get_object()
        valid_roles = ['associate', 'engineer', 'hod']
        if role not in valid_roles:
            return Response(
                {'detail': f'Invalid role. Must be one of: {valid_roles}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sign_field = f'{role}_sign'
        signed_at_field = f'{role}_signed_at'
        setattr(run, sign_field, request.user.get_full_name())
        setattr(run, signed_at_field, timezone.now())
        run.save(update_fields=[sign_field, signed_at_field, 'updated_at'])
        return Response(ProductionRunDetailSerializer(run).data)


class ProductionLogViewSet(viewsets.ModelViewSet):
    """Nested under /runs/:runId/logs/"""
    serializer_class = ProductionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProductionLog.objects.filter(
            production_run_id=self.kwargs['run_pk'],
            production_run__company=self.request.user.company,
        )

    def perform_create(self, serializer):
        serializer.save(production_run_id=self.kwargs['run_pk'])

    def perform_update(self, serializer):
        instance = serializer.save()
        # Recalculate run totals on every log update
        instance.production_run.recalculate_totals()

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_save(self, request, run_pk=None):
        """Save all 12 hourly slots in one request."""
        run = ProductionRun.objects.get(
            pk=run_pk, company=request.user.company
        )
        serializer = BulkProductionLogSerializer(
            data=request.data, context={'run': run, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        logs = serializer.save()
        return Response(
            ProductionLogSerializer(logs, many=True).data,
            status=status.HTTP_200_OK,
        )
```

### 4.3 Breakdown Views

```python
# views/breakdown.py

from rest_framework import viewsets, permissions
from ..models import MachineBreakdown
from ..serializers.breakdown import MachineBreakdownSerializer


class MachineBreakdownViewSet(viewsets.ModelViewSet):
    """Nested under /runs/:runId/breakdowns/"""
    serializer_class = MachineBreakdownSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MachineBreakdown.objects.filter(
            production_run_id=self.kwargs['run_pk'],
            production_run__company=self.request.user.company,
        ).select_related('machine')

    def perform_create(self, serializer):
        instance = serializer.save(production_run_id=self.kwargs['run_pk'])
        instance.production_run.recalculate_totals()

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.production_run.recalculate_totals()

    def perform_destroy(self, instance):
        run = instance.production_run
        instance.delete()
        run.recalculate_totals()
```

### 4.4 Material, Runtime, Manpower Views

```python
# views/material.py

from rest_framework import viewsets, permissions
from ..models import ProductionMaterialUsage
from ..serializers.material import ProductionMaterialUsageSerializer


class ProductionMaterialUsageViewSet(viewsets.ModelViewSet):
    """Nested under /runs/:runId/materials/"""
    serializer_class = ProductionMaterialUsageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProductionMaterialUsage.objects.filter(
            production_run_id=self.kwargs['run_pk'],
            production_run__company=self.request.user.company,
        )

    def perform_create(self, serializer):
        serializer.save(production_run_id=self.kwargs['run_pk'])
```

```python
# views/machine_runtime.py

from rest_framework import viewsets, permissions
from ..models import MachineRuntime
from ..serializers.machine_runtime import MachineRuntimeSerializer


class MachineRuntimeViewSet(viewsets.ModelViewSet):
    """Nested under /runs/:runId/machine-runtime/"""
    serializer_class = MachineRuntimeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MachineRuntime.objects.filter(
            production_run_id=self.kwargs['run_pk'],
            production_run__company=self.request.user.company,
        ).select_related('machine')

    def perform_create(self, serializer):
        serializer.save(production_run_id=self.kwargs['run_pk'])
```

```python
# views/manpower.py

from rest_framework import viewsets, permissions
from ..models import ProductionManpower
from ..serializers.manpower import ProductionManpowerSerializer


class ProductionManpowerViewSet(viewsets.ModelViewSet):
    """Nested under /runs/:runId/manpower/"""
    serializer_class = ProductionManpowerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProductionManpower.objects.filter(
            production_run_id=self.kwargs['run_pk'],
            production_run__company=self.request.user.company,
        )

    def perform_create(self, serializer):
        serializer.save(production_run_id=self.kwargs['run_pk'])
```

### 4.5 Line Clearance Views

```python
# views/line_clearance.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from ..models import LineClearance, ClearanceStatus
from ..serializers.line_clearance import (
    LineClearanceListSerializer, LineClearanceDetailSerializer,
    CreateLineClearanceSerializer, LineClearanceApprovalSerializer,
    ClearanceChecklistItemSerializer,
)


class LineClearanceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['date', 'line', 'status', 'production_order']

    def get_queryset(self):
        return LineClearance.objects.filter(
            company=self.request.user.company
        ).select_related('line', 'verified_by', 'qa_approved_by')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateLineClearanceSerializer
        if self.action == 'retrieve':
            return LineClearanceDetailSerializer
        return LineClearanceListSerializer

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit clearance for QA approval."""
        clearance = self.get_object()
        if clearance.status != ClearanceStatus.DRAFT:
            return Response(
                {'detail': 'Only draft clearances can be submitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Validate all checklist items have a result
        unfilled = clearance.checklist_items.filter(result__isnull=True).count()
        if unfilled > 0:
            return Response(
                {'detail': f'{unfilled} checklist items are not filled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        clearance.status = ClearanceStatus.SUBMITTED
        clearance.save(update_fields=['status', 'updated_at'])
        return Response(LineClearanceDetailSerializer(clearance).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """QA officer approves or rejects the clearance."""
        clearance = self.get_object()
        serializer = LineClearanceApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if clearance.status != ClearanceStatus.SUBMITTED:
            return Response(
                {'detail': 'Only submitted clearances can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if serializer.validated_data['approved']:
            clearance.status = ClearanceStatus.CLEARED
            clearance.qa_approved = True
        else:
            clearance.status = ClearanceStatus.NOT_CLEARED
            clearance.qa_approved = False
            clearance.not_cleared_reason = serializer.validated_data.get('reason', '')

        clearance.qa_approved_by = request.user
        clearance.qa_approved_at = timezone.now()
        clearance.save()
        return Response(LineClearanceDetailSerializer(clearance).data)
```

### 4.6 Machine Checklist Views

```python
# views/machine_checklist.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from ..models import MachineChecklistEntry
from ..serializers.machine_checklist import (
    MachineChecklistEntrySerializer, BulkChecklistSerializer,
)


class MachineChecklistViewSet(viewsets.ModelViewSet):
    serializer_class = MachineChecklistEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['machine_type', 'machine', 'month', 'year', 'frequency']

    def get_queryset(self):
        return MachineChecklistEntry.objects.filter(
            company=self.request.user.company
        ).select_related('machine', 'template')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """Save an entire month's checklist at once (calendar save)."""
        serializer = BulkChecklistSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            MachineChecklistEntrySerializer(results, many=True).data,
            status=status.HTTP_200_OK,
        )
```

### 4.7 Waste Management Views

```python
# views/waste.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from ..models import WasteLog, WasteApprovalStatus
from ..serializers.waste import (
    WasteLogListSerializer, WasteLogDetailSerializer,
    CreateWasteLogSerializer, WasteApprovalSerializer,
)


class WasteLogViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['production_run', 'wastage_approval_status']

    def get_queryset(self):
        return WasteLog.objects.filter(
            company=self.request.user.company
        ).select_related('production_run', 'created_by')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateWasteLogSerializer
        if self.action == 'retrieve':
            return WasteLogDetailSerializer
        return WasteLogListSerializer

    def _approve(self, request, pk, role):
        """Generic approval handler for sequential approval chain."""
        waste = self.get_object()
        serializer = WasteApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validate correct step in approval chain
        if waste.current_approval_step != role:
            return Response(
                {'detail': f'Cannot approve as {role}. '
                           f'Current step is: {waste.current_approval_step}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if waste.wastage_approval_status == WasteApprovalStatus.REJECTED:
            return Response(
                {'detail': 'This waste log has been rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if serializer.validated_data['approved']:
            setattr(waste, f'{role}_sign', request.user.get_full_name())
            setattr(waste, f'{role}_signed_by', request.user)
            setattr(waste, f'{role}_signed_at', timezone.now())
            setattr(waste, f'{role}_remarks', serializer.validated_data.get('remarks', ''))
            waste.update_approval_status()
            waste.save()
        else:
            # Rejection stops the chain
            waste.wastage_approval_status = WasteApprovalStatus.REJECTED
            waste.rejected_by = request.user
            waste.rejection_reason = serializer.validated_data.get('remarks', '')
            waste.save()

        return Response(WasteLogDetailSerializer(waste).data)

    @action(detail=True, methods=['post'], url_path='approve/engineer')
    def approve_engineer(self, request, pk=None):
        return self._approve(request, pk, 'engineer')

    @action(detail=True, methods=['post'], url_path='approve/am')
    def approve_am(self, request, pk=None):
        return self._approve(request, pk, 'am')

    @action(detail=True, methods=['post'], url_path='approve/store')
    def approve_store(self, request, pk=None):
        return self._approve(request, pk, 'store')

    @action(detail=True, methods=['post'], url_path='approve/hod')
    def approve_hod(self, request, pk=None):
        return self._approve(request, pk, 'hod')
```

### 4.8 Dashboard View

```python
# views/dashboard.py

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q
from ..models import (
    ProductionRun, LineClearance, WasteLog,
    MachineChecklistEntry, RunStatus, ClearanceStatus,
    WasteApprovalStatus,
)
from ..serializers.reports import DashboardSummarySerializer


class ExecutionDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = request.user.company
        today = timezone.now().date()

        # Today's runs
        today_runs = ProductionRun.objects.filter(company=company, date=today)
        active_runs = today_runs.filter(status=RunStatus.IN_PROGRESS).count()

        # Aggregates
        agg = today_runs.aggregate(
            total_production=Sum('total_production'),
            total_breakdown=Sum('total_breakdown_time'),
        )

        # Efficiency (average across active runs)
        active_run_objects = today_runs.filter(status=RunStatus.IN_PROGRESS)
        efficiencies = [r.efficiency for r in active_run_objects if r.efficiency > 0]
        avg_efficiency = sum(efficiencies) / len(efficiencies) if efficiencies else 0

        # Pending items
        pending_clearances = LineClearance.objects.filter(
            company=company, status=ClearanceStatus.DRAFT,
        ).count()

        pending_waste = WasteLog.objects.filter(
            company=company,
            wastage_approval_status__in=[
                WasteApprovalStatus.PENDING,
                WasteApprovalStatus.PARTIALLY_APPROVED,
            ],
        ).count()

        # Overdue checklists (daily items not filled for today)
        overdue = 0  # Calculated by comparing templates vs entries for today

        data = {
            'todays_production': agg['total_production'] or 0,
            'active_runs': active_runs,
            'total_breakdown_minutes': agg['total_breakdown'] or 0,
            'line_efficiency': round(avg_efficiency, 2),
            'pending_clearances': pending_clearances,
            'pending_waste_approvals': pending_waste,
            'overdue_checklists': overdue,
        }
        serializer = DashboardSummarySerializer(data)
        return Response(serializer.data)
```

### 4.9 Report Views

```python
# views/reports.py

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Avg, F, Q
from datetime import datetime, timedelta
from ..models import (
    ProductionRun, ProductionLog, MachineBreakdown,
    ProductionMaterialUsage, MachineRuntime, ProductionManpower,
    RunStatus,
)
from ..serializers.run import ProductionLogSerializer
from ..serializers.material import ProductionMaterialUsageSerializer
from ..serializers.machine_runtime import MachineRuntimeSerializer
from ..serializers.manpower import ProductionManpowerSerializer
from ..services.calculations import calculate_oee


class DailyProductionReportView(APIView):
    """Compile the Daily Production Report for a given date and optional line."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        line_id = request.query_params.get('line')

        if not date_str:
            return Response(
                {'detail': 'date parameter is required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        runs_qs = ProductionRun.objects.filter(
            company=request.user.company, date=date,
        ).select_related('line')

        if line_id:
            runs_qs = runs_qs.filter(line_id=line_id)

        runs = list(runs_qs)
        if not runs:
            return Response({'detail': 'No production runs found for this date.'}, status=404)

        # Compile report for first run (or aggregate across runs)
        primary_run = runs[0]
        logs = ProductionLog.objects.filter(
            production_run__in=runs
        ).order_by('time_start')

        manpower_entries = ProductionManpower.objects.filter(
            production_run__in=runs
        )
        total_workers = manpower_entries.aggregate(
            total=Sum('worker_count')
        )['total'] or 0

        report = {
            'date': date,
            'brand': primary_run.brand,
            'pack': primary_run.pack,
            'line_name': primary_run.line.name,
            'sap_order_no': primary_run.sap_order_no,
            'total_production': sum(r.total_production for r in runs),
            'rated_speed': primary_run.rated_speed,
            'total_minutes_pe': sum(r.total_minutes_pe for r in runs),
            'total_minutes_me': sum(r.total_minutes_me for r in runs),
            'total_breakdown_time': sum(r.total_breakdown_time for r in runs),
            'line_breakdown_time': sum(r.line_breakdown_time for r in runs),
            'external_breakdown_time': sum(r.external_breakdown_time for r in runs),
            'unrecorded_time': sum(r.unrecorded_time for r in runs),
            'manpower': total_workers,
            'efficiency': primary_run.efficiency,
            'actual_speed': primary_run.actual_speed,
            'runs': [
                {'run_number': r.run_number, 'status': r.status}
                for r in runs
            ],
            'hourly_logs': ProductionLogSerializer(logs, many=True).data,
            'signatures': {
                'associate': primary_run.associate_sign,
                'engineer': primary_run.engineer_sign,
                'hod': primary_run.hod_sign,
            },
        }
        return Response(report)


class YieldReportView(APIView):
    """Compile the Yield Report for a specific production run."""
    permission_classes = [IsAuthenticated]

    def get(self, request, run_pk):
        try:
            run = ProductionRun.objects.select_related('line').get(
                pk=run_pk, company=request.user.company,
            )
        except ProductionRun.DoesNotExist:
            return Response({'detail': 'Run not found.'}, status=404)

        materials = ProductionMaterialUsage.objects.filter(
            production_run=run
        ).order_by('batch_number', 'material_name')

        runtimes = MachineRuntime.objects.filter(production_run=run)
        manpower = ProductionManpower.objects.filter(production_run=run)

        # Group materials by batch
        batches = {}
        for m in materials:
            batch = m.batch_number
            if batch not in batches:
                batches[batch] = []
            batches[batch].append(ProductionMaterialUsageSerializer(m).data)

        # Total wastage per material
        total_wastage = {}
        for m in materials:
            if m.material_name not in total_wastage:
                total_wastage[m.material_name] = 0
            total_wastage[m.material_name] += float(m.wastage_qty)

        total_machine_time = sum(r.runtime_minutes for r in runtimes)

        report = {
            'run_id': run.id,
            'brand': run.brand,
            'pack': run.pack,
            'date': run.date,
            'line_name': run.line.name,
            'machine_runtimes': MachineRuntimeSerializer(runtimes, many=True).data,
            'material_usages': batches,
            'manpower': ProductionManpowerSerializer(manpower, many=True).data,
            'total_machine_time': total_machine_time,
            'total_wastage': total_wastage,
            'signatures': {
                'engineer': run.engineer_sign,
                'associate': run.associate_sign,
                'hod': run.hod_sign,
            },
        }
        return Response(report)


class AnalyticsView(APIView):
    """OEE, efficiency, and production analytics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = request.user.company
        days = int(request.query_params.get('days', 7))
        line_id = request.query_params.get('line')
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)

        runs_qs = ProductionRun.objects.filter(
            company=company,
            date__gte=start_date,
            date__lte=end_date,
            status=RunStatus.COMPLETED,
        )
        if line_id:
            runs_qs = runs_qs.filter(line_id=line_id)

        runs = list(runs_qs)
        analytics = calculate_oee(runs)

        # Material loss
        materials = ProductionMaterialUsage.objects.filter(
            production_run__in=runs
        )
        total_used = sum(
            float(m.opening_qty + m.issued_qty) for m in materials
        ) or 1
        total_waste = sum(float(m.wastage_qty) for m in materials)
        material_loss_pct = round((total_waste / total_used) * 100, 2)

        # Production vs plan
        total_produced = sum(r.total_production for r in runs)
        # Get planned qty from production orders
        plan_ids = set(r.production_order_id for r in runs)
        from production_planning.models import ProductionPlan
        total_planned = ProductionPlan.objects.filter(
            id__in=plan_ids
        ).aggregate(total=Sum('planned_qty'))['total'] or 1
        prod_vs_plan = round((total_produced / float(total_planned)) * 100, 2)

        data = {
            **analytics,
            'material_loss_pct': material_loss_pct,
            'production_vs_plan_pct': prod_vs_plan,
        }
        return Response(data)
```

---

## 5. URLs

```python
# urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from .views.master import (
    ProductionLineViewSet, MachineViewSet, ChecklistTemplateViewSet,
)
from .views.run import ProductionRunViewSet, ProductionLogViewSet
from .views.breakdown import MachineBreakdownViewSet
from .views.material import ProductionMaterialUsageViewSet
from .views.machine_runtime import MachineRuntimeViewSet
from .views.manpower import ProductionManpowerViewSet
from .views.line_clearance import LineClearanceViewSet
from .views.machine_checklist import MachineChecklistViewSet
from .views.waste import WasteLogViewSet
from .views.dashboard import ExecutionDashboardView
from .views.reports import (
    DailyProductionReportView, YieldReportView, AnalyticsView,
)

# Top-level router
router = DefaultRouter()
router.register(r'lines', ProductionLineViewSet, basename='production-line')
router.register(r'machines', MachineViewSet, basename='machine')
router.register(r'checklist-templates', ChecklistTemplateViewSet, basename='checklist-template')
router.register(r'runs', ProductionRunViewSet, basename='production-run')
router.register(r'line-clearance', LineClearanceViewSet, basename='line-clearance')
router.register(r'machine-checklists', MachineChecklistViewSet, basename='machine-checklist')
router.register(r'waste', WasteLogViewSet, basename='waste-log')

# Nested routers for run sub-resources
runs_router = nested_routers.NestedDefaultRouter(router, r'runs', lookup='run')
runs_router.register(r'logs', ProductionLogViewSet, basename='production-log')
runs_router.register(r'breakdowns', MachineBreakdownViewSet, basename='breakdown')
runs_router.register(r'materials', ProductionMaterialUsageViewSet, basename='material-usage')
runs_router.register(r'machine-runtime', MachineRuntimeViewSet, basename='machine-runtime')
runs_router.register(r'manpower', ProductionManpowerViewSet, basename='manpower')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    path('', include(runs_router.urls)),

    # Dashboard
    path('dashboard/', ExecutionDashboardView.as_view(), name='execution-dashboard'),

    # Reports
    path('reports/daily-production/', DailyProductionReportView.as_view(), name='daily-production-report'),
    path('reports/yield/<uuid:run_pk>/', YieldReportView.as_view(), name='yield-report'),
    path('reports/analytics/', AnalyticsView.as_view(), name='analytics'),
]
```

**Register in project `urls.py`:**

```python
# project/urls.py
urlpatterns = [
    ...
    path('api/v1/production/', include('production_execution.urls')),
]
```

**This produces these URL patterns:**

```
GET/POST   /api/v1/production/lines/
GET/PUT/PATCH/DELETE /api/v1/production/lines/:id/

GET/POST   /api/v1/production/machines/
GET/PUT/PATCH/DELETE /api/v1/production/machines/:id/

GET/POST   /api/v1/production/checklist-templates/
GET/PUT/PATCH/DELETE /api/v1/production/checklist-templates/:id/

GET/POST   /api/v1/production/runs/
GET/PUT/PATCH  /api/v1/production/runs/:id/
POST       /api/v1/production/runs/:id/complete/
POST       /api/v1/production/runs/:id/sign/:role/

GET/POST   /api/v1/production/runs/:run_pk/logs/
POST       /api/v1/production/runs/:run_pk/logs/bulk/
GET/PATCH  /api/v1/production/runs/:run_pk/logs/:id/

GET/POST   /api/v1/production/runs/:run_pk/breakdowns/
GET/PATCH/DELETE /api/v1/production/runs/:run_pk/breakdowns/:id/

GET/POST   /api/v1/production/runs/:run_pk/materials/
GET/PATCH  /api/v1/production/runs/:run_pk/materials/:id/

GET/POST   /api/v1/production/runs/:run_pk/machine-runtime/
GET/PATCH  /api/v1/production/runs/:run_pk/machine-runtime/:id/

GET/POST   /api/v1/production/runs/:run_pk/manpower/
GET/PATCH  /api/v1/production/runs/:run_pk/manpower/:id/

GET/POST   /api/v1/production/line-clearance/
GET/PATCH  /api/v1/production/line-clearance/:id/
POST       /api/v1/production/line-clearance/:id/submit/
POST       /api/v1/production/line-clearance/:id/approve/

GET/POST   /api/v1/production/machine-checklists/
GET/PATCH  /api/v1/production/machine-checklists/:id/
POST       /api/v1/production/machine-checklists/bulk/

GET/POST   /api/v1/production/waste/
GET        /api/v1/production/waste/:id/
POST       /api/v1/production/waste/:id/approve/engineer/
POST       /api/v1/production/waste/:id/approve/am/
POST       /api/v1/production/waste/:id/approve/store/
POST       /api/v1/production/waste/:id/approve/hod/

GET        /api/v1/production/dashboard/
GET        /api/v1/production/reports/daily-production/?date=&line=
GET        /api/v1/production/reports/yield/:run_pk/
GET        /api/v1/production/reports/analytics/?days=&line=
```

---

## 6. Permissions

```python
# permissions.py

from rest_framework.permissions import BasePermission


class CanViewProductionRun(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('production_execution.can_view_production_run')


class CanCreateProductionRun(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('production_execution.can_create_production_run')


class CanViewLineClearance(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('production_execution.can_view_line_clearance')


class CanCreateLineClearance(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('production_execution.can_create_line_clearance')


class CanApproveLineClearanceQA(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('production_execution.can_approve_line_clearance_qa')


class CanApproveWaste(BasePermission):
    """Dynamic permission check based on approval role."""
    def has_permission(self, request, view):
        role = view.kwargs.get('role') or view.action.split('_')[-1]
        perm = f'production_execution.can_approve_waste_{role}'
        return request.user.has_perm(perm)


class CanViewReports(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('production_execution.can_view_reports')


class CanManageChecklistTemplate(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user.has_perm('production_execution.can_manage_checklist_template')
```

---

## 7. Signals & Auto-Calculations

```python
# signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ProductionLog, MachineBreakdown


@receiver(post_save, sender=ProductionLog)
def recalculate_run_on_log_save(sender, instance, **kwargs):
    """Recalculate run totals when an hourly log is saved."""
    instance.production_run.recalculate_totals()


@receiver([post_save, post_delete], sender=MachineBreakdown)
def recalculate_run_on_breakdown_change(sender, instance, **kwargs):
    """Recalculate run totals when a breakdown is added/updated/deleted."""
    instance.production_run.recalculate_totals()
```

```python
# services/calculations.py

from decimal import Decimal


def calculate_oee(runs):
    """
    Calculate OEE from a list of completed production runs.

    OEE = Availability x Performance x Quality

    Availability = Operating Time / Available Time
    Performance  = (Actual Speed / Rated Speed)
    Quality      = (Good Output / Total Output)  -- assumed 100% for now
    """
    if not runs:
        return {
            'oee': Decimal('0'),
            'availability': Decimal('0'),
            'performance': Decimal('0'),
            'quality': Decimal('100'),
            'line_efficiency': Decimal('0'),
            'downtime_hours': Decimal('0'),
        }

    total_available = 0
    total_operating = 0
    total_production = 0
    total_theoretical_max = 0
    total_breakdown_minutes = 0

    for run in runs:
        available = run.total_minutes_me  # Total recorded minutes
        breakdown = run.total_breakdown_time
        operating = available - breakdown
        if operating < 0:
            operating = 0

        total_available += available
        total_operating += operating
        total_production += run.total_production
        total_breakdown_minutes += breakdown

        if run.rated_speed and operating > 0:
            theoretical_max = float(run.rated_speed) * (operating / 60)
            total_theoretical_max += theoretical_max

    # Availability
    availability = (total_operating / total_available * 100) if total_available > 0 else 0

    # Performance
    performance = (total_production / total_theoretical_max * 100) if total_theoretical_max > 0 else 0

    # Quality (assumed 100% — no reject data yet)
    quality = 100

    # OEE
    oee = (availability * performance * quality) / 10000

    # Line efficiency
    line_efficiency = (total_production / total_theoretical_max * 100) if total_theoretical_max > 0 else 0

    # Downtime
    downtime_hours = total_breakdown_minutes / 60

    return {
        'oee': round(Decimal(str(oee)), 2),
        'availability': round(Decimal(str(availability)), 2),
        'performance': round(Decimal(str(performance)), 2),
        'quality': round(Decimal(str(quality)), 2),
        'line_efficiency': round(Decimal(str(line_efficiency)), 2),
        'downtime_hours': round(Decimal(str(downtime_hours)), 2),
    }
```

---

## 8. Business Logic & Validation

### 8.1 Key Validation Rules

| Rule | Where | Detail |
|------|-------|--------|
| Line clearance required before run | `CreateProductionRunSerializer.validate()` | Check LineClearance with status=CLEARED exists for order+line |
| Run number auto-increment | `CreateProductionRunSerializer.validate()` | Count existing runs for same order+date, +1 |
| Breakdown end > start | `MachineBreakdownSerializer.validate()` | Raise if end_time <= start_time |
| Wastage auto-calculated | `ProductionMaterialUsage.save()` | wastage = opening + issued - closing |
| Breakdown minutes auto-calculated | `MachineBreakdown.save()` | From end_time - start_time |
| Waste approval is sequential | `WasteLogViewSet._approve()` | Check `current_approval_step` matches requested role |
| All checklist items filled before submit | `LineClearanceViewSet.submit()` | Count items with result=NULL |
| Only DRAFT clearances can be submitted | `LineClearanceViewSet.submit()` | Check status |
| Only SUBMITTED clearances can be approved | `LineClearanceViewSet.approve()` | Check status |
| Unique time slot per run | `ProductionLog.Meta.unique_together` | DB constraint on (run, time_slot) |
| Unique material+batch per run | `ProductionMaterialUsage.Meta.unique_together` | DB constraint |
| Unique machine_type per run | `MachineRuntime.Meta.unique_together` | DB constraint |
| Unique shift per run | `ProductionManpower.Meta.unique_together` | DB constraint |

### 8.2 State Machines

**Production Run Status:**
```
DRAFT → IN_PROGRESS → COMPLETED
```
- DRAFT: Created but not started (reserved for future use)
- IN_PROGRESS: Active production, hourly entries being recorded
- COMPLETED: Run finished, totals finalized

**Line Clearance Status:**
```
DRAFT → SUBMITTED → CLEARED
                  → NOT_CLEARED
```
- DRAFT: Checklist being filled
- SUBMITTED: All items filled, awaiting QA
- CLEARED: QA approved, production can start
- NOT_CLEARED: QA rejected, must redo

**Waste Approval Status:**
```
PENDING → PARTIALLY_APPROVED → FULLY_APPROVED
                              → REJECTED (at any step)
```
- Approval chain: Engineer → AM → Store → HOD
- Rejection at any step halts the chain

---

## 9. Admin Configuration

```python
# admin.py

from django.contrib import admin
from .models import (
    ProductionLine, Machine, ChecklistTemplate,
    ProductionRun, ProductionLog, MachineBreakdown,
    ProductionMaterialUsage, MachineRuntime, ProductionManpower,
    LineClearance, ClearanceChecklistItem,
    MachineChecklistEntry, WasteLog,
)


@admin.register(ProductionLine)
class ProductionLineAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_active']
    list_filter = ['company', 'is_active']


@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ['name', 'machine_type', 'line', 'is_active']
    list_filter = ['machine_type', 'line', 'is_active']


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ['machine_type', 'task', 'frequency', 'sort_order']
    list_filter = ['machine_type', 'frequency']
    ordering = ['machine_type', 'frequency', 'sort_order']


class ProductionLogInline(admin.TabularInline):
    model = ProductionLog
    extra = 0
    fields = ['time_slot', 'produced_cases', 'machine_status', 'recd_minutes', 'breakdown_detail']


class MachineBreakdownInline(admin.TabularInline):
    model = MachineBreakdown
    extra = 0
    fields = ['machine_name', 'start_time', 'end_time', 'breakdown_minutes', 'type', 'reason']


@admin.register(ProductionRun)
class ProductionRunAdmin(admin.ModelAdmin):
    list_display = ['run_number', 'brand', 'pack', 'date', 'line', 'status', 'total_production']
    list_filter = ['status', 'line', 'date']
    inlines = [ProductionLogInline, MachineBreakdownInline]
    readonly_fields = [
        'total_production', 'total_breakdown_time',
        'line_breakdown_time', 'external_breakdown_time',
    ]


@admin.register(LineClearance)
class LineClearanceAdmin(admin.ModelAdmin):
    list_display = ['line', 'date', 'status', 'qa_approved', 'created_by']
    list_filter = ['status', 'line', 'date']


@admin.register(WasteLog)
class WasteLogAdmin(admin.ModelAdmin):
    list_display = [
        'material_name', 'wastage_qty', 'wastage_approval_status',
        'engineer_sign', 'am_sign', 'store_sign', 'hod_sign',
    ]
    list_filter = ['wastage_approval_status']


@admin.register(MachineChecklistEntry)
class MachineChecklistEntryAdmin(admin.ModelAdmin):
    list_display = ['machine_type', 'task_description', 'date', 'frequency', 'status', 'operator']
    list_filter = ['machine_type', 'frequency', 'status', 'month', 'year']
```

---

## 10. Management Commands & Seed Data

### 10.1 Seed Checklist Templates

```python
# management/commands/seed_checklist_templates.py

from django.core.management.base import BaseCommand
from production_execution.models import ChecklistTemplate, MachineType, ChecklistFrequency


TEMPLATES = [
    # Tin Filler - Daily
    (MachineType.FILLER, ChecklistFrequency.DAILY, [
        'Clean oil storage tank',
        'Machine cleaning (all dust particles and abrasive particles)',
        'Clean chain',
        'Clean all sensors with dry cloth (infeed & outfeed sensors)',
        'Clean all nozzle',
        'Check oil leakage',
        'Clean filler outfeed conveyor',
        'Clean all body frame and structure',
        'Check any abnormal sound in machine',
        'Clean all solenoid valve and coil',
        'Clean all cylinder',
        'Clean strip machine',
        'Clean all guides',
        'Calibrate tare weight',
        'Clean panel',
        'Check motor voltage and cutter',
    ]),
    # 10-Head Filler - Weekly
    (MachineType.FILLER, ChecklistFrequency.WEEKLY, [
        'Check oil leakage from tank to filler',
        'Check all air regulators',
        'Lubrication of machine (gear & height adjustment unit)',
        'Clean panel cooling fans, filters, drive',
        'Check alignment of all grippers',
        'Tight all nuts and bolts',
        'Clean FRL unit',
    ]),
    # 10-Head Filler - Monthly
    (MachineType.FILLER, ChecklistFrequency.MONTHLY, [
        'Check any physical damage',
        'Check and clean filling valve, seal & solenoid coil',
        'Clean panel and tighten loose connections',
        'Check motor voltage, earthing & current',
        'Maintain inventory of solenoid valve and coil',
    ]),
    # Tapping Machine - Daily
    (MachineType.TAPPING_MACHINE, ChecklistFrequency.DAILY, [
        'Clean dust from all machines',
        'Check belt condition',
        'Check all rollers',
        'Check cutter sharpness',
    ]),
    # Tapping Machine - Weekly
    (MachineType.TAPPING_MACHINE, ChecklistFrequency.WEEKLY, [
        'Check loose wiring',
        'Tight all nuts and bolts',
    ]),
    # Tapping Machine - Monthly
    (MachineType.TAPPING_MACHINE, ChecklistFrequency.MONTHLY, [
        'Check current & voltage of motor',
    ]),
]


class Command(BaseCommand):
    help = 'Seed machine checklist templates from factory standards'

    def add_arguments(self, parser):
        parser.add_argument('company_id', type=int, help='Company ID to seed for')

    def handle(self, *args, **options):
        from accounts.models import Company
        company = Company.objects.get(id=options['company_id'])

        created = 0
        for machine_type, frequency, tasks in TEMPLATES:
            for i, task in enumerate(tasks):
                _, was_created = ChecklistTemplate.objects.get_or_create(
                    company=company,
                    machine_type=machine_type,
                    frequency=frequency,
                    task=task,
                    defaults={'sort_order': i + 1},
                )
                if was_created:
                    created += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created} checklist templates'))
```

### 10.2 Seed Production Lines

```python
# management/commands/seed_production_lines.py

from django.core.management.base import BaseCommand
from production_execution.models import ProductionLine, Machine, MachineType


LINES = ['Line-1', 'Line-2', 'Line-3']

# Machines per line
MACHINES_PER_LINE = [
    (MachineType.FILLER, '10-Head Filler'),
    (MachineType.CAPPER, 'Capper'),
    (MachineType.CONVEYOR, 'Conveyor'),
    (MachineType.LABELER, 'Labeler'),
    (MachineType.CODING, 'Coding Machine'),
    (MachineType.SHRINK_PACK, 'Shrink Pack'),
    (MachineType.STICKER_LABELER, 'Sticker Labeler'),
    (MachineType.TAPPING_MACHINE, 'Tapping Machine'),
]


class Command(BaseCommand):
    help = 'Seed production lines and machines'

    def add_arguments(self, parser):
        parser.add_argument('company_id', type=int, help='Company ID')

    def handle(self, *args, **options):
        from accounts.models import Company
        company = Company.objects.get(id=options['company_id'])

        for line_name in LINES:
            line, _ = ProductionLine.objects.get_or_create(
                company=company, name=line_name,
            )
            for machine_type, machine_name in MACHINES_PER_LINE:
                Machine.objects.get_or_create(
                    company=company,
                    name=f'{machine_name} {line_name}',
                    machine_type=machine_type,
                    defaults={'line': line},
                )

        self.stdout.write(self.style.SUCCESS('Seeded production lines and machines'))
```

### Usage

```bash
python manage.py seed_production_lines 2
python manage.py seed_checklist_templates 2
```

---

## 11. API Endpoint Reference

### Quick Reference Table

| Method | Endpoint | Purpose | Permission |
|--------|----------|---------|------------|
| **Master Data** | | | |
| GET | `/production/lines/` | List production lines | Authenticated |
| POST | `/production/lines/` | Create production line | Admin |
| GET | `/production/machines/` | List machines | Authenticated |
| GET | `/production/checklist-templates/` | List templates | Authenticated |
| POST | `/production/checklist-templates/` | Create template | can_manage_checklist_template |
| **Production Runs** | | | |
| GET | `/production/runs/` | List runs | can_view_production_run |
| POST | `/production/runs/` | Start new run | can_create_production_run |
| GET | `/production/runs/:id/` | Run detail with logs | can_view_production_run |
| PATCH | `/production/runs/:id/` | Update run | can_create_production_run |
| POST | `/production/runs/:id/complete/` | Complete run | can_create_production_run |
| POST | `/production/runs/:id/sign/:role/` | Sign report | can_sign_report |
| **Hourly Logs** | | | |
| GET | `/production/runs/:id/logs/` | Get hourly logs | can_view_production_log |
| POST | `/production/runs/:id/logs/` | Create log entry | can_edit_production_log |
| POST | `/production/runs/:id/logs/bulk/` | Save all 12 slots | can_edit_production_log |
| PATCH | `/production/runs/:id/logs/:logId/` | Update log | can_edit_production_log |
| **Breakdowns** | | | |
| GET | `/production/runs/:id/breakdowns/` | List breakdowns | can_view_breakdown |
| POST | `/production/runs/:id/breakdowns/` | Add breakdown | can_create_breakdown |
| PATCH | `/production/runs/:id/breakdowns/:id/` | Update breakdown | can_edit_breakdown |
| DELETE | `/production/runs/:id/breakdowns/:id/` | Delete breakdown | can_edit_breakdown |
| **Material Usage** | | | |
| GET | `/production/runs/:id/materials/` | Get material usage | can_view_material_usage |
| POST | `/production/runs/:id/materials/` | Add material entry | can_create_material_usage |
| PATCH | `/production/runs/:id/materials/:id/` | Update entry | can_edit_material_usage |
| **Machine Runtime** | | | |
| GET | `/production/runs/:id/machine-runtime/` | Get runtimes | can_view_machine_runtime |
| POST | `/production/runs/:id/machine-runtime/` | Add runtime | can_create_machine_runtime |
| PATCH | `/production/runs/:id/machine-runtime/:id/` | Update runtime | can_create_machine_runtime |
| **Manpower** | | | |
| GET | `/production/runs/:id/manpower/` | Get manpower | can_view_manpower |
| POST | `/production/runs/:id/manpower/` | Add manpower | can_create_manpower |
| PATCH | `/production/runs/:id/manpower/:id/` | Update manpower | can_create_manpower |
| **Line Clearance** | | | |
| GET | `/production/line-clearance/` | List clearances | can_view_line_clearance |
| POST | `/production/line-clearance/` | Create clearance | can_create_line_clearance |
| GET | `/production/line-clearance/:id/` | Clearance detail | can_view_line_clearance |
| PATCH | `/production/line-clearance/:id/` | Update clearance | can_create_line_clearance |
| POST | `/production/line-clearance/:id/submit/` | Submit for QA | can_create_line_clearance |
| POST | `/production/line-clearance/:id/approve/` | QA approve/reject | can_approve_line_clearance_qa |
| **Machine Checklists** | | | |
| GET | `/production/machine-checklists/` | List entries | can_view_machine_checklist |
| POST | `/production/machine-checklists/` | Create entry | can_create_machine_checklist |
| POST | `/production/machine-checklists/bulk/` | Bulk save month | can_create_machine_checklist |
| PATCH | `/production/machine-checklists/:id/` | Update entry | can_create_machine_checklist |
| **Waste Management** | | | |
| GET | `/production/waste/` | List waste logs | can_view_waste_log |
| POST | `/production/waste/` | Create waste log | can_create_waste_log |
| GET | `/production/waste/:id/` | Waste detail | can_view_waste_log |
| POST | `/production/waste/:id/approve/engineer/` | Engineer sign | can_approve_waste_engineer |
| POST | `/production/waste/:id/approve/am/` | AM sign | can_approve_waste_am |
| POST | `/production/waste/:id/approve/store/` | Store sign | can_approve_waste_store |
| POST | `/production/waste/:id/approve/hod/` | HOD sign | can_approve_waste_hod |
| **Dashboard & Reports** | | | |
| GET | `/production/dashboard/` | Dashboard summary | Authenticated |
| GET | `/production/reports/daily-production/` | Daily report | can_view_reports |
| GET | `/production/reports/yield/:runId/` | Yield report | can_view_reports |
| GET | `/production/reports/analytics/` | OEE & analytics | can_view_reports |

### Common Query Parameters

| Endpoint | Parameters |
|----------|-----------|
| `GET /runs/` | `?date=YYYY-MM-DD&line=UUID&status=IN_PROGRESS&production_order=UUID` |
| `GET /line-clearance/` | `?date=YYYY-MM-DD&line=UUID&status=CLEARED&production_order=UUID` |
| `GET /machine-checklists/` | `?machine_type=FILLER&machine=UUID&month=3&year=2026&frequency=DAILY` |
| `GET /waste/` | `?production_run=UUID&wastage_approval_status=PENDING` |
| `GET /reports/daily-production/` | `?date=YYYY-MM-DD&line=UUID` |
| `GET /reports/analytics/` | `?days=7&line=UUID` |

### Standard Response Envelope

All list endpoints return paginated responses:

```json
{
    "count": 42,
    "next": "http://.../api/v1/production/runs/?page=2",
    "previous": null,
    "results": [...]
}
```

### Error Response Format

```json
{
    "detail": "Human-readable error message",
    "field_errors": {
        "field_name": ["Specific validation error"]
    }
}
```

---

## 12. Testing Guide

### Key Test Scenarios

```python
# tests/test_runs.py

class ProductionRunTests(APITestCase):
    def test_create_run_without_clearance_fails(self):
        """Starting a run without line clearance should return 400."""
        ...

    def test_create_run_with_clearance_succeeds(self):
        """Starting a run with approved clearance should return 201."""
        ...

    def test_run_number_auto_increments(self):
        """Second run on same order+date should be Run #2."""
        ...

    def test_complete_run_recalculates_totals(self):
        """Completing a run should recalculate all summary fields."""
        ...

    def test_hourly_log_bulk_save(self):
        """Saving all 12 time slots at once should work."""
        ...

    def test_duplicate_time_slot_rejected(self):
        """Unique constraint on (run, time_slot) should raise error."""
        ...


# tests/test_line_clearance.py

class LineClearanceTests(APITestCase):
    def test_submit_with_unfilled_items_fails(self):
        """Cannot submit if checklist items have no result."""
        ...

    def test_qa_approve_changes_status_to_cleared(self):
        """QA approval should set status=CLEARED and qa_approved=True."""
        ...

    def test_qa_reject_sets_not_cleared(self):
        """QA rejection should set status=NOT_CLEARED."""
        ...

    def test_cannot_approve_draft_clearance(self):
        """Only SUBMITTED clearances can be approved."""
        ...


# tests/test_waste_approval.py

class WasteApprovalTests(APITestCase):
    def test_sequential_approval_enforced(self):
        """Cannot approve as AM before engineer has signed."""
        ...

    def test_engineer_approval_sets_partially_approved(self):
        """First approval should set PARTIALLY_APPROVED."""
        ...

    def test_hod_approval_sets_fully_approved(self):
        """Final approval should set FULLY_APPROVED."""
        ...

    def test_rejection_stops_chain(self):
        """Rejecting at any step should set REJECTED status."""
        ...

    def test_cannot_approve_rejected_waste(self):
        """Once rejected, no further approvals allowed."""
        ...


# tests/test_breakdowns.py

class BreakdownTests(APITestCase):
    def test_breakdown_minutes_auto_calculated(self):
        """Duration should be auto-calculated from start/end times."""
        ...

    def test_end_before_start_rejected(self):
        """end_time <= start_time should raise validation error."""
        ...

    def test_breakdown_updates_run_totals(self):
        """Adding a breakdown should recalculate run summary."""
        ...

    def test_delete_breakdown_updates_run_totals(self):
        """Deleting a breakdown should recalculate run summary."""
        ...


# tests/test_reports.py

class ReportTests(APITestCase):
    def test_daily_report_compiles_from_runs(self):
        """Daily report should aggregate all runs for a date."""
        ...

    def test_yield_report_groups_by_batch(self):
        """Material usage should be grouped by batch_number."""
        ...

    def test_oee_calculation(self):
        """OEE should be Availability x Performance x Quality / 10000."""
        ...

    def test_analytics_filters_by_date_range(self):
        """Analytics should only include runs within date range."""
        ...
```

### Run Tests

```bash
python manage.py test production_execution --verbosity=2
```

---

## Dependencies

Add to `requirements.txt`:

```
djangorestframework>=3.14
django-filter>=23.0
drf-nested-routers>=0.93    # For nested URL routing (/runs/:id/logs/)
```

---

## Migration Sequence

```bash
python manage.py makemigrations production_execution
python manage.py migrate

# Seed initial data
python manage.py seed_production_lines 2
python manage.py seed_checklist_templates 2
```
