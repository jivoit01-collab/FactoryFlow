# UI Components

This document provides a reference for the shared UI component library used in the Factory Management System.

## Overview

The UI components are built on [Radix UI](https://www.radix-ui.com/) primitives and styled with [Tailwind CSS](https://tailwindcss.com/). This combination provides:

- **Accessibility**: ARIA-compliant, keyboard navigation
- **Customization**: Tailwind-based styling with variants
- **Consistency**: Unified design language across the app

## Component Library

Location: `src/shared/components/ui/`

```
src/shared/components/ui/
├── button.tsx
├── input.tsx
├── label.tsx
├── card.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── select.tsx
├── badge.tsx
├── separator.tsx
├── tooltip.tsx
├── avatar.tsx
├── popover.tsx
├── collapsible.tsx
├── sheet.tsx
├── switch.tsx
├── calendar.tsx
└── index.ts
```

## Core Components

### Button

A versatile button component with multiple variants and sizes.

```typescript
import { Button } from '@/shared/components/ui/button';

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// With icon
<Button>
  <PlusIcon className="mr-2 h-4 w-4" />
  Add Item
</Button>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` | Button style variant |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Button size |
| `disabled` | `boolean` | `false` | Disable button |
| `asChild` | `boolean` | `false` | Render as child element |

### Input

Text input field with support for various types.

```typescript
import { Input } from '@/shared/components/ui/input';

// Basic
<Input placeholder="Enter text" />

// With type
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="0" />

// States
<Input disabled placeholder="Disabled" />
<Input className="border-red-500" placeholder="Error state" />

// With icon (using wrapper)
<div className="relative">
  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search..." />
</div>
```

### Label

Accessible label component for form fields.

```typescript
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>
```

### Card

Container component for grouping content.

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/shared/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog

Modal dialog for confirmations, forms, and alerts.

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/dialog';

function DeleteDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Select

Dropdown select component.

```typescript
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/shared/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="orange">Orange</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### Dropdown Menu

Context menu and action dropdowns.

```typescript
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/shared/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontalIcon />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleEdit}>
      <EditIcon className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
      <TrashIcon className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Badge

Status and label indicators.

```typescript
import { Badge } from '@/shared/components/ui/badge';

// Variants
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>

// Status examples
<Badge variant="default" className="bg-green-500">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Rejected</Badge>
```

### Tooltip

Informational tooltips on hover.

```typescript
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/shared/components/ui/tooltip';

// Wrap app with provider (usually in AppProviders)
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <InfoIcon className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Helpful information here</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Avatar

User avatar display.

```typescript
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar';

<Avatar>
  <AvatarImage src="/avatar.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>

// Sizes (using className)
<Avatar className="h-8 w-8">...</Avatar>
<Avatar className="h-12 w-12">...</Avatar>
```

### Sheet

Side panel / drawer component.

```typescript
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/components/ui/sheet';

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Panel</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Panel Title</SheetTitle>
      <SheetDescription>Panel description</SheetDescription>
    </SheetHeader>
    <div className="py-4">
      {/* Panel content */}
    </div>
  </SheetContent>
</Sheet>
```

### Switch

Toggle switch for boolean options.

```typescript
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';

<div className="flex items-center space-x-2">
  <Switch
    id="notifications"
    checked={enabled}
    onCheckedChange={setEnabled}
  />
  <Label htmlFor="notifications">Enable notifications</Label>
</div>
```

### Calendar

Date picker calendar component.

```typescript
import { Calendar } from '@/shared/components/ui/calendar';

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
/>

// Range selection
<Calendar
  mode="range"
  selected={{ from: startDate, to: endDate }}
  onSelect={setRange}
/>
```

### Separator

Visual divider component.

```typescript
import { Separator } from '@/shared/components/ui/separator';

<div>
  <p>Content above</p>
  <Separator className="my-4" />
  <p>Content below</p>
</div>

// Vertical separator
<div className="flex h-5 items-center space-x-4">
  <span>Item 1</span>
  <Separator orientation="vertical" />
  <span>Item 2</span>
</div>
```

### Collapsible

Expandable/collapsible content sections.

```typescript
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/shared/components/ui/collapsible';

<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost">
      <ChevronDownIcon className="h-4 w-4" />
      Show more
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <p>Hidden content revealed on expand</p>
  </CollapsibleContent>
</Collapsible>
```

## Utility Components

### ErrorBoundary

Error boundary for catching React errors.

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <ComponentThatMightError />
</ErrorBoundary>
```

## Styling Utilities

### cn() Function

Utility for merging Tailwind classes.

```typescript
import { cn } from '@/shared/utils/cn';

// Merge classes conditionally
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class'
)}>
  Content
</div>

// Override classes
<Button className={cn('custom-width', className)}>
  Button
</Button>
```

## Creating Custom Components

### Pattern

```typescript
import * as React from 'react';
import { cn } from '@/shared/utils/cn';

interface CustomComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'custom';
}

const CustomComponent = React.forwardRef<HTMLDivElement, CustomComponentProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'base-styles',
          variant === 'custom' && 'custom-variant-styles',
          className
        )}
        {...props}
      />
    );
  }
);
CustomComponent.displayName = 'CustomComponent';

export { CustomComponent };
```

## Import Pattern

```typescript
// Import from barrel file
import { Button, Input, Card, Dialog } from '@/shared/components/ui';

// Or import individually
import { Button } from '@/shared/components/ui/button';
```

## Related Documentation

- [Layout Components](./layout.md)
- [Code Style Guide](../development/code-style.md)
