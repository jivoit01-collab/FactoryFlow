# Quick Start Guide

Get up and running with the Factory Management System in minutes.

## Starting the Application

### Development Mode

```bash
npm run dev
```

This starts the Vite development server with:
- Hot Module Replacement (HMR) for instant updates
- Source maps for debugging
- Development-optimized build

Access the application at: `http://localhost:5173`

### Production Build

```bash
# Build the application
npm run build

# Preview the production build locally
npm run preview
```

## Application Flow

### 1. Authentication

When you first access the application, you'll be directed to the login page.

```
/login → Authentication
   ↓
/select-company → Company Selection (if multiple companies)
   ↓
/loading-user → User Data Loading
   ↓
/ → Dashboard (Main Application)
```

### 2. Navigation Structure

The main application uses a sidebar-based navigation:

```
├── Dashboard
├── Gate
│   ├── Raw Materials
│   ├── Daily Needs
│   ├── Maintenance
│   ├── Construction
│   ├── Returnable Items
│   ├── Visitor
│   ├── Employee
│   └── Contractor/Labor
├── Quality Check
└── Profile
```

### 3. Key Features Walkthrough

#### Raw Materials Entry (Multi-Step Process)

The raw materials entry is a 5-step workflow:

1. **Step 1**: Select Driver, Transporter, and Vehicle
2. **Step 2**: Enter Purchase Order (PO) information
3. **Step 3**: PO Receipt details
4. **Step 4**: Weighment information
5. **Step 5**: Quality Control data
6. **Review**: Verify all information before submission

Navigate through steps using the footer navigation or header stepper.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production (TypeScript check + Vite build) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run format` | Format code using Prettier |
| `npm run format:check` | Check code formatting without changes |

## Development Workflow

### Making Changes

1. **Edit Files**: Make changes to source files in `src/`
2. **Auto-Reload**: The browser will automatically refresh
3. **Check Console**: Monitor browser console for errors
4. **Run Linting**: Execute `npm run lint` before committing

### Code Formatting

The project uses Prettier for consistent code formatting:

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

### Type Checking

TypeScript provides compile-time type checking:

```bash
# Check types without building
npx tsc --noEmit
```

## Project Configuration

### Path Aliases

The project uses the `@/` alias for imports from the `src` directory:

```typescript
// Instead of relative imports
import { Button } from '../../../shared/components/ui/button';

// Use the @ alias
import { Button } from '@/shared/components/ui/button';
```

### Environment Variables

Access environment variables using Vite's `import.meta.env`:

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```

## Debugging

### Browser DevTools

1. **React DevTools**: Install the React DevTools browser extension
2. **Redux DevTools**: Install Redux DevTools for state inspection
3. **Network Tab**: Monitor API requests and responses
4. **Console**: Check for errors and warnings

### Source Maps

Source maps are enabled in development, allowing you to debug TypeScript code directly in browser DevTools.

### React Query DevTools

React Query DevTools is available in development for inspecting query states:

- View all active queries
- Inspect query data and status
- Manually invalidate queries
- Test refetch behavior

## Common Development Tasks

### Adding a New Page

1. Create the page component in the appropriate module:
   ```
   src/modules/[module]/pages/NewPage.tsx
   ```

2. Add the route configuration in `src/config/routes.config.ts`

3. Update `src/app/routes/AppRoutes.tsx` with the new route

### Adding a New API Endpoint

1. Add the endpoint constant in `src/config/constants/api.constants.ts`

2. Create API functions in `src/modules/[module]/api/[feature].api.ts`

3. Create React Query hooks in `src/modules/[module]/api/[feature].queries.ts`

### Creating a New Component

1. Create the component file:
   ```
   src/modules/[module]/components/NewComponent.tsx
   ```

2. For shared components:
   ```
   src/shared/components/ui/new-component.tsx
   ```

3. Export from the appropriate index file

## Next Steps

- [Project Structure](./project-structure.md) - Detailed folder organization
- [Architecture Overview](../architecture/overview.md) - System design patterns
- [Code Style Guide](../development/code-style.md) - Coding conventions
