# FactoryFlow — JI (Jivo Infotech)

FactoryFlow is the web platform for **JI (Jivo Infotech)**, a factory operations system that
tracks material end-to-end — from the moment a vehicle arrives at the gate, through quality
control, warehousing, production, and finished goods, out to dispatch and gate-out. It replaces
paper registers and spreadsheets across every department (security, QC, warehouse, production,
dispatch) and integrates directly with **SAP Business One (HANA + Service Layer)**.

It is deployed for the Jivo Wellness / Jivo Mart / Jivo Beverages factory. The scope spans MES (manufacturing
execution), WMS (warehouse management), CMMS (maintenance), gate & dispatch control, and an AI
assistant.

## Technology Stack

### Frontend (FactoryFlow)

| Category | Technology |
| ---------- | ------------ |
| **Framework** | React 19.2 + TypeScript 5.9 |
| **Build Tool** | Vite 7 with SWC |
| **State** | Redux Toolkit + TanStack React Query 5 |
| **Routing** | React Router DOM 7 |
| **UI** | Radix UI + Tailwind CSS 3 (shadcn-style components) |
| **Forms** | React Hook Form + Zod 4 |
| **HTTP** | Axios |
| **Charts / Export** | Recharts, xlsx |
| **Barcode / QR** | jsbarcode, qrcode.react, html5-qrcode |
| **Push / PWA** | Firebase Cloud Messaging, vite-plugin-pwa (Workbox) |
| **Testing** | Vitest + Testing Library |

### Backend (factory_app)

| Category | Technology |
| ---------- | ------------ |
| **Framework** | Django 6.0 + Django REST Framework 3.16 |
| **Auth** | SimpleJWT (access/refresh, rotation + blacklist) |
| **Database** | PostgreSQL (psycopg2) |
| **ERP Integration** | SAP HANA (`hdbcli`, `pyodbc`) + SAP Service Layer (`httpx`) |
| **Cache / Queue** | Redis (`django-redis`) |
| **Scheduling** | APScheduler (`django-apscheduler`) |
| **Push** | Firebase Admin SDK |
| **Static** | WhiteNoise |
| **Config** | python-decouple (`.env`) |

## Module Map

Frontend feature modules live under `src/modules/`; each maps to one or more Django apps in
`factory_app/`.

| Area | Frontend module(s) | Backend app(s) |
| ---- | ------------------ | -------------- |
| **Auth & Accounts** | `auth`, `settings` | `accounts`, `company` |
| **Gate Entry** | `gate` | `gate_core`, `raw_material_gatein`, `daily_needs_gatein`, `maintenance_gatein`, `construction_gatein`, `fixed_asset_gatein`, `person_gatein`, `security_checks`, `weighment` |
| **Vehicles & Drivers** | `vehicle-management` | `vehicle_management`, `driver_management` |
| **Quality Control** | `qc` | `quality_control` |
| **Purchasing / SAP** | — | `sap_client` (PO), `sap_plan_dashboard` |
| **GRPO** | `warehouse/grpo` | `grpo` |
| **Warehouse & WMS** | `warehouse`, `wms` | `warehouse`, `wms`, `inventory_age`, `non_moving_rm`, `stock_dashboard` |
| **Production** | `production` | `production_execution`, `blowing` |
| **Dispatch** | `dispatch` | `dispatch_plans`, `docking_admin` |
| **Marketplace** | `marketplace` | `marketplace` |
| **Barcode** | `barcode` | `barcode` |
| **Maintenance (CMMS)** | `maintenance` | `maintenance`, `returnable_items` |
| **Labour & Attendance** | `labour` | `labour_count`, `labour_gate`, `attendance` |
| **Finance** | `finance` | — |
| **Dashboards** | `dashboard`, `dashboards` | `sap_plan_dashboard`, `stock_dashboard`, `inventory_age`, `sales_planning_requirement` |
| **AI Assistant** | `ai` | `ai_assistant` (read-only analytics DB) |
| **Notifications** | `notifications` | `notifications` (FCM) |
| **Admin** | `admin` | Django admin |

## Getting Started

### Prerequisites

- **Node.js** 20.x LTS (18+ minimum) and **npm** 10.x — frontend
- **Python** 3.12+ — backend
- **PostgreSQL** — backend database
- Access to a **SAP Business One** HANA + Service Layer instance (or run with SAP simulation flags)
- **Redis** (optional, used for cache/scheduling)

### Backend — factory_app

```bash
cd ../factory_app

# create & activate a virtualenv, then:
pip install -r requirement.txt

# create a .env with DB, SAP, and Firebase settings (see config/settings.py for the keys:
#   DB_NAME/DB_USER/DB_PASSWORD/DB_HOST, HANA_*, SL_*, CORS_ALLOWED_ORIGINS, ...)

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver          # serves the API at http://localhost:8000
```

### Frontend — FactoryFlow

```bash
npm install

# .env in the repo root:
#   VITE_API_URL=http://localhost:8000

npm run dev                          # http://localhost:5173
```

The frontend expects the backend on the URL in `VITE_API_URL` (defaults to `http://localhost:8000`).

## Frontend Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the Vite dev server (`http://localhost:5173`) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npx vitest` | Run the test suite |

## Documentation

Deeper docs live in this `docs/` folder and inside each module (`src/modules/{name}/docs/`).

### Getting Started

- [Installation Guide](./getting-started/installation.md) — set up the dev environment
- [Quick Start](./getting-started/quick-start.md) — get up and running
- [Project Structure](./getting-started/project-structure.md) — codebase organization
- [Troubleshooting](./getting-started/troubleshooting.md)

### Architecture

- [Architecture Overview](./architecture/overview.md) — high-level system design
- [Module Boundaries](./architecture/module-boundaries.md) — module independence & dependency rules
- [Folder Structure](./architecture/folder-structure.md) — directory conventions
- [State Management](./architecture/state-management.md) — Redux & React Query patterns
- [Data Models](./architecture/data-models.md)

### API Reference

- [API Overview](./api/overview.md) — API client architecture
- [Authentication](./api/authentication.md) — JWT auth & token management
- [Endpoints](./api/endpoints.md) — available API endpoints

### Modules & Features

- [Modules Overview](./modules/overview.md)
- [Auth](./modules/auth.md) · [Dashboard](./modules/dashboard.md) · [Gate](./modules/gate.md) · [GRPO](./modules/grpo.md) · [QC](./modules/qc.md)
- [Stock Benchmark Dashboard](./modules/stock-benchmark.md) · [Snapshot Plan](./modules/stock-benchmark-snapshot-plan.md)
- [SAP Plan Dashboard](./modules/sap-plan-dashboard.md)
- [Barcode Dispatch Design](./modules/barcode-dispatch-design.md) — SAP-backed dispatch scanning
- [Notifications](./modules/notifications.md)
- SAP / WMS integration: [SAP↔WMS Integration Points](./sap-wms-integration-points.md), [WMS Module Integration](./wms-module-integration.md)

### Development

- [Code Style Guide](./development/code-style.md)
- [Contributing Guide](./development/contributing.md)
- [Testing](./development/testing.md)

## System Requirements

- Node.js 18+ / npm 9+ (frontend)
- Python 3.12+ / PostgreSQL (backend)
- Modern browser (Chrome, Firefox, Safari, Edge)

---

*Last Updated: July 2026*
