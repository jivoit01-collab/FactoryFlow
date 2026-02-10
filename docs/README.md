# Factory Management System - Documentation

Welcome to the Factory Management System (FMS) documentation. This is a comprehensive web application built for managing factory gate operations, vehicle entries, quality checks, and material tracking for Jivo Wellness.

## Overview

The Factory Management System is a modern, enterprise-grade React application designed to streamline factory gate operations. It provides a robust platform for managing:

- **Gate Entry Management** - Track vehicles, drivers, and materials entering the facility
- **Raw Materials Processing** - Multi-step workflow for raw material verification
- **Quality Control** - Integrated quality check processes
- **Vehicle & Transporter Management** - Complete fleet and driver tracking
- **User Authentication** - Role-based access control with multi-tenant support

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend Framework** | React 19.2 with TypeScript 5.9 |
| **Build Tool** | Vite 7.2 with SWC |
| **State Management** | Redux Toolkit + React Query |
| **Routing** | React Router DOM 7.12 |
| **UI Components** | Radix UI + Tailwind CSS |
| **Form Handling** | React Hook Form + Zod |
| **HTTP Client** | Axios |
| **Date Utilities** | date-fns |

## Documentation Structure

### Getting Started
- [Installation Guide](./getting-started/installation.md) - Set up your development environment
- [Quick Start](./getting-started/quick-start.md) - Get up and running quickly
- [Project Structure](./getting-started/project-structure.md) - Understand the codebase organization

### Architecture
- [Architecture Overview](./architecture/overview.md) - High-level system design
- [Module Boundaries](./architecture/module-boundaries.md) - Module independence rules and dependency hierarchy
- [Folder Structure](./architecture/folder-structure.md) - Directory organization and conventions
- [State Management](./architecture/state-management.md) - Redux and React Query patterns

### API Reference
- [API Overview](./api/overview.md) - API client architecture
- [Authentication](./api/authentication.md) - Auth flow and token management
- [Endpoints](./api/endpoints.md) - Available API endpoints

### Modules
- [Modules Overview](./modules/overview.md) - Feature module architecture
- [Authentication Module](./modules/auth.md) - User authentication and authorization
- [Dashboard Module](./modules/dashboard.md) - Main dashboard
- [Gate Module](./modules/gate.md) - Gate entry management
- [GRPO Module](./modules/grpo.md) - Goods receipt posting
- [QC Module](./modules/qc.md) - Quality control inspections
- [Notifications Module](./modules/notifications.md) - Push notifications

Each module also has local documentation at `src/modules/{name}/docs/README.md`.

### Components
- [UI Components](./components/ui-components.md) - Reusable component library
- [Layout Components](./components/layout.md) - Application layout system

### Configuration
- [Environment Setup](./configuration/environment.md) - Environment variables and configuration
- [Constants Reference](./configuration/constants.md) - Application constants

### Development
- [Code Style Guide](./development/code-style.md) - Coding standards and conventions
- [Contributing Guide](./development/contributing.md) - How to contribute to the project
- [Testing](./development/testing.md) - Testing strategies and tools

## Quick Links

- **Start Development**: `npm run dev`
- **Build for Production**: `npm run build`
- **Run Linting**: `npm run lint`
- **Format Code**: `npm run format`

## System Requirements

- Node.js 18.x or higher
- npm 9.x or higher
- Modern browser (Chrome, Firefox, Safari, Edge)

## Support

For questions or issues, please contact the development team or refer to the relevant documentation section.

---

*Last Updated: February 2026*
