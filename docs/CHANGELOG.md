# Changelog

All notable changes to the FactoryFlow project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- SAP Plan Dashboard with summary, detail, procurement, and SKU detail views
- SAP Plan Dashboard documentation with business requirements and API design

### Removed
- Deprecated production module pages and associated permissions from configuration

---

## [0.8.0] - 2025-03 (Production Execution)

### Added
- Production Execution module with 11 pages and 24 components
  - ExecutionDashboard, StartRun, RunDetail
  - Hourly production logging
  - Machine breakdown tracking
  - Yield Report page with material usage schemas
  - Line Clearance list and form
  - Machine Checklist management
  - Waste Management with multi-level approval workflow
  - Daily Production Report
  - Reports and Analytics pages
- 35+ React Query hooks for production execution
- 8 Zod validation schemas for production forms
- Production execution backend and frontend API documentation

---

## [0.7.0] - 2025-02 (Production Planning)

### Added
- Production Planning module
  - Planning Dashboard with plan management
  - Bulk Import page for plan creation
  - Weekly plan breakdown with daily entries
  - BOM (Bill of Materials) management
  - SAP posting integration
  - Dropdown endpoints for items, UOM, warehouses, BOM
- Production planning design documentation and implementation plan

---

## [0.6.0] - 2025-02 (GRPO Enhancements)

### Added
- GRPO attachment management with SAP upload status tracking
- Extra charges support in GRPO posting
- Document date fields and round-off option to GRPO schema
- Multipart form-data Content-Type handling for attachment uploads

### Fixed
- GRPO posting with attachment handling

---

## [0.5.0] - 2025-01 (QC V2 & Notifications)

### Added
- Quality Control V2 module
  - Arrival slip management (create, submit, send back)
  - Material type and QC parameter management
  - Multi-step inspection workflow (Draft → Submitted → Chemist Approved → QAM Approved)
  - Inspection list views by status (pending, draft, actionable, completed, rejected)
  - Inspection update with material type change support
  - Print-friendly inspection detail page
- Push notification system with FCM integration
  - NotificationProvider for browser push notifications
  - Device registration and unregistration
  - Send notifications to users by role or ID
  - 13 predefined notification types
- Production module initial setup and navigation

### Fixed
- QC parameters update when material type changes
- SearchableSelect component improvements
- Error message display in InspectionDetailPage

---

## [0.4.0] - 2025-01 (GRPO Module)

### Added
- GRPO (Goods Receipt Purchase Order) module
  - Pending entries list
  - Preview page with PO receipt details
  - Post to SAP functionality
  - GRPO history with detail view
- `useScrollToError` hook for automatic form error scrolling

---

## [0.3.0] - 2024-12 (Gate Module Expansion)

### Added
- Person Gate-In module
  - Visitor and labour entry dashboards
  - Bulk labour entry/exit
  - Gate-in time filtering
- Construction entry management (dashboard, wizard, all entries)
- Maintenance entry management (dashboard, wizard, all entries)
- Daily Needs gate entry with categories
- 10% tolerance for received quantity in PO processing

### Changed
- Refactored gate module into config-driven wizard architecture
- Shared Step1/Step2 pages across all entry types
- Updated sidebar navigation with collapsible submenus

---

## [0.2.0] - 2024-12 (Gate Module Foundation)

### Added
- Gate module with Raw Material entry multi-step wizard
  - Vehicle, Security, PO Receipt, Arrival Slip, Weighment, Review steps
  - Vehicle, Driver, Transporter CRUD with SearchableSelect components
  - Security check approval workflow
- Comprehensive project documentation
  - Architecture overview, folder structure, module boundaries
  - API overview and authentication docs
  - State management guide
  - Code style and contributing guides
- PWA support with service worker
- DateRangePicker component

---

## [0.1.0] - 2024-11 (Initial Release)

### Added
- Authentication system with JWT (login, logout, token refresh)
- Company-based multi-tenant support with Company-Code header
- Permission system with Django-format permission strings
- Sidebar navigation with role-based menu filtering
- Base project setup: React 19 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- Redux Toolkit for auth state, React Query for server state
- Axios client with request/response interceptors
- Module registry architecture
- CI/CD with GitHub Actions deployment
