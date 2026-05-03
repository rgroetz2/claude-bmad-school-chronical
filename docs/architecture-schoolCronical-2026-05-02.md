# System Architecture: SchoolCronicle

**Date:** 2026-05-02
**Architect:** rudolfgroetz
**Version:** 1.0
**Project Type:** Web Application
**Project Level:** 3 (Complex Integration, 12–40 stories)
**Status:** Draft

---

## Document Overview

This document defines the system architecture for SchoolCronicle V1. It provides the technical blueprint for implementation, addressing all functional and non-functional requirements from the PRD.

**Related Documents:**
- Product Requirements Document: `docs/prd-schoolCronical-2026-05-02.md`
- Product Brief: `docs/product-brief-schoolCronical-2026-05-02.md`

---

## 1. Architectural Drivers

The following NFRs most heavily shape architectural decisions:

| Driver | Source | Implication |
|--------|--------|-------------|
| GDPR compliance | NFR-001 | Consent audit trail, right-to-erasure, personal data segregation, local data residency |
| Image storage at scale | FR-008, NFR-008 | Dedicated object storage (MinIO), not database BLOBs |
| Export pipeline stability | FR-013, NFR-011 | Versioned structured export, async generation for large datasets |
| Low-tech UX | NFR-004 | Stable Angular forms, real-time validation, minimal UI state complexity |
| 99% school-hours uptime | NFR-007 | Docker health checks, graceful error recovery, restart policies |
| Local-only deployment | Constraint | No cloud services; all infrastructure self-hosted via Docker Compose |
| ~100 concurrent users max | NFR-009 | No need for microservices; modular monolith is appropriate |

**Architecture philosophy:** This is a **data-integrity and compliance-first** application. Optimise for correctness, GDPR auditability, and maintainability — not raw scale.

---

## 2. Architecture Pattern

**Pattern:** Modular Monolith

A single deployable backend unit with clear internal module boundaries. Microservices are explicitly rejected for V1:
- School-scale load (≤100 concurrent users) does not justify distributed system complexity
- Single team, hard August 2026 deadline — operational simplicity is critical
- Module boundaries are enforced in code; extraction to services is possible post-V1 if needed

**Modules within the monolith:**
1. `auth` — Authentication, session management, password reset
2. `users` — Account management, role assignment
3. `schools` — School registry CRUD
4. `persons` — Person registry CRUD, GDPR deletion
5. `contributions` — Contribution workflow, state machine, validation
6. `media` — Image upload, format/size validation, MinIO integration, consent linkage
7. `export` — Structured data export, print-ready output generation
8. `gdpr` — Consent records, data subject rights orchestration
9. `admin` — Appointment type management, system configuration

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Local Network                      │
│                                                      │
│  ┌──────────────┐        ┌──────────────────────┐   │
│  │   Angular     │ HTTPS  │     NestJS API        │   │
│  │   Frontend    │◄──────►│   (Modular Monolith)  │   │
│  │  (port 4200)  │        │     (port 3000)        │   │
│  └──────────────┘        └──────────┬───────────┘   │
│                                     │                │
│              ┌──────────────────────┼──────────┐     │
│              │                      │          │     │
│     ┌────────▼──────┐   ┌───────────▼───┐  ┌──▼───┐ │
│     │  PostgreSQL    │   │     MinIO     │  │Redis │ │
│     │  (port 5432)   │   │  (port 9000)  │  │ 6379 │ │
│     │  Primary data  │   │ Image storage │  │Cache │ │
│     └───────────────┘   └───────────────┘  └──────┘ │
│                                                      │
│  ┌──────────────┐   ┌─────────────────┐             │
│  │  Nginx        │   │  Uptime Kuma    │             │
│  │  Reverse      │   │  (port 3001)    │             │
│  │  Proxy        │   │  Monitoring     │             │
│  └──────────────┘   └─────────────────┘             │
└─────────────────────────────────────────────────────┘
```

**Data flow:**
1. Browser → Nginx (TLS termination, reverse proxy)
2. Nginx → Angular SPA (static files) or → NestJS API
3. NestJS → PostgreSQL (structured data)
4. NestJS → MinIO (image files, streamed)
5. NestJS → Redis (sessions, rate limiting, job state)
6. NestJS → Local SMTP (password reset emails)

---

## 4. Technology Stack

### Frontend

**Choice:** Angular 18+ with TypeScript

**Rationale:**
- Confirmed by product owner
- Strong reactive forms with built-in validation — critical for low-tech UX (NFR-004)
- Angular Material component library for accessible, consistent UI (NFR-005)
- TypeScript end-to-end consistency with NestJS backend
- Good PWA support for future mobile browser optimisation

**Trade-offs:**
- ✓ Opinionated structure reduces decision fatigue
- ✗ Heavier initial bundle than React/Svelte; mitigated by lazy loading modules

**Libraries:**
- `@angular/material` — UI components (accessibility, form controls)
- `@angular/forms` — Reactive forms with real-time validation
- `ngx-file-upload` or custom — Image upload with progress (FR-008)
- `@angular/router` — Client-side routing

---

### Backend

**Choice:** NestJS (Node.js 20 LTS) with TypeScript

**Rationale:**
- Modular architecture by design — maps directly to the 9 domain modules
- Decorator-based Guards, Pipes, and Interceptors for RBAC, validation, and logging (FR-001, FR-020, NFR-002)
- Excellent TypeORM integration for PostgreSQL
- Strong validation via `class-validator` — enforces FRs at API boundary
- Active community, mature ecosystem, good documentation

**Trade-offs:**
- ✓ Structure enforces clean architecture without team discipline overhead
- ✗ Slightly more ceremony than Express for simple endpoints; worth it at Level 3

**Key Libraries:**
- `@nestjs/jwt` + `@nestjs/passport` — JWT auth (FR-001, FR-002)
- `TypeORM` — ORM with migration support
- `class-validator` + `class-transformer` — DTO validation (FR-019)
- `@nestjs/throttler` — Rate limiting (NFR-002)
- `multer` + `minio` SDK — Image upload pipeline (FR-008)
- `helmet` — Security headers (FR-020)
- `pdfkit` or `puppeteer` — Print-ready export generation (FR-014)
- `winston` — Structured logging

---

### Database

**Choice:** PostgreSQL 16

**Rationale:**
- Relational model fits structured contributions, persons, schools with foreign key integrity
- Strong JSON/JSONB support for flexible export data and audit logs
- Excellent TypeORM support with migrations
- GDPR: row-level audit columns (`created_at`, `updated_at`, `deleted_at` soft-delete) are straightforward
- Proven reliability for self-hosted deployments

**Trade-offs:**
- ✓ ACID guarantees critical for submission state machine (FR-010)
- ✗ Schema migrations require care; TypeORM migrations handle this

**Key Design Decisions:**
- Soft deletes (`deleted_at`) on all personal data tables for GDPR (FR-012)
- Audit columns on all tables (`created_at`, `updated_at`, `created_by`)
- UUID primary keys (not sequential integers) to avoid enumeration attacks

---

### Object Storage

**Choice:** MinIO (self-hosted, S3-compatible)

**Rationale:**
- Local-only deployment constraint: no AWS S3
- MinIO provides identical S3-compatible API — NestJS SDK code is identical
- Images must not live in PostgreSQL (performance, backup size, GDPR purge complexity)
- MinIO supports bucket policies, lifecycle rules (GDPR retention), and server-side encryption

**Trade-offs:**
- ✓ Full control, no egress costs, GDPR data never leaves local network
- ✗ Requires local disk provisioning and backup strategy for image files

**Bucket structure:**
```
schoolchronicle/
├── contributions/{contributionId}/{filename}    # Active images
└── gdpr-archive/                               # Anonymised/deleted records log
```

---

### Cache & Session Store

**Choice:** Redis 7

**Rationale:**
- JWT refresh token storage and revocation (logout invalidation — FR-001)
- Rate limiting counters for brute-force protection (NFR-002)
- Export job state for async large exports
- Session expiry management

**Trade-offs:**
- ✓ Fast in-memory store; ephemeral data only — no persistence risk
- ✗ Additional service to operate; Docker Compose makes this trivial

---

### Reverse Proxy & TLS

**Choice:** Nginx

**Rationale:**
- TLS termination (HTTPS — NFR-002, FR-020)
- Serves Angular SPA static files
- Proxies `/api/*` to NestJS
- Gzip compression for performance (NFR-003)
- Rate limiting at network edge

**Self-signed certificate** for local deployment; school can supply their own CA-signed cert.

---

### Email

**Choice:** Local SMTP server (school's existing mail server)

**Rationale:**
- Local-only deployment — no external email service
- Password reset (FR-002) is the only email use case in V1
- NestJS `@nestjs-modules/mailer` + Nodemailer handles SMTP integration

---

### Monitoring

**Choice:** Uptime Kuma (self-hosted) + Winston structured logging

**Rationale:**
- Uptime Kuma: lightweight self-hosted uptime monitor with dashboard and alerts
- Winston: structured JSON logging in NestJS, written to local log files
- Right-sized for a single-school deployment; no cloud dependency

---

### Deployment

**Choice:** Docker Compose

All services defined in a single `docker-compose.yml`:
- `nginx` — Reverse proxy, TLS
- `frontend` — Angular build (served as static files by Nginx)
- `api` — NestJS application
- `postgres` — PostgreSQL database
- `redis` — Redis cache
- `minio` — Object storage
- `uptime-kuma` — Monitoring

Single command deployment: `docker compose up -d`

---

## 5. System Components

### Component: Nginx Reverse Proxy

**Purpose:** Network edge — TLS termination, static file serving, API routing

**Responsibilities:**
- Terminate HTTPS (TLS 1.2+)
- Serve Angular SPA static build
- Proxy `/api/*` → NestJS API
- Gzip compression
- Security headers (X-Frame-Options, HSTS, CSP)

**Interfaces:** HTTPS:443 (external), HTTP:80 (redirect to HTTPS)

**FRs Addressed:** FR-020 (HTTPS everywhere)

---

### Component: Angular SPA

**Purpose:** Teacher-facing UI — all screens, forms, state management

**Responsibilities:**
- Render contribution creation/editing forms (FR-005, FR-006)
- Real-time field validation feedback (FR-019)
- Image upload UI with progress and validation feedback (FR-008, FR-009)
- Submission state display (FR-007, FR-010)
- GDPR consent checkbox flow (FR-011)
- Person/school search and selection (FR-003, FR-004, FR-016)
- Coordinator read-only overview (FR-018)
- Export trigger UI (FR-013, FR-014)

**Module structure:**
```
src/app/
├── auth/           # Login, password reset
├── dashboard/      # Contribution list
├── contributions/  # Create/edit/view contribution
├── registry/       # Persons & schools
├── export/         # Export trigger and download
├── admin/          # Account management, appointment types
└── shared/         # Components, pipes, services
```

**State Management:** Angular Signals (Angular 18+) — no NgRx needed at this scale

---

### Component: NestJS API (Modular Monolith)

**Purpose:** All business logic, data access, file orchestration

**Modules:**

| Module | Responsibility | Key FRs |
|--------|---------------|---------|
| `AuthModule` | JWT login, refresh, logout, password reset | FR-001, FR-002 |
| `UsersModule` | Account CRUD, role assignment | FR-015 |
| `SchoolsModule` | School registry CRUD | FR-003 |
| `PersonsModule` | Person registry CRUD, soft delete | FR-004 |
| `ContributionsModule` | Contribution CRUD, state machine, validation | FR-005–FR-007, FR-010, FR-016, FR-017, FR-019 |
| `MediaModule` | Image upload, MinIO integration, format/size validation | FR-008, FR-009 |
| `GdprModule` | Consent record storage, data subject deletion orchestration | FR-011, FR-012 |
| `ExportModule` | Structured export generation, print-ready PDF output | FR-013, FR-014 |
| `AdminModule` | Appointment type management, system config | FR-017 |

**Cross-cutting concerns (NestJS interceptors/guards):**
- `JwtAuthGuard` — protects all authenticated routes
- `RolesGuard` — RBAC enforcement (Teacher, Coordinator, Admin)
- `ValidationPipe` — global DTO validation via class-validator
- `ThrottlerGuard` — rate limiting on auth endpoints
- `LoggingInterceptor` — structured request/response logging
- `AuditInterceptor` — writes audit log for state-changing operations

---

### Component: PostgreSQL Database

**Purpose:** Single source of truth for all structured application data

**Key tables:** (see Data Architecture section)

**FRs Addressed:** All FRs involving persistent data

---

### Component: MinIO Object Storage

**Purpose:** Stores all uploaded images outside the relational database

**Responsibilities:**
- Accept image uploads from NestJS MediaModule
- Serve images back to authenticated requests only (pre-signed URLs)
- Apply bucket lifecycle rules for GDPR retention
- Support anonymisation/deletion of images on data subject request (FR-012)

**FRs Addressed:** FR-008, FR-012

---

### Component: Redis

**Purpose:** Ephemeral fast storage for sessions, rate limiting, job state

**Responsibilities:**
- Store JWT refresh tokens (with TTL = refresh token expiry)
- Store rate-limiting counters per IP for auth endpoints
- Store export job state for async export operations

**FRs Addressed:** FR-001, FR-020, NFR-002

---

## 6. Data Architecture

### Core Entities

```
User
├── id: UUID (PK)
├── username: VARCHAR(100) UNIQUE NOT NULL
├── email: VARCHAR(255) UNIQUE NOT NULL
├── password_hash: VARCHAR(255) NOT NULL
├── role: ENUM('teacher', 'coordinator', 'admin')
├── is_active: BOOLEAN DEFAULT true
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── deleted_at: TIMESTAMPTZ (soft delete)

School
├── id: UUID (PK)
├── name: VARCHAR(255) NOT NULL
├── city: VARCHAR(255) NOT NULL
├── is_active: BOOLEAN DEFAULT true
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── deleted_at: TIMESTAMPTZ

Person
├── id: UUID (PK)
├── first_name: VARCHAR(255) NOT NULL         ← personal data
├── last_name: VARCHAR(255) NOT NULL          ← personal data
├── school_id: UUID (FK → School)
├── is_active: BOOLEAN DEFAULT true
├── anonymised_at: TIMESTAMPTZ               ← GDPR erasure timestamp
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── deleted_at: TIMESTAMPTZ

AppointmentType
├── id: UUID (PK)
├── name: VARCHAR(255) NOT NULL
├── is_active: BOOLEAN DEFAULT true
└── created_at: TIMESTAMPTZ

Contribution
├── id: UUID (PK)
├── title: VARCHAR(255) NOT NULL
├── description: TEXT NOT NULL
├── event_date: DATE NOT NULL
├── appointment_type_id: UUID (FK → AppointmentType)
├── school_id: UUID (FK → School)
├── submitted_by: UUID (FK → User)
├── status: ENUM('draft', 'submitted') DEFAULT 'draft'
├── submitted_at: TIMESTAMPTZ
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

ContributionPerson (junction)
├── contribution_id: UUID (FK → Contribution)
├── person_id: UUID (FK → Person)
└── PRIMARY KEY (contribution_id, person_id)

MediaFile
├── id: UUID (PK)
├── contribution_id: UUID (FK → Contribution)
├── original_filename: VARCHAR(255)
├── storage_key: VARCHAR(500) NOT NULL        ← MinIO object key
├── mime_type: VARCHAR(100)
├── file_size_bytes: INTEGER
├── width_px: INTEGER
├── height_px: INTEGER
├── consent_record_id: UUID (FK → ConsentRecord)
├── anonymised_at: TIMESTAMPTZ               ← GDPR: image purged from storage
├── created_at: TIMESTAMPTZ
└── deleted_at: TIMESTAMPTZ

ConsentRecord
├── id: UUID (PK)
├── user_id: UUID (FK → User)               ← who confirmed consent
├── contribution_id: UUID (FK → Contribution)
├── consent_text_snapshot: TEXT             ← exact text shown at time of consent
├── confirmed_at: TIMESTAMPTZ NOT NULL
├── ip_address: INET                        ← for audit purposes
└── created_at: TIMESTAMPTZ

AuditLog
├── id: UUID (PK)
├── user_id: UUID (FK → User, nullable)
├── action: VARCHAR(255) NOT NULL           ← e.g. 'contribution.submitted'
├── entity_type: VARCHAR(100)
├── entity_id: UUID
├── metadata: JSONB
└── created_at: TIMESTAMPTZ

PasswordResetToken
├── id: UUID (PK)
├── user_id: UUID (FK → User)
├── token_hash: VARCHAR(255) NOT NULL
├── expires_at: TIMESTAMPTZ NOT NULL
├── used_at: TIMESTAMPTZ
└── created_at: TIMESTAMPTZ
```

### Key Relationships

- `Contribution` → many `MediaFile` (one-to-many)
- `Contribution` → many `Person` via `ContributionPerson` (many-to-many)
- `MediaFile` → one `ConsentRecord` (one-to-one, required before upload accepted)
- `Person.anonymised_at` + `MediaFile.anonymised_at` — GDPR erasure without destroying contribution record

### GDPR Data Handling

**Anonymisation strategy (not hard delete):**
- Person record: `first_name` → `[ANONYMISED]`, `last_name` → `[ANONYMISED]`, `anonymised_at` = now
- MediaFile: file deleted from MinIO storage, `storage_key` nulled, `anonymised_at` = now
- ContributionPerson link: retained (contribution record integrity preserved)
- ConsentRecord: retained for legal audit (does not contain personal data)
- AuditLog: GDPR deletion action logged with timestamp

**Data retention:**
- ConsentRecords: retained for the lifetime of the contribution + legal retention period (confirm with legal)
- AuditLog: retained for 7 years (standard EU accounting/compliance period — confirm with legal)
- MediaFile (active): retained until contribution lifecycle ends or subject requests erasure

---

## 7. API Design

### Architecture

- **Style:** REST (JSON over HTTPS)
- **Versioning:** URL prefix `/api/v1/`
- **Auth:** JWT Bearer token in `Authorization` header
- **Refresh:** Separate `POST /api/v1/auth/refresh` with HttpOnly cookie containing refresh token
- **Pagination:** Cursor-based for lists (`?cursor=&limit=`)
- **Error format:** `{ statusCode, message, error }` — plain language messages for client display

### Key Endpoints

```
# Auth
POST   /api/v1/auth/login                    # FR-001 — returns access + refresh token
POST   /api/v1/auth/logout                   # FR-001 — invalidates refresh token in Redis
POST   /api/v1/auth/refresh                  # FR-001 — rotates access token
POST   /api/v1/auth/password-reset/request   # FR-002 — sends reset email
POST   /api/v1/auth/password-reset/confirm   # FR-002 — validates token, sets new password

# Users (Admin only)
GET    /api/v1/users                         # FR-015 — list all users
POST   /api/v1/users                         # FR-015 — create teacher account
GET    /api/v1/users/:id                     # FR-015
PATCH  /api/v1/users/:id                     # FR-015 — update role, deactivate
POST   /api/v1/users/:id/reset-password      # FR-015 — admin-triggered reset

# Schools
GET    /api/v1/schools                       # FR-003 — list active schools
POST   /api/v1/schools                       # FR-003
GET    /api/v1/schools/:id                   # FR-003
PATCH  /api/v1/schools/:id                   # FR-003
DELETE /api/v1/schools/:id                   # FR-003 — soft deactivate

# Persons
GET    /api/v1/persons                       # FR-004 — list active persons
POST   /api/v1/persons                       # FR-004
GET    /api/v1/persons/:id                   # FR-004
PATCH  /api/v1/persons/:id                   # FR-004
POST   /api/v1/persons/:id/anonymise         # FR-012 — GDPR erasure (Admin only)

# Contributions
GET    /api/v1/contributions                 # FR-007 — teacher sees own; coordinator sees all
POST   /api/v1/contributions                 # FR-005
GET    /api/v1/contributions/:id             # FR-007
PATCH  /api/v1/contributions/:id             # FR-006 — draft only
POST   /api/v1/contributions/:id/submit      # FR-010 — triggers final validation + state change
GET    /api/v1/contributions/:id/persons     # FR-016
POST   /api/v1/contributions/:id/persons     # FR-016 — link person
DELETE /api/v1/contributions/:id/persons/:personId  # FR-016 — unlink person

# Media
POST   /api/v1/contributions/:id/media       # FR-008 — upload image (multipart/form-data)
GET    /api/v1/contributions/:id/media       # FR-008 — list images for contribution
DELETE /api/v1/contributions/:id/media/:mediaId  # FR-008 — remove image from draft

# GDPR Consent
POST   /api/v1/contributions/:id/media/:mediaId/consent  # FR-011 — record consent

# Export
POST   /api/v1/export/structured             # FR-013 — generate structured export (JSON/CSV)
POST   /api/v1/export/print                  # FR-014 — generate print-ready PDF
GET    /api/v1/export/:jobId/status          # async export job status
GET    /api/v1/export/:jobId/download        # download completed export

# Admin
GET    /api/v1/admin/appointment-types       # FR-017
POST   /api/v1/admin/appointment-types       # FR-017
PATCH  /api/v1/admin/appointment-types/:id   # FR-017
DELETE /api/v1/admin/appointment-types/:id   # FR-017 — soft deactivate
```

### RBAC Enforcement

| Role | Access |
|------|--------|
| `teacher` | Own contributions (CRUD draft), persons/schools (read), image upload, consent |
| `coordinator` | All contributions (read), all persons/schools (read), export |
| `admin` | All of above + user management, appointment types, GDPR anonymisation |

Guards applied at controller level via NestJS `@Roles()` decorator + `RolesGuard`.

---

## 8. NFR Coverage

### NFR-001: GDPR Compliance

**Solution:**
- Consent capture mandatory before image accepted (FR-011 — `ConsentRecord` entity)
- `ConsentRecord` stores: user, contribution, exact consent text shown, timestamp, IP
- GDPR anonymisation endpoint for persons and associated media (FR-012)
- Soft deletes preserve referential integrity; personal fields overwritten with `[ANONYMISED]`
- All personal data stored exclusively in local PostgreSQL and MinIO — no third-party egress
- Data register: all personal data fields documented (User, Person, MediaFile, ConsentRecord)
- Privacy Policy and DPA must be completed before go-live (legal task, not technical)

**Validation:** Legal review of data handling; DPA in place; anonymisation tested end-to-end before launch

---

### NFR-002: Authentication & Authorisation

**Solution:**
- Passwords hashed with **bcrypt** (cost factor 12 minimum)
- JWT access tokens: 15-minute TTL
- JWT refresh tokens: 7-day TTL, stored in Redis (revocable on logout)
- RBAC enforced server-side via NestJS Guards — not just UI routing
- Brute-force: `ThrottlerGuard` limits auth endpoints to 5 requests/minute per IP
- HTTPS-only via Nginx; `helmet` middleware sets security headers
- CSRF: SPA uses JWT Bearer header (not cookies for access token) — mitigates CSRF by design

**Validation:** Penetration test checklist; automated auth integration tests; rate limit verified under load

---

### NFR-003: Performance

**Solution:**
- Angular lazy-loaded modules — initial bundle minimised
- Nginx gzip compression for API responses and static assets
- PostgreSQL indexes on: `contribution.submitted_by`, `contribution.status`, `contribution.event_date`, `person.school_id`, `media_file.contribution_id`
- Images served via MinIO pre-signed URLs (streamed, not through NestJS)
- Export PDF generated asynchronously; status polled by client (avoids 30s HTTP timeout)
- Redis caches coordinator overview query (5-minute TTL, invalidated on new submission)

**Targets:**
- Page load < 3s ✓ (lazy loading + gzip + indexed queries)
- Validation feedback < 200ms ✓ (client-side Angular reactive forms — no server round trip)
- 20MB image upload < 60s ✓ (streamed direct to MinIO, progress event streamed back)
- Export < 30s for 500 contributions ✓ (async job + cached queries)

---

### NFR-004: Usability

**Solution:**
- Angular Material components — accessible, consistent, familiar
- Single-column form layout on all contribution screens
- Real-time `class-validator` on all required fields (FR-019) with plain-language error messages
- Submission button disabled until all validations pass
- Image upload: drag-and-drop + file picker; progress bar; immediate format/size feedback
- All API error messages mapped to user-friendly strings in Angular error interceptor

**Validation:** Usability test with one low-tech user completing full submission < 10 minutes before launch

---

### NFR-005: Accessibility (WCAG 2.1 AA)

**Solution:**
- Angular Material provides ARIA attributes and keyboard navigation by default
- Custom components audited with axe-core in CI pipeline
- Colour contrast: Angular Material theme configured to AA compliance
- All form fields use `<label for>` associations
- Image upload area keyboard accessible

**Validation:** axe-core automated scan in CI; manual keyboard-navigation test

---

### NFR-006: Browser Compatibility

**Solution:**
- Angular 18 supports Chrome, Firefox, Edge (latest 2 versions) — no additional config needed
- Angular Material responsive grid for mobile browser support
- No browser plugins required; no proprietary APIs used
- Browserslist config in `package.json` targets supported browsers

**Validation:** Cross-browser test suite (Playwright) covering Chrome, Firefox, Edge

---

### NFR-007: Reliability — Availability

**Solution:**
- Docker Compose `restart: unless-stopped` on all services
- Nginx active health checks on NestJS (`/api/v1/health` endpoint)
- PostgreSQL and MinIO: Docker named volumes (data persists across container restarts)
- Uptime Kuma monitors all services; alerts school IT via email on downtime
- NestJS graceful shutdown: in-flight requests completed before process exit

**Validation:** Uptime Kuma dashboard; manual failover test (restart containers) before launch

---

### NFR-008: Data Integrity & Backup

**Solution:**
- **Database:** Daily `pg_dump` to local backup directory; compressed, timestamped
- **Images:** Daily MinIO bucket sync to separate backup volume
- Both backup jobs run via `cron` on the host server at 02:00 local time
- Backup integrity: weekly restore test to a test container (scripted)
- RPO: 24 hours (daily backup) ✓
- RTO: 4 hours (Docker Compose up + restore script) ✓ — documented in runbook

**Validation:** Backup restore tested and documented in runbook before launch

---

### NFR-009: Scalability

**Solution:**
- PostgreSQL connection pooling via NestJS TypeORM (pool size: 10)
- Redis handles session/rate-limit state — no per-request DB load for auth checks
- MinIO scales to local disk capacity — no code changes needed
- Angular SPA is statically served by Nginx — no app server load for static files
- Architecture supports vertical scaling (larger server) and future containerisation to multi-node if needed

**Validation:** Load test with k6: 100 concurrent users, mixed contribution CRUD and image upload, verify < 3s p95 response time

---

### NFR-010: Maintainability

**Solution:**
- TypeScript end-to-end (Angular + NestJS) — type safety across boundaries
- NestJS module structure enforces separation of concerns
- TypeORM migrations: all schema changes version-controlled, never manual SQL
- `class-validator` DTOs serve as living API documentation
- ESLint + Prettier enforced in CI (`pre-commit` hook + CI gate)
- Unit tests: NestJS Jest suite; target 70% business logic coverage
- Integration tests: Supertest for all API endpoint happy paths + key error cases
- Angular: Jasmine/Karma unit tests for form validation logic
- README: `docker compose up` local setup documented

**Validation:** CI pipeline (GitHub Actions or Gitea) enforces lint + test gates on every PR

---

### NFR-011: Export Format Stability

**Solution:**
- Export format versioned in response: `{ "version": "1.0", "exportedAt": "...", "contributions": [...] }`
- Export schema documented in `docs/export-schema-v1.md`
- Breaking changes require version bump to v2 — old format supported in parallel for one release cycle
- Print-ready PDF generated by `pdfkit` with a fixed template version

**Validation:** Export schema documented before sprint 1 of EPIC-006; schema regression test in CI

---

## 9. Security Architecture

### Authentication Flow

```
1. POST /auth/login → validate credentials → issue:
   - Access token (JWT, 15min TTL, signed with RS256)
   - Refresh token (opaque UUID, stored in Redis with 7d TTL, sent as HttpOnly cookie)

2. Client stores access token in memory (not localStorage — XSS risk)

3. API requests: Authorization: Bearer <access_token>

4. On 401: client calls POST /auth/refresh → new access token issued, refresh token rotated

5. POST /auth/logout → refresh token deleted from Redis → next refresh attempt fails
```

### Authorisation (RBAC)

```
Roles:   teacher < coordinator < admin
Guards:  @Roles('admin') → RolesGuard checks JWT payload role field
         Server-side enforcement — client role UI is convenience only
```

### Encryption

- **In transit:** TLS 1.2+ via Nginx (self-signed or school CA cert)
- **At rest (DB):** PostgreSQL filesystem-level encryption if host OS supports it (optional at V1)
- **At rest (MinIO):** MinIO server-side encryption (SSE-S3) enabled
- **Passwords:** bcrypt, cost factor 12
- **JWT signing:** RS256 (asymmetric) — private key on server, public key verifiable

### Security Headers (via Nginx + Helmet)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=()
```

---

## 10. Scalability & Performance

### Scaling Strategy (V1)

- **Vertical scaling only:** Single Docker Compose host; increase RAM/CPU as needed
- **Database:** Single PostgreSQL instance with connection pool (10 connections)
- **Future path:** Docker Compose → Docker Swarm or Kubernetes if multi-school needed

### Performance Optimisation

- **N+1 prevention:** TypeORM QueryBuilder with explicit JOINs for contribution lists
- **Pagination:** All list endpoints cursor-paginated (default limit: 25)
- **Image serving:** Pre-signed MinIO URLs (15-minute expiry) — NestJS not in image serving path
- **Export:** Async job pattern — client polls `/export/:jobId/status` rather than waiting on HTTP

### Caching Strategy

| Cache Target | TTL | Invalidation |
|---|---|---|
| Coordinator overview query | 5 min | On any contribution submit |
| Appointment types list | 60 min | On admin update |
| JWT access token validation | Stateless (JWT TTL) | — |
| Refresh token validity | 7 days | On logout / rotation |

---

## 11. Reliability & Availability

### Deployment Topology

```
Host Server
├── docker-compose.yml
├── volumes/
│   ├── postgres-data/       ← persistent DB data
│   ├── minio-data/          ← persistent image storage
│   ├── redis-data/          ← optional persistence
│   └── backups/             ← daily backup output
└── logs/                    ← application logs (Winston)
```

### Restart Policy

All containers: `restart: unless-stopped` in Docker Compose.

### Health Checks

- NestJS: `GET /api/v1/health` → `{ status: 'ok', db: 'ok', redis: 'ok', minio: 'ok' }`
- Nginx: checks NestJS health before routing
- Uptime Kuma: monitors `/api/v1/health` every 60 seconds; alerts on failure

### Backup Schedule

```
02:00 daily (host cron):
  1. pg_dump schoolchronicle → backups/db/YYYY-MM-DD.sql.gz
  2. mc mirror minio/schoolchronicle → backups/media/YYYY-MM-DD/
  3. Retain last 30 days of backups (older purged automatically)
```

### Disaster Recovery Runbook (Summary)

1. Provision new host server, install Docker + Docker Compose
2. Restore `docker-compose.yml` and `.env` from version control
3. `docker compose up -d postgres redis minio`
4. Restore DB: `gunzip -c backup.sql.gz | psql schoolchronicle`
5. Restore media: `mc mirror backup/media/ minio/schoolchronicle`
6. `docker compose up -d` — all services start
7. Verify via Uptime Kuma health check

---

## 12. Development & Deployment

### Repository Structure

```
schoolchronicle/
├── frontend/                # Angular application
│   ├── src/app/
│   │   ├── auth/
│   │   ├── contributions/
│   │   ├── registry/
│   │   ├── export/
│   │   ├── admin/
│   │   └── shared/
│   └── Dockerfile
├── backend/                 # NestJS application
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── schools/
│   │   ├── persons/
│   │   ├── contributions/
│   │   ├── media/
│   │   ├── gdpr/
│   │   ├── export/
│   │   └── admin/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.dev.yml   # Dev overrides (hot reload, exposed ports)
└── docs/
```

### Environments

| Environment | Purpose | Config |
|-------------|---------|--------|
| `dev` | Local development | `docker-compose.dev.yml` — hot reload, no TLS |
| `prod` | School server | `docker-compose.yml` — TLS, restart policies, no debug |

No staging environment in V1 (single-school, resource-constrained). Dev → Prod with manual smoke test.

### CI/CD Pipeline

```
On PR (GitHub Actions / Gitea CI):
  1. Lint (ESLint + Prettier — frontend + backend)
  2. Unit tests (Jest — backend; Karma — frontend)
  3. Integration tests (Supertest — API endpoints)
  4. Build Docker images (verify build succeeds)

On merge to main:
  1. All above +
  2. Build production Docker images
  3. Tag with git SHA
  4. Deploy to production server via SSH + docker compose pull && docker compose up -d
```

### Testing Strategy

| Layer | Tool | Target Coverage |
|-------|------|-----------------|
| Backend unit | Jest | 70% business logic |
| Backend integration | Supertest | All API endpoints (happy path + key errors) |
| Frontend unit | Jasmine/Karma | Form validation, service logic |
| E2E | Playwright | Critical user journeys (login, submit contribution, export) |
| Load test | k6 | 100 concurrent users smoke test before launch |
| Accessibility | axe-core | Automated scan in CI |

---

## 13. FR & NFR Traceability

### FR → Component Mapping

| FR | Description | Component(s) |
|----|-------------|-------------|
| FR-001 | User Login | Angular AuthModule, NestJS AuthModule, Redis |
| FR-002 | Password Reset | Angular AuthModule, NestJS AuthModule, SMTP |
| FR-003 | School Management | Angular RegistryModule, NestJS SchoolsModule, PostgreSQL |
| FR-004 | Person Management | Angular RegistryModule, NestJS PersonsModule, PostgreSQL |
| FR-005 | Contribution Creation | Angular ContributionsModule, NestJS ContributionsModule, PostgreSQL |
| FR-006 | Contribution Editing | Angular ContributionsModule, NestJS ContributionsModule |
| FR-007 | Contribution List & Status | Angular DashboardModule, NestJS ContributionsModule |
| FR-008 | Image Upload | Angular MediaComponent, NestJS MediaModule, MinIO |
| FR-009 | Image Quality Guidance | Angular MediaComponent (client-side) |
| FR-010 | Submission State Workflow | NestJS ContributionsModule (state machine), PostgreSQL |
| FR-011 | GDPR Consent Capture | Angular ConsentComponent, NestJS GdprModule, PostgreSQL |
| FR-012 | GDPR Data Subject Deletion | NestJS GdprModule, PersonsModule, MediaModule, MinIO |
| FR-013 | Structured Export | NestJS ExportModule, PostgreSQL, MinIO |
| FR-014 | Print-Ready Export | NestJS ExportModule (pdfkit) |
| FR-015 | User Account Management | Angular AdminModule, NestJS UsersModule, PostgreSQL |
| FR-016 | Person Linking | Angular ContributionsModule, NestJS ContributionsModule |
| FR-017 | Appointment Type Classification | Angular AdminModule, NestJS AdminModule, PostgreSQL |
| FR-018 | Coordinator Read-Only Overview | Angular DashboardModule (coordinator view), NestJS ContributionsModule |
| FR-019 | Real-Time Field Validation | Angular Reactive Forms (class-validator sync), NestJS ValidationPipe |
| FR-020 | Session & Data Security | Nginx, NestJS (Helmet, ThrottlerGuard, JwtAuthGuard), Redis |

### NFR → Architecture Solution

| NFR | Solution Summary |
|-----|-----------------|
| NFR-001 GDPR | ConsentRecord entity, anonymisation endpoint, local-only data, soft deletes |
| NFR-002 Auth | bcrypt(12), JWT RS256, Redis refresh tokens, ThrottlerGuard, Helmet |
| NFR-003 Performance | Lazy loading, gzip, DB indexes, MinIO pre-signed URLs, async export |
| NFR-004 Usability | Angular Material, single-column forms, client-side validation, plain-language errors |
| NFR-005 Accessibility | Angular Material ARIA, axe-core CI, keyboard navigation |
| NFR-006 Browser Compat | Angular 18 browserslist, Playwright cross-browser tests |
| NFR-007 Availability | Docker restart policies, health checks, Uptime Kuma |
| NFR-008 Backup | Daily pg_dump + MinIO sync, 30-day retention, tested restore runbook |
| NFR-009 Scalability | Connection pooling, cursor pagination, Redis caching, vertical scale path |
| NFR-010 Maintainability | TypeScript E2E, ESLint/Prettier CI, 70% unit coverage, TypeORM migrations |
| NFR-011 Export Stability | Versioned export schema, documented format, regression tests |

---

## 14. Trade-offs & Decisions

| Decision | Gain | Loss | Rationale |
|----------|------|------|-----------|
| Modular Monolith over Microservices | Simple deployment, fast development | Harder to scale individual modules | School-scale load; single team; August deadline |
| NestJS over Express | Structure, RBAC, validation, DI | More ceremony for simple endpoints | Level 3 complexity justifies structure |
| PostgreSQL over MongoDB | ACID, relational integrity, GDPR soft deletes | Less flexible schema | Highly relational data model; GDPR requires auditability |
| MinIO over DB BLOBs | Performance, GDPR purge, backup separation | Additional service to operate | Images must be independently purgeable for GDPR |
| JWT in memory (not localStorage) | XSS protection | Lost on page refresh (refresh token flow handles this) | Security > minor UX inconvenience |
| Angular over React | TypeScript first, strong forms, team preference | Larger initial bundle | Confirmed by product owner; forms are the core UX |
| Local-only deployment | GDPR data residency, no cloud costs, school control | No managed services; school IT maintains infra | Hard constraint from product owner |
| Async export | No HTTP timeout for large exports | Client must poll for completion | 500-contribution export may exceed 30s synchronously |

---

## Next Steps

### Phase 4: Sprint Planning

Run `/sprint-planning` to:
- Break 7 epics into detailed user stories
- Estimate story complexity (story points or t-shirt sizing)
- Define sprint iterations toward August 1, 2026 launch
- Identify dependencies and critical path

**Recommended epic implementation order (dependency-driven):**
1. EPIC-001: Auth & User Management *(blocks all others)*
2. EPIC-002: Reference Data (Schools, Persons) *(needed for contributions)*
3. EPIC-003: Contribution Workflow *(core value delivery)*
4. EPIC-004: Image Upload & Validation *(needed before GDPR epic)*
5. EPIC-005: GDPR & Consent Management *(legal requirement — do not defer)*
6. EPIC-006: Data Export & Print Output *(terminal value delivery)*
7. EPIC-007: Coordinator Overview *(Could Have — implement if time allows)*

---

**This document was created using BMAD Method v6 - Phase 3 (Solutioning)**

*To continue: Run `/sprint-planning` to plan implementation.*
