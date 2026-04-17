# OpenWMS.org - Complete Feature & Architecture Analysis

> **Source:** [github.com/openwms/org.openwms](https://github.com/openwms/org.openwms)
> **Version:** 3.1.0-SNAPSHOT
> **License:** Apache 2.0 (public modules), GPLv3 (private/enterprise modules)
> **Analysis Date:** 2026-04-17

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Four Core Domains](#3-four-core-domains)
4. [All Microservices (30+)](#4-all-microservices)
5. [WMS Domain Services (Warehouse Management)](#5-wms-domain-services)
6. [TMS Domain Services (Transport/Material Flow)](#6-tms-domain-services)
7. [COMMON Domain Services](#7-common-domain-services)
8. [CORE Domain Services (Infrastructure)](#8-core-domain-services)
9. [ERP Integration Adapters](#9-erp-integration-adapters)
10. [Communication & Messaging](#10-communication--messaging)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Deployment Options](#12-deployment-options)
13. [Core Utility Library (org.openwms.core.util)](#13-core-utility-library)
14. [Technology Stack](#14-technology-stack)
15. [Quality Goals & Non-Functional Requirements](#15-quality-goals--non-functional-requirements)
16. [External System Integrations](#16-external-system-integrations)
17. [Relevance to FactoryFlow WMS](#17-relevance-to-factoryflow-wms)

---

## 1. Project Overview

OpenWMS.org is a **free-to-use, extensible Warehouse Management System (WMS)** with a **Material Flow Control (MFC)** system for both automatic and manual warehouses. It has been in development since 2005 and has gone through multiple architecture generations:

| Era | Architecture |
|-----|-------------|
| 2005 | J2EE / EJB 2.1 / Hibernate / JSF |
| 2007 | Spring Framework + EJB 3.0 |
| 2010s | Spring + OSGi (Spring dmServer) |
| Transition | Fat WAR on servlet containers (Tomcat) |
| **Current** | **Spring Boot Microservices (Twelve-Factor)** |

### Key Design Principles
- **Flexible & Modular:** Every functional module (Picking, Receiving, Shipping, etc.) can be included or omitted per project
- **Free-to-use:** Apache 2.0 license for public modules; consultancies/integrators can customize and sell
- **Cloud-native:** Designed for Kubernetes (AKS, EKS, OpenShift) but can run on bare metal
- **Database per service:** Each microservice owns its tables with naming prefixes; cross-service table relationships are forbidden

---

## 2. Architecture

### Architectural Style
- **Microservices** following the [Twelve-Factor](https://12factor.net) methodology
- Each service has its own SDLC, repository, API versioning, and data store
- Communication: Synchronous (REST) + Asynchronous (RabbitMQ/AMQP)
- Directed synchronous calls flow **north-to-south** and **west-to-east**
- Asynchronous events/commands flow in **all directions**

### Four Domains (Layers)

```
+------------------+
|       ERP        |  (External - sends warehouse orders)
+------------------+
        |
+------------------+
|   WMS Domain     |  Picking, Receiving, Shipping, Inventory, Movements
+------------------+
        |
+------------------+
|   TMS Domain     |  Transportation, Routing, Material Flow Control
+------------------+
        |
+------------------+
|  COMMON Domain   |  Locations, LocationGroups, TransportUnits (always present)
+------------------+
        |
+------------------+
|   CORE Domain    |  UAA, Preferences, Printing, i18n (optional infrastructure)
+------------------+
        |
+------------------+
|   Subsystems     |  PLC, sensors, Raspberry Pi, Revolution Pi, robots
+------------------+
```

### Information Flow Rules
- **WMS** calls **COMMON** and **TMS** (synchronously)
- **TMS** calls **COMMON** (synchronously)
- **COMMON** does NOT call WMS or TMS - it only publishes events outward
- **Asynchronous events** can flow in any direction via RabbitMQ

---

## 3. Four Core Domains

### 3.1 WMS Domain (Warehouse Management)
Implements all standard warehouse processes. Interacts with the ERP layer and orchestrates TMS/COMMON.

**Processes covered:**
- Receiving (inbound goods)
- Shipping (outbound goods)
- Inventory management (products, stock)
- Picking (order fulfillment)
- Putaway (storage allocation)
- Movements (stock transfers)
- Partner management
- Truck management
- Task orchestration

### 3.2 TMS Domain (Transport Management / Material Flow Control)
Handles movement of transport units through automated and manual warehouses.

**Processes covered:**
- Transport Order management (create, redirect, state changes, priority)
- Routing (material flow control logic, BPMN-driven)
- PLC communication (OSIP protocol over TCP/IP)
- Telegram handling (REQ, SYNQ, SYSU telegram types)

### 3.3 COMMON Domain (Essential Shared Services)
Always present in every project. Manages the physical warehouse model.

**Core entities:**
- **Locations** - Physical storage positions in the warehouse
- **LocationGroups** - Logical groupings of locations
- **TransportUnits** - Physical containers/pallets/bins that move through the warehouse
- TCP/IP driver for PLC communication (OSIP protocol)
- Transaction logging

### 3.4 CORE Domain (Infrastructure)
Optional infrastructure services, not warehouse-specific.

**Services:**
- User Authentication & Authorization (UAA)
- Preferences/Configuration management
- Printing/Label generation
- Translation/i18n
- Unit of Measure library
- Shared utility library

---

## 4. All Microservices

### Complete Service Inventory

| # | Service | Domain | Repository | Access | License |
|---|---------|--------|-----------|--------|---------|
| 1 | Service Registry | Infra | org.openwms.services | Public | Apache-2.0 |
| 2 | Configuration Service | Infra | org.openwms.configuration | Public | Apache-2.0 |
| 3 | Gateway Service | Infra | org.openwms.gateway | Public | Apache-2.0 |
| 4 | Gateway ENTERPRISE | Infra | org.openwms.gateway (interface21-io) | Private | GPLv3 |
| 5 | Auth Service | Infra | org.openwms.auth | Private | GPLv3 |
| 6 | UAA Service | CORE | org.openwms.core.uaa | Public | Apache-2.0 |
| 7 | Preference Service | CORE | org.openwms.core.preferences | Public | Apache-2.0 |
| 8 | Printing Service | CORE | org.openwms.core.printing | Private | GPLv3 |
| 9 | Translation Service | CORE | org.openwms.core.lang | Private Preview | Apache-2.0 |
| 10 | Unit of Measure Library | CORE | org.openwms.core.units | Public | Apache-2.0 |
| 11 | ArchUnit Test Library | CORE | org.openwms.core.test.arch | Public | Apache-2.0 |
| 12 | Common Service | COMMON | org.openwms.common.service | Public | Apache-2.0 |
| 13 | OSIP/TCP Driver | COMMON | org.openwms.common.comm | Public | Apache-2.0 |
| 14 | OPCUA Driver | COMMON | org.openwms.common.opcua | Private Preview | Apache-2.0 |
| 15 | Transaction Service | COMMON | org.openwms.common.transactions | Private Preview | Apache-2.0 |
| 16 | Common Tasks Service | COMMON | org.openwms.common.tasks | Public | Apache-2.0 |
| 17 | Transportation Service | TMS | org.openwms.tms.transportation | Public | Apache-2.0 |
| 18 | TMS Routing | TMS | org.openwms.tms.routing | Public | Apache-2.0 |
| 19 | Receiving Service | WMS | org.openwms.wms.receiving | Public | Apache-2.0 |
| 20 | Inventory Service | WMS | org.openwms.wms.inventory | Private Preview | Apache-2.0 |
| 21 | Picking Library | WMS | org.openwms.wms.picking | Private | GPLv3 |
| 22 | Movements Service | WMS | org.openwms.wms.movements | Public | Apache-2.0 |
| 23 | WMS Tasks Service | WMS | org.openwms.wms.tasks | Private Preview | Apache-2.0 |
| 24 | Partner Service | WMS | org.openwms.wms.partners | Private Preview | Apache-2.0 |
| 25 | Trucks Service | WMS | org.openwms.wms.trucks | Private Preview | Apache-2.0 |
| 26 | Shipping Service | WMS | org.openwms.wms.shipping | Private Preview | Apache-2.0 |
| 27 | Putaway Library | WMS | org.openwms.wms.putaway | Private | GPLv3 |
| 28 | SAP Adapter | WMS | org.openwms.wms.sap | Private | GPLv3 |
| 29 | Dynamics Adapter | WMS | org.openwms.wms.msdynamics | Private | GPLv3 |
| 30 | NetSuite Adapter | WMS | org.openwms.wms.netsuite | Private | GPLv3 |
| 31 | WMS Orchestrator | WMS | org.openwms.wms.orchestrator | Private Preview | Apache-2.0 |

---

## 5. WMS Domain Services (Warehouse Management)

### 5.1 Receiving Service (`org.openwms.wms.receiving`)
**Access:** Public | **License:** Apache-2.0

Handles all inbound warehouse processes:
- Receipt announcements (ASN - Advanced Shipping Notices)
- Goods receipt processing
- Inbound order management
- Consumes events from other services
- Directly calls APIs of COMMON and Inventory services

### 5.2 Inventory Service (`org.openwms.wms.inventory`)
**Access:** Private Preview | **License:** Apache-2.0

Manages warehouse inventory:
- Product master data management
- Stock level tracking
- Inventory counts/adjustments
- Triggered by events from other components (receiving, movements, etc.)

### 5.3 Picking Library (`org.openwms.wms.picking`)
**Access:** Private | **License:** GPLv3

Order fulfillment/picking processes:
- Pick list generation
- Pick wave management
- Pick-to-order / pick-to-cart workflows

### 5.4 Movements Service (`org.openwms.wms.movements`)
**Access:** Public | **License:** Apache-2.0

Internal stock movement management:
- Stock relocations within the warehouse
- Replenishment movements
- Zone-to-zone transfers
- Triggers transport orders in TMS

### 5.5 Shipping Service (`org.openwms.wms.shipping`)
**Access:** Private Preview | **License:** Apache-2.0

Outbound/dispatch processes:
- Shipping order management
- Dispatch processing
- Outbound dock management
- Triggers movements for outbound flow

### 5.6 Putaway Library (`org.openwms.wms.putaway`)
**Access:** Private | **License:** GPLv3

Storage allocation logic:
- Putaway strategy algorithms
- Location assignment for inbound goods
- Storage optimization

### 5.7 Partner Service (`org.openwms.wms.partners`)
**Access:** Private Preview | **License:** Apache-2.0

Business partner management:
- Supplier/vendor information
- Customer information
- Partner-specific warehouse configurations

### 5.8 Trucks Service (`org.openwms.wms.trucks`)
**Access:** Private Preview | **License:** Apache-2.0

Truck/vehicle management:
- Dock door scheduling
- Truck arrival/departure tracking
- Loading/unloading coordination

### 5.9 WMS Tasks Service (`org.openwms.wms.tasks`)
**Access:** Private Preview | **License:** Apache-2.0

Task management and assignment:
- Warehouse task creation and tracking
- Worker assignment
- Task prioritization and scheduling

### 5.10 WMS Orchestrator (`org.openwms.wms.orchestrator`)
**Access:** Private Preview | **License:** Apache-2.0

High-level process orchestration:
- Coordinates multi-step warehouse processes
- Manages workflow execution across services
- ERP order decomposition into warehouse tasks

---

## 6. TMS Domain Services (Transport/Material Flow)

### 6.1 Transportation Service (`org.openwms.tms.transportation`)
**Access:** Public | **License:** Apache-2.0

Core transport order management:
- **Transport Order (TO) lifecycle:** Create, redirect, state changes, priority changes
- **Transport Unit tracking:** Movement of physical containers through warehouse
- **State machine:** Manages TO states (CREATED -> STARTED -> FINISHED / ONFAILURE)
- Directly uses COMMON Service APIs for Location and TransportUnit data
- Functions: Create TO, Change TU for TO, Request TO state change, Redirect TO, Report problem, Change TO priority

### 6.2 TMS Routing (`org.openwms.tms.routing`)
**Access:** Public | **License:** Apache-2.0

Material flow control logic:
- **Route definitions:** Configurable routing rules for transport units
- **BPMN workflow integration:** Supports Activiti, Flowable, and Camunda engines for routing decisions
- **Telegram handling:** Processes REQ (request), SYNQ (synchronization), SYSU (system update) telegrams
- Performance target: **< 200ms response time** for material flow requests
- Uses APIs of multiple other services indirectly

---

## 7. COMMON Domain Services

### 7.1 Common Service (`org.openwms.common.service`)
**Access:** Public | **License:** Apache-2.0

The essential service present in every OpenWMS deployment:
- **Location management:** Physical storage positions (bins, shelves, floor positions)
- **LocationGroup management:** Logical groupings of locations (aisles, zones, areas)
- **TransportUnit management:** Physical containers (pallets, totes, bins) with barcodes
- Publishes events to all surrounding services
- Does NOT depend on or call any other service
- Owns the `common.tu.commands` RabbitMQ exchange for TU command messages

### 7.2 OSIP/TCP Driver (`org.openwms.common.comm`)
**Access:** Public | **License:** Apache-2.0

Communication driver for PLC/subsystem integration:
- Implements the [OSIP protocol](https://interface21-io.gitbook.io/osip/) over TCP/IP
- Forwards incoming messages to routing components (TMS Routing)
- Handles telegram types: REQ_ (request), SYNQ (sync), SYSU (system update)
- Supports both proprietary PLCs and open hardware (Raspberry Pi, Revolution Pi)

### 7.3 OPCUA Driver (`org.openwms.common.opcua`)
**Access:** Private Preview | **License:** Apache-2.0

OPC-UA protocol driver for industrial automation communication.

### 7.4 Transaction Service (`org.openwms.common.transactions`)
**Access:** Private Preview | **License:** Apache-2.0

Audit trail and transaction logging across services.

### 7.5 Common Tasks Service (`org.openwms.common.tasks`)
**Access:** Public | **License:** Apache-2.0

Shared task management primitives used across domains.

---

## 8. CORE Domain Services (Infrastructure)

### 8.1 UAA Service (`org.openwms.core.uaa`)
**Access:** Public | **License:** Apache-2.0

User Authentication & Authorization:
- User management (CRUD, state changes)
- Role management (with cache eviction on changes)
- Security/authentication

### 8.2 Preference Service (`org.openwms.core.preferences`)
**Access:** Public | **License:** Apache-2.0

Configuration and preference management:
- Application-level preferences
- User-level preferences
- Configuration change events (ConfigurationChangedEvent)
- File-based preference reloading

### 8.3 Printing Service (`org.openwms.core.printing`)
**Access:** Private | **License:** GPLv3

Label and document printing:
- Delivery slips
- Tracking notes
- Reports
- Connects to printer hardware directly or via print servers

### 8.4 Translation Service (`org.openwms.core.lang`)
**Access:** Private Preview | **License:** Apache-2.0

Internationalization (i18n) support:
- Multi-language translations
- All error messages standardized in US-English

### 8.5 Unit of Measure Library (`org.openwms.core.units`)
**Access:** Public | **License:** Apache-2.0

Measurement and unit handling:
- BaseUnit definitions (weight, length, volume, etc.)
- Magnitude + Unit pairings (e.g., 42 grams)
- Unit conversion between types
- Quantity handling for inventory

### 8.6 Infrastructure Services

| Service | Purpose |
|---------|---------|
| **Service Registry** (org.openwms.services) | Eureka-based service discovery |
| **Configuration Service** (org.openwms.configuration) | Centralized Spring Cloud Config server |
| **Gateway Service** (org.openwms.gateway) | API Gateway for routing external requests |
| **Auth Service** (org.openwms.auth) | Authentication service (private/enterprise) |

---

## 9. ERP Integration Adapters

OpenWMS provides dedicated adapters for major ERP systems:

| Adapter | ERP System | Access | License |
|---------|-----------|--------|---------|
| **SAP Adapter** | SAP ERP/S4HANA | Private | GPLv3 |
| **Dynamics Adapter** | Microsoft Dynamics | Private | GPLv3 |
| **NetSuite Adapter** | Oracle NetSuite | Private | GPLv3 |

### Integration Patterns with ERP
- **Transfer Tables:** Shared database tables for batch data exchange
- **RFC (Remote Function Call):** TCP/IP-based direct communication
- **Web Services (REST/SOAP):** HTTP-based real-time communication
- Communication is **bidirectional**: ERP sends orders to WMS, WMS sends status/updates back

---

## 10. Communication & Messaging

### 10.1 Synchronous Communication (REST)
- DTOs called **View Objects (VO):** `LocationVO`, `LocationGroupVO`, `TransportUnitVO`
- VOs may include hypermedia links (HAL/HATEOAS), JSON mapping annotations
- API versioned (e.g., `/v1/transport-units/`)
- Idempotence considered for POST and PATCH operations

### 10.2 Asynchronous Communication (RabbitMQ/AMQP)
- DTOs called **Message Objects (MO):** `LocationMO`, `TUCommand`, etc.
- Wire format: **JSON** (language-agnostic)
- RabbitMQ exchanges owned by the publishing service (e.g., `common.tu.commands` owned by COMMON)
- Queues are private to consuming services (never shared)
- Exchanges act as intermediary routers/filters

### 10.3 Context Data (Headers)
- **HTTP:** Custom headers like `X-Tenant` for multi-tenancy
- **AMQP:** Headers like `osip_tenant` for tenant identification
- Tracing headers: `x-span-id`, `x-trace-id` for distributed tracing
- Context data is enriched by each service in the call chain

### 10.4 WebSocket Events
- User interfaces can receive real-time events via WebSockets from OpenWMS services

### 10.5 Anti-Corruption Layer (ACL)
- Each consuming service transforms received VO/MO structures into its own internal data structures
- External types (VO, MO) must NOT be used internally within a service

---

## 11. Error Handling Strategy

### 11.1 REST API Errors
Follows **RFC 7807 (Problem Details for HTTP APIs)**:

```json
{
  "type": "https://api.openwms.dev/meta/v1/error/AlreadyExistsException",
  "title": "AlreadyExistsException",
  "status": 500,
  "detail": "The TransportUnit with Barcode [S000005270119225] already exists",
  "messageKey": "E0033",
  "messageLanguage": "en-US",
  "messageCategory": "ERROR",
  "args": ["S000005270119225"],
  "call": {
    "headers": { "x-span-id": "...", "x-trace-id": "..." },
    "uri": "https://api.openwms.dev/v1/transport-units/...",
    "method": "POST"
  }
}
```

### 11.2 AMQP Message Error Strategies

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| **Re-Queue** | Message stays in queue, retried with exponential backoff | When sender will NOT repeat; message must not be lost |
| **Throw-Away** | Message acknowledged and removed without processing | When sender repeats automatically (e.g., PLC every 150ms) |
| **Dead-Letter Forward** | Failed message forwarded to dead-letter queue | When message must be preserved but shouldn't block queue |

### 11.3 Retry Configuration
```
ExponentialBackOffPolicy:
  - Initial Interval: 500ms
  - Multiplier: 2x
  - Max Interval: 15,000ms (15 seconds)
```

### 11.4 Exception Hierarchy
- `DomainModelException` - Checked exceptions for domain layer
- `IntegrationLayerException` > `DataNotFoundException`, `NoUniqueResultException`
- `ServiceLayerException` > `RemovalNotAllowedException`
- `BusinessRuntimeException`, `TechnicalRuntimeException` - Runtime exceptions
- `HttpBusinessException` - Maps business exceptions to HTTP status codes
- `BehaviorAwareException` - Exceptions with behavioral metadata
- Error codes: `TECHNICAL_RT_ERROR`, `INVALID_PARAMETER_ERROR`, `VALIDATION_ERROR`

---

## 12. Deployment Options

### 12.1 On-Premise Single Server
- All microservices on one physical/virtual server
- Communication is in-memory (no external network needed)
- Services run as Unix daemons or Windows services
- Optional: Docker Compose for better operability
- **Best for:** Simple projects, single warehouse, dedicated IT team

### 12.2 On-Premise Multi-Server (Distributed)
- Services distributed across Docker Swarm or Kubernetes nodes
- Container scheduler handles distribution, restarts, monitoring
- RabbitMQ and database shared transparently across nodes
- **Best for:** High reliability requirements, multi-warehouse, existing container infrastructure

### 12.3 Cloud Deployment (Azure AKS)
- Full Kubernetes deployment on Azure AKS
- Also supports AWS EKS and Red Hat OpenShift
- **Best for:** Cloud-first organizations, elastic scaling

### 12.4 Hybrid Deployment
- Split between on-premise and cloud
- TMS/COMMON close to hardware for low latency
- WMS/reporting in cloud for flexibility
- **Best for:** Automated warehouses needing <200ms PLC response + cloud analytics

---

## 13. Core Utility Library (`org.openwms.core.util`)

This is the only module included directly in the cloned repository. It provides the foundational utilities used by all other OpenWMS services.

### 13.1 Event System
| Component | Type | Purpose |
|-----------|------|---------|
| `EventBroker` | Interface | Subscribe/unsubscribe event listeners |
| `EventDispatcher` | Interface | Extends EventBroker with dispatch capability |
| `EventListener` | Interface | Single-method contract for handling events |
| `EventPublisher<T>` | Interface | Generic publisher for application events |
| `SimpleEventDispatcher` | Component | In-memory synchronous event dispatch (HashMap-based) |
| `NonBlockingEventPublisherImpl` | Component | Async event publishing with @Async |
| `RootApplicationEvent` | Class | Base class for all OpenWMS events |
| `RootNotification` | Class | Serializable notification wrapper |

**Domain Events:**
- `ConfigurationChangedEvent` - Preferences/configuration changed
- `MergePropertiesEvent` - Bundle startup property merge
- `ReloadFilePreferencesEvent` - File-based preference reload
- `RoleChangedEvent` - Role entity changes (cache eviction)
- `UserChangedEvent` - User entity changes

### 13.2 AOP & Annotations
| Annotation | Level | Purpose |
|-----------|-------|---------|
| `@FireAfterTransaction` | Method | Fire events synchronously after TX commit |
| `@FireAfterTransactionAsynchronous` | Method | Fire events asynchronously after TX commit |
| `@Workflow` | Type | Marks bean as BPMN workflow-enabled |

### 13.3 Web Controller Utilities (`AbstractWebController`)
Base controller providing:
- **Exception handlers** for: `BehaviorAwareException`, `RemovalNotAllowedException`, `BusinessRuntimeException`, `HttpBusinessException`, `TechnicalRuntimeException`, `IllegalArgumentException`, `MethodArgumentNotValidException`, `ValidationException`, `ConstraintViolationException`, and generic `Exception`
- **Response builders:** `buildOKResponse()`, `buildNOKResponse()`, `buildResponse(HttpStatus, String)`
- **Location header generation** with X-Forwarded-* proxy header support
- **Message translation** via Spring MessageSource

### 13.4 Domain Modeling
| Class/Interface | Purpose |
|----------------|---------|
| `DomainObject<ID>` | Contract for all persisted entities (`isNew()`, `getVersion()`, `getId()`) |
| `TreeNode<T>` / `TreeNodeImpl<T>` | Hierarchical tree structure (LinkedHashMap-based) |
| `OnRemovalListener<T>` | Entity deletion prevention hook |
| `RemovalNotAllowedException` | Thrown when deletion is blocked |
| `ImageProvider` | Image storage contract (`getImage()`, `setImage(byte[])`) |

### 13.5 Value Objects & Measurements
| Class/Interface | Purpose |
|----------------|---------|
| `Measurable<V, E, T>` | Generic measurement with magnitude + unit + conversion |
| `BaseUnit<T>` | Unit type definition (e.g., grams, kilograms) |
| `AbstractMeasure` | Base interface for all measurements |
| `PriorityLevel` (Enum) | LOWEST(10), LOW(20), NORMAL(30), HIGH(40), HIGHEST(50) |
| `CoreTypeDefinitions` | DB field length constants (DESCRIPTION=1024, QUANTITY=16) |

### 13.6 Time Utilities (`TimeProvider`)
Format patterns:
- `DATE_FORMAT`: `yyyy-MM-dd`
- `DATE_TIME_FORMAT`: `yyyy-MM-dd HH:mm:ss`
- `DATE_TIME_MILLIS_FORMAT`: `yyyy-MM-dd HH:mm:ss.SSS`
- `DATE_TIME_WITH_TIMEZONE_FORMAT`: `yyyy-MM-dd'T'HH:mm:ssXXX`

Methods: `nowAsCurrentDate()`, `nowAsZuluDate()`, `nowAsCurrentZonedDateTime()`, `nowAsZuluZonedDateTime()`, `nowAsCurrentInstant()`, `nowAsZuluInstant()`

### 13.7 Other Utilities
| Class | Purpose |
|-------|---------|
| `SecurityUtils` | HTTP Basic Auth header generation (Base64) |
| `CollectionUtil` | `getFirstOrNull(List)`, `asHashMap(List, Extractor)` |
| `Triple<K, V, T>` | Immutable 3-tuple record |
| `SpringProfiles` | Profile constants: DISTRIBUTED, ASYNCHRONOUS, NOT_ASYNCHRONOUS, SYNCHRONOUS, NOT_MANAGED, IN_MEMORY |
| `JSONConfiguration` | Jackson date/time serialization config |
| `EnversIntegrator` | Hibernate Envers audit trail registration |

---

## 14. Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Spring Boot, Spring Cloud, Spring Data, Spring Integration, Spring Security, Spring AMQP |
| **API** | REST (HAL/HATEOAS), WebSocket |
| **Messaging** | RabbitMQ (AMQP) |
| **Persistence** | Jakarta Persistence API (JPA/Hibernate), Hibernate Envers (auditing) |
| **Databases** | PostgreSQL, H2 (dev), MongoDB (some services) |
| **Workflow/BPMN** | Activiti, Flowable, Camunda |
| **Service Discovery** | Eureka (Netflix OSS) |
| **Config** | Spring Cloud Config Server |
| **Gateway** | Spring Cloud Gateway |
| **PLC Communication** | OSIP protocol (TCP/IP), OPC-UA |
| **Build** | Maven, Java |
| **Docs** | AsciiDoc (arc42 template), docToolchain |
| **Container** | Docker, Docker Compose, Docker Swarm |
| **Orchestration** | Kubernetes (AKS, EKS, OpenShift) |
| **Error Format** | RFC 7807 (Problem Details for HTTP APIs) |
| **Testing** | JUnit 5, ArchUnit, Spring Test |

---

## 15. Quality Goals & Non-Functional Requirements

| Domain | Priority | Characteristic | Requirement |
|--------|----------|---------------|-------------|
| WMS | High | Accountability | Durably store who triggered what critical operation and when |
| TMS | High | Performance | Material flow requests (REQ telegrams) answered in < 200ms |
| TMS | High | Availability | TMS critical processes must NOT depend on WMS availability |
| General | High | Performance | Order processing in each domain must not affect other domains |
| General | Medium | Reliability | Software changes applied with zero downtime; unchanged parts unaffected |
| General | Medium | Portability | No dependency on specific runtime platform |
| General | Medium | Installability | System can be split across platforms (some parts close to hardware) |
| General | Low | Extendability | Highly extendable in customer projects |

---

## 16. External System Integrations

### Connected Systems

| System | Direction | Protocol | Purpose |
|--------|-----------|----------|---------|
| **ERP (SAP/Dynamics/NetSuite)** | Bidirectional | Transfer tables, RFC, REST/SOAP | Warehouse orders in, status updates out |
| **MES** | MES -> TMS | HTTP Web Services | Manufacturing orders to production lanes |
| **PLC/Subsystems** | Bidirectional | OSIP (TCP/IP), OPC-UA | Sensor data in, actuator commands out |
| **Printing Systems** | WMS -> Printer | TCP/IP (RFC) | Labels, delivery slips, reports |
| **Operational UI** | Bidirectional | REST, WebSocket | Picking, clearing, receipts for operators |
| **Administration UI** | Bidirectional | REST | Reports, order management, configuration |

### User Interface Types
1. **Operational UI** - For warehouse floor operators (picking, receiving, clearing)
2. **Administration UI** - For system administrators (reports, order management, workplace config)

---

## 17. Relevance to FactoryFlow WMS

### Features Directly Applicable to Our SAP-Integrated WMS

| OpenWMS Feature | FactoryFlow Relevance | Priority |
|----------------|----------------------|----------|
| **Receiving Service** | Maps to our GRPO module (already built) | Already Done |
| **SAP Adapter patterns** | Bidirectional SAP integration (RFC, transfer tables, REST) | High |
| **Location/LocationGroup model** | Warehouse location hierarchy for bin management | High |
| **TransportUnit model** | Pallet/container tracking with barcodes | High |
| **Inventory Service** | Stock tracking, product management | High |
| **Movements Service** | Stock transfers, replenishment | High |
| **Transport Order lifecycle** | Material movement tracking and state management | Medium |
| **RFC 7807 error format** | Standardized API error handling | Medium |
| **Event-driven architecture** | Real-time updates between modules | Medium |
| **Picking/Putaway** | Required - order fulfillment and storage allocation | High |
| **Shipping Service** | Required - outbound/dispatch processes | High |
| **Truck management** | Dock scheduling | Future |
| **Multi-warehouse support** | Required - single factory but multiple warehouses to manage | High |

### Architecture Patterns to Adopt
1. **Domain separation** (COMMON/TMS/WMS) - Clean module boundaries
2. **VO/MO pattern** - Separate DTOs for REST vs messaging
3. **Anti-Corruption Layer** - Transform external types at service boundaries
4. **Event-driven updates** - React to changes across modules
5. **Database table prefixing** - Each module owns its tables with prefixes
6. **RFC 7807 errors** - Standardized error format for our APIs

### Key Differences for FactoryFlow
- We're building a **monolithic React + Node.js app**, not Java microservices
- Our SAP integration is via **SAP Service Layer REST API**, not RFC/transfer tables
- We need **mobile-first** UI (tablets on warehouse floor), not just desktop
- Our scale is **single factory**, not multi-warehouse enterprise

---

## Appendix: Java Package Convention

```
org.openwms
├── core/          # CORE domain types
├── common/        # COMMON domain types
├── tms/           # TMS domain types
├── wms/           # WMS domain types
│   ├── api/       # Public API types (VOs, exported interfaces)
│   ├── app/       # Application lifecycle/configuration
│   ├── commands/  # Command types and handlers
│   ├── config/    # Spring Boot configuration classes
│   ├── events/    # Internal and external event types
│   └── impl/      # Internal implementation details
```
