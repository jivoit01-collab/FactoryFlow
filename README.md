# FactoryFlow

A factory gate management PWA for tracking vehicle entries, material receipts, quality inspections, and visitor/labour access.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **State:** Redux Toolkit (client), TanStack React Query (server)
- **UI:** Tailwind CSS, Radix UI primitives
- **Notifications:** Firebase Cloud Messaging
- **PWA:** Vite PWA plugin (offline-first)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy environment config and fill in values
cp .env.example .env.local

# Start dev server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |

## Project Structure

```
src/
├── app/                # App shell (layouts, routing, providers)
├── core/               # Infrastructure (auth, API client, store, notifications)
├── config/             # Centralized configuration and constants
├── modules/            # Feature modules
│   ├── auth/           # Login, password change
│   ├── dashboard/      # Overview dashboard
│   ├── gate/           # Vehicle & material gate entries (largest module)
│   ├── qc/             # Quality control inspections
│   ├── grpo/           # Goods Receipt PO (SAP integration)
│   └── notifications/  # Notification center
└── shared/             # Reusable components, hooks, utilities
```

Each module is self-contained with its own `api/`, `pages/`, `components/`, `hooks/`, `schemas/`, `types/`, and `constants/` directories. Modules expose a `module.config.tsx` that registers routes and navigation.

## Architecture

- **Modular:** Each feature is an isolated module with a single config entry point
- **API layer:** Each API group has `{feature}.api.ts` (Axios calls) + `{feature}.queries.ts` (React Query hooks)
- **Auth:** Token-based with automatic refresh, IndexedDB persistence, RBAC permissions
- **Path aliases:** `@/*` maps to `./src/*`

See `docs/` for detailed architecture documentation.

## Environment Variables

See `.env.example` for all required configuration values (API URL, Firebase credentials, etc.).
