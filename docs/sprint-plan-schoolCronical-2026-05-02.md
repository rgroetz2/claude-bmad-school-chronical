# Sprint Plan: SchoolCronicle

**Date:** 2026-05-02
**Scrum Master:** rudolfgroetz
**Project Level:** 3 (Complex Integration)
**Total Stories:** 20
**Total Feature Points:** 96
**Sprint Capacity:** 30 points/sprint
**Planned Sprints:** 6 (5 feature sprints + 1 hardening/launch sprint)
**Target Launch:** August 1, 2026

---

## Executive Summary

SchoolCronicle V1 is planned across 6 two-week sprints from May 4 to July 31, 2026, with a one-senior-developer team. The 20 stories cover all 7 epics and 20 functional requirements from the PRD. Total story points (96) sit well within total capacity (180), providing intentional buffer for bug fixing, integration testing, performance validation, and launch preparation. Sprint 6 is explicitly reserved for hardening — no new features.

**Key Metrics:**
- Total Stories: 20
- Total Feature Points: 96 pts
- Sprint Capacity: 30 pts/sprint
- Buffer: 84 pts (for bugs, testing, polish)
- Planned Sprints: 6
- Launch: August 1, 2026

---

## Story Inventory

All 20 stories with estimates, acceptance criteria, and technical notes.

---

### STORY-001: Development Environment & Docker Compose Setup

**Epic:** Infrastructure (pre-EPIC-001)
**Priority:** Must Have
**Points:** 2

**User Story:**
As a developer,
I want a fully configured local development environment,
So that I can build and test SchoolCronicle without manual setup steps.

**Acceptance Criteria:**
- [ ] `docker-compose.dev.yml` starts all services (Nginx, Angular dev server, NestJS, PostgreSQL, Redis, MinIO) with a single command
- [ ] NestJS hot-reload works on file change
- [ ] Angular dev server with hot-reload accessible at `http://localhost:4200`
- [ ] PostgreSQL, Redis, and MinIO accessible on documented ports
- [ ] `.env.example` documents all required environment variables
- [ ] `README.md` setup guide allows a developer to be running locally in < 15 minutes

**Technical Notes:**
- `docker-compose.yml` = production config; `docker-compose.dev.yml` = dev overrides
- Nginx not needed in dev; Angular dev server used directly
- Named Docker volumes for Postgres and MinIO data persistence

**Dependencies:** None

---

### STORY-002: Database Schema & TypeORM Migrations

**Epic:** Infrastructure (pre-EPIC-001)
**Priority:** Must Have
**Points:** 3

**User Story:**
As a developer,
I want a version-controlled database schema with TypeORM migrations,
So that all schema changes are reproducible and auditable.

**Acceptance Criteria:**
- [ ] TypeORM entities defined for: User, School, Person, AppointmentType, Contribution, ContributionPerson, MediaFile, ConsentRecord, AuditLog, PasswordResetToken
- [ ] Initial migration creates all tables with correct columns, types, constraints, and indexes
- [ ] UUID primary keys on all entities
- [ ] `deleted_at` soft-delete column on: User, School, Person, Contribution, MediaFile
- [ ] `anonymised_at` column on: Person, MediaFile
- [ ] Migration runs automatically on `docker compose up`
- [ ] Indexes created on: `contribution.submitted_by`, `contribution.status`, `contribution.event_date`, `person.school_id`, `media_file.contribution_id`

**Technical Notes:**
- NestJS TypeORM `synchronize: false` in production — migrations only
- `synchronize: true` acceptable in dev
- Seed script for initial admin user and sample appointment types

**Dependencies:** STORY-001

---

### STORY-003: User Login with JWT Authentication

**Epic:** EPIC-001 — Auth & User Management
**Priority:** Must Have
**Points:** 5

**User Story:**
As a teacher,
I want to log in with my username and password,
So that I can access my SchoolCronicle dashboard securely.

**Acceptance Criteria:**
- [ ] `POST /api/v1/auth/login` accepts username + password, returns JWT access token (15min TTL)
- [ ] Refresh token (7-day TTL) set as HttpOnly cookie
- [ ] Invalid credentials return 401 with plain-language error — no field-level disclosure
- [ ] `POST /api/v1/auth/logout` invalidates refresh token in Redis
- [ ] `POST /api/v1/auth/refresh` issues new access token; refresh token rotated
- [ ] Session idle timeout: access token expires after 15min, refresh flow transparent to user
- [ ] Rate limiting: max 5 login attempts per minute per IP (ThrottlerGuard)
- [ ] Angular login page: username/password fields, error display, redirect to dashboard on success
- [ ] All API routes except `/auth/*` require valid Bearer token (JwtAuthGuard)
- [ ] `GET /api/v1/health` returns service status (unauthenticated — for Nginx health check)

**Technical Notes:**
- JWT signing: RS256 (asymmetric key pair generated and stored in `.env`)
- Access token stored in Angular memory (not localStorage)
- NestJS `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`
- Angular `AuthInterceptor` attaches Bearer token to all API requests
- Angular `AuthGuard` redirects unauthenticated routes to `/login`

**Dependencies:** STORY-001, STORY-002

---

### STORY-004: Password Reset via Email

**Epic:** EPIC-001 — Auth & User Management
**Priority:** Must Have
**Points:** 3

**User Story:**
As a teacher who forgot my password,
I want to reset it via email,
So that I can regain access to my account without contacting the administrator.

**Acceptance Criteria:**
- [ ] `POST /api/v1/auth/password-reset/request` accepts email; sends reset link if email exists (always returns 200 to prevent enumeration)
- [ ] Reset email contains a unique, time-limited link (24-hour expiry)
- [ ] `POST /api/v1/auth/password-reset/confirm` validates token, sets new password, marks token used
- [ ] Token is single-use; second use returns 400
- [ ] After reset, all existing refresh tokens for the user are invalidated (Redis purge)
- [ ] Angular: "Forgot password?" link on login page → request form → confirmation message
- [ ] Angular: Reset confirmation page with new password + confirm fields + validation

**Technical Notes:**
- `PasswordResetToken` entity: stores hash of token (not plaintext), expiry, used_at
- Email via NestJS `@nestjs-modules/mailer` + Nodemailer configured to school SMTP
- Token: cryptographically random UUID; stored as SHA-256 hash in DB

**Dependencies:** STORY-002, STORY-003

---

### STORY-005: Admin Account Management

**Epic:** EPIC-001 — Auth & User Management
**Priority:** Should Have
**Points:** 5

**User Story:**
As an administrator,
I want to create, deactivate, and manage teacher accounts,
So that I control who has access to SchoolCronicle without exposing self-registration.

**Acceptance Criteria:**
- [ ] `GET /api/v1/users` — admin only, list all users with role and status
- [ ] `POST /api/v1/users` — admin only, create teacher account (username, email, role, temp password)
- [ ] `PATCH /api/v1/users/:id` — admin only, update role, deactivate account (`is_active: false`)
- [ ] `POST /api/v1/users/:id/reset-password` — admin triggers password reset email
- [ ] Teacher prompted to change password on first login (`force_password_change` flag)
- [ ] Deactivated user cannot log in; existing sessions invalidated
- [ ] No public registration endpoint exists
- [ ] Angular admin panel: user list, create user form, deactivate action, reset password action
- [ ] Role options: `teacher`, `coordinator`, `admin`

**Technical Notes:**
- RolesGuard: `@Roles('admin')` on all users endpoints
- RBAC enforced server-side via JWT payload `role` field
- `is_active: false` check in JwtAuthGuard (user deactivated mid-session loses access on next request)

**Dependencies:** STORY-003

---

### STORY-006: School Registry CRUD

**Epic:** EPIC-002 — Reference Data Management
**Priority:** Must Have
**Points:** 5

**User Story:**
As a teacher,
I want to search and select schools when creating a contribution,
So that my entries are consistently linked to standardised school records.

**Acceptance Criteria:**
- [ ] `GET /api/v1/schools` — list active schools (all authenticated users); supports `?search=` query param
- [ ] `POST /api/v1/schools` — create school (admin/coordinator only): name, city required
- [ ] `GET /api/v1/schools/:id` — get school detail
- [ ] `PATCH /api/v1/schools/:id` — update school (admin/coordinator only)
- [ ] `DELETE /api/v1/schools/:id` — soft deactivate (admin only); deactivated schools excluded from search
- [ ] Angular: school management page (admin/coordinator); school search dropdown in contribution form
- [ ] Edit/deactivate actions in admin panel
- [ ] Deactivated schools hidden from contribution creation but visible in admin list

**Technical Notes:**
- Soft delete: `deleted_at` timestamp (TypeORM `@DeleteDateColumn`)
- `GET /schools` default: `where deleted_at IS NULL`; admin list includes filter for deactivated

**Dependencies:** STORY-002, STORY-003

---

### STORY-007: Person Registry CRUD

**Epic:** EPIC-002 — Reference Data Management
**Priority:** Must Have
**Points:** 5

**User Story:**
As a teacher,
I want to search and select persons when creating a contribution,
So that individuals featured in chronicle entries are linked to standardised records.

**Acceptance Criteria:**
- [ ] `GET /api/v1/persons` — list active persons (all authenticated); supports `?search=` and `?schoolId=`
- [ ] `POST /api/v1/persons` — create person: first name, last name, school affiliation required
- [ ] `GET /api/v1/persons/:id` — get person detail
- [ ] `PATCH /api/v1/persons/:id` — update person (admin/coordinator only)
- [ ] `DELETE /api/v1/persons/:id` — soft deactivate (admin only)
- [ ] Deactivated persons excluded from contribution search results
- [ ] Angular: person management page; person search/select in contribution form
- [ ] Anonymised persons shown as `[ANONYMISED]` — not editable

**Technical Notes:**
- `anonymised_at` field: if set, first_name/last_name display as `[ANONYMISED]` in API response
- Actual anonymised values stored as `[ANONYMISED]` in DB (overwritten, not just flagged)
- GDPR anonymisation handled in STORY-017

**Dependencies:** STORY-002, STORY-003, STORY-006

---

### STORY-008: Appointment Type Management

**Epic:** EPIC-002 — Reference Data Management (supports FR-017)
**Priority:** Must Have
**Points:** 3

**User Story:**
As an administrator,
I want to manage the list of appointment types,
So that teachers classify contributions consistently for chronicle ordering.

**Acceptance Criteria:**
- [ ] `GET /api/v1/admin/appointment-types` — list all (authenticated); includes deactivated for admin
- [ ] `POST /api/v1/admin/appointment-types` — create (admin only): name required
- [ ] `PATCH /api/v1/admin/appointment-types/:id` — update name (admin only)
- [ ] `DELETE /api/v1/admin/appointment-types/:id` — soft deactivate (admin only)
- [ ] Angular admin panel: appointment type list, create/edit/deactivate actions
- [ ] Appointment type selector in contribution form shows only active types

**Technical Notes:**
- Seed initial appointment types in DB migration (e.g. "School Trip", "Award Ceremony", "Sports Event", "Cultural Event", "Other")

**Dependencies:** STORY-002, STORY-005

---

### STORY-009: Contribution Creation with Required Fields & Real-Time Validation

**Epic:** EPIC-003 — Contribution Workflow
**Priority:** Must Have
**Points:** 8

**User Story:**
As a teacher,
I want to create a new chronicle contribution with guided required fields and immediate validation feedback,
So that I know my entry is correct before submitting.

**Acceptance Criteria:**
- [ ] `POST /api/v1/contributions` — create contribution; returns new contribution with `status: draft`
- [ ] Required fields enforced at API (NestJS ValidationPipe) and UI (Angular reactive forms): title, description, event_date, appointment_type_id, school_id
- [ ] Field validation fires on blur (not just on submit)
- [ ] Error messages in plain language (e.g. "Event date is required" not "event_date must be a date string")
- [ ] Submit/Save button disabled while validation errors exist
- [ ] Partial save as draft: all required field rules relaxed for draft save — only enforced on submit
- [ ] Angular: multi-section form — Event Details, School & Type, Description; single-column layout
- [ ] Success: contribution saved as draft, user redirected to contribution detail view
- [ ] All form fields have visible labels and keyboard accessibility

**Technical Notes:**
- NestJS DTO: `CreateContributionDto` with `class-validator` decorators
- Angular: `ReactiveFormsModule`; custom validator messages via `FormControl.errors`
- Draft save = `PATCH /contributions/:id` with partial data (no required field enforcement)
- Submit = `POST /contributions/:id/submit` (full validation enforced)

**Dependencies:** STORY-003, STORY-006, STORY-008

---

### STORY-010: Contribution List & Status Dashboard

**Epic:** EPIC-003 — Contribution Workflow
**Priority:** Must Have
**Points:** 5

**User Story:**
As a teacher,
I want to see all my contributions and their statuses at a glance,
So that I know what's submitted and what still needs attention.

**Acceptance Criteria:**
- [ ] `GET /api/v1/contributions` — returns teacher's own contributions (coordinator sees all)
- [ ] Each item shows: title, event date, appointment type, school, status (Draft/Submitted), last modified
- [ ] List supports filter by status (`?status=draft|submitted`)
- [ ] Cursor-based pagination (default limit: 25)
- [ ] Angular dashboard: contribution list with status badges (Draft = yellow, Submitted = green)
- [ ] "New Contribution" button prominent on dashboard
- [ ] Click row → contribution detail/edit view
- [ ] Empty state message when no contributions exist

**Technical Notes:**
- Coordinator role check in ContributionsService: if `role === 'coordinator'` or `'admin'`, return all; else filter by `submitted_by`
- Redis cache for coordinator list query (5-min TTL, invalidated on any submission)

**Dependencies:** STORY-009

---

### STORY-011: Contribution Editing — Draft Only

**Epic:** EPIC-003 — Contribution Workflow
**Priority:** Must Have
**Points:** 3

**User Story:**
As a teacher,
I want to edit a saved draft contribution,
So that I can correct or complete it before submitting.

**Acceptance Criteria:**
- [ ] `PATCH /api/v1/contributions/:id` — update draft fields; returns updated contribution
- [ ] Only the teacher who created the contribution (or admin) can edit it
- [ ] Submitted contributions return 403 on PATCH attempt — read-only in V1
- [ ] Angular: contribution detail view shows edit form for drafts; read-only view for submitted
- [ ] Submitted contributions display "Submitted on [date]" banner — no edit controls
- [ ] All validation rules from STORY-009 apply on save

**Technical Notes:**
- Guard: `ContributionOwnerGuard` — checks `submitted_by === req.user.id` OR `role === 'admin'`
- Status check in service: `if contribution.status === 'submitted' throw ForbiddenException`

**Dependencies:** STORY-009, STORY-010

---

### STORY-012: Person Linking to Contribution

**Epic:** EPIC-003 — Contribution Workflow
**Priority:** Must Have
**Points:** 3

**User Story:**
As a teacher,
I want to link individuals from the person registry to my contribution,
So that the chronicle accurately records who is featured in each entry.

**Acceptance Criteria:**
- [ ] `GET /api/v1/contributions/:id/persons` — list persons linked to contribution
- [ ] `POST /api/v1/contributions/:id/persons` — link person (accepts `personId`)
- [ ] `DELETE /api/v1/contributions/:id/persons/:personId` — unlink person
- [ ] Multiple persons can be linked to one contribution
- [ ] Linking a person who is deactivated returns 400
- [ ] Angular: person search-as-you-type in contribution form; linked persons shown as chips; remove chip to unlink
- [ ] GDPR reminder shown in UI when adding a person: "Ensure you have consent for any identifiable photos"

**Technical Notes:**
- `ContributionPerson` junction entity (composite PK)
- Person search uses `GET /api/v1/persons?search=` debounced in Angular

**Dependencies:** STORY-007, STORY-009

---

### STORY-013: Submission State Workflow — Draft → Submitted

**Epic:** EPIC-003 — Contribution Workflow
**Priority:** Must Have
**Points:** 5

**User Story:**
As a teacher,
I want to submit my completed contribution,
So that it enters the chronicle production pipeline and I receive confirmation.

**Acceptance Criteria:**
- [ ] `POST /api/v1/contributions/:id/submit` — triggers full validation; transitions status to `submitted`
- [ ] Submission rejected (400) if any required field missing or invalid
- [ ] Submission rejected (400) if no images attached (at least 1 image required for submission)
- [ ] Submission rejected (400) if images present without consent record (FR-011 check)
- [ ] On success: `status` = `submitted`, `submitted_at` = now; AuditLog entry created
- [ ] Angular: "Submit" button on contribution detail; confirmation dialog ("Are you sure?"); success toast notification
- [ ] Submitted contribution status badge updates immediately in dashboard list
- [ ] Redis coordinator cache invalidated on submission

**Technical Notes:**
- State machine enforced in `ContributionsService.submit()` — not a simple field update
- AuditLog: `action: 'contribution.submitted'`, `entity_type: 'contribution'`, `entity_id: contribution.id`

**Dependencies:** STORY-010, STORY-011, STORY-012

---

### STORY-014: Image Upload with Format & Size Validation

**Epic:** EPIC-004 — Image Upload & Validation
**Priority:** Must Have
**Points:** 8

**User Story:**
As a teacher,
I want to upload photos to my contribution with immediate feedback if my file is wrong,
So that I know before submission whether my images meet the requirements.

**Acceptance Criteria:**
- [ ] `POST /api/v1/contributions/:id/media` — accepts `multipart/form-data`; validates format and size before accepting
- [ ] Accepted formats: JPEG, PNG (validated by MIME type, not just extension)
- [ ] Maximum file size: 20MB per image; rejected with plain-language error if exceeded
- [ ] Image dimensions detected and stored (`width_px`, `height_px` in MediaFile)
- [ ] Upload progress shown in Angular UI (percentage bar)
- [ ] Multiple images uploadable sequentially or in batch
- [ ] `GET /api/v1/contributions/:id/media` — list images attached to contribution
- [ ] `DELETE /api/v1/contributions/:id/media/:mediaId` — remove image from draft (draft only)
- [ ] Images stored in MinIO at path `schoolchronicle/{contributionId}/{uuid}-{filename}`
- [ ] Images served via MinIO pre-signed URL (15-min expiry) — not proxied through NestJS
- [ ] Angular: drag-and-drop upload zone + file picker button; thumbnails of uploaded images; remove button on each

**Technical Notes:**
- NestJS `multer` with `memoryStorage`; pipe validates MIME type (`file-type` library) and size before MinIO write
- MinIO SDK: `minio` npm package; `putObject` stream upload
- `sharp` library for dimension detection (lightweight, no ImageMagick dependency)
- Submitted contributions: delete image returns 403

**Dependencies:** STORY-009, STORY-011

---

### STORY-015: Image Quality Guidance UI

**Epic:** EPIC-004 — Image Upload & Validation
**Priority:** Should Have
**Points:** 2

**User Story:**
As a teacher,
I want to see clear guidance about image requirements before I upload,
So that I don't waste time uploading images that won't be accepted.

**Acceptance Criteria:**
- [ ] Upload zone displays requirements before file selection: accepted formats, max file size, minimum recommended resolution
- [ ] If uploaded image is below recommended resolution (e.g. < 1200px on shortest side), show a yellow warning — do not block upload
- [ ] Warning text is plain language: "This image may be too low quality for print. Consider uploading a higher resolution version."
- [ ] Requirements text is always visible (not hidden behind a tooltip)

**Technical Notes:**
- Resolution warning: client-side check using `FileReader` + `Image` object before upload
- No server-side resolution blocking — warning only

**Dependencies:** STORY-014

---

### STORY-016: GDPR Consent Capture on Image Upload

**Epic:** EPIC-005 — GDPR & Consent Management
**Priority:** Must Have
**Points:** 5

**User Story:**
As a teacher uploading photos,
I want to confirm that I have obtained consent for identifiable individuals in my images,
So that the school's GDPR obligations are met and my submission is legally compliant.

**Acceptance Criteria:**
- [ ] `POST /api/v1/contributions/:id/media/:mediaId/consent` — records consent; accepts `{ confirmed: true }`
- [ ] Consent record stores: user_id, contribution_id, media_file_id, consent_text_snapshot (exact text shown), confirmed_at, ip_address
- [ ] Contribution cannot be submitted (STORY-013) if any MediaFile lacks a linked ConsentRecord
- [ ] Angular: consent confirmation modal shown after each image upload; checkbox with exact consent text; cannot dismiss without confirming or removing image
- [ ] Consent text (stored in snapshot): "I confirm that I have obtained the necessary consent for all identifiable individuals appearing in this image, in accordance with GDPR requirements."
- [ ] Confirmed consent shown as a green tick on the image thumbnail
- [ ] ConsentRecord is immutable once created — no update/delete endpoint

**Technical Notes:**
- `ConsentRecord` entity linked 1:1 to `MediaFile`
- IP address captured from `req.ip` (with Nginx `X-Forwarded-For` trusted)
- Consent text version tracked via `consent_text_version` field for future text changes

**Dependencies:** STORY-013, STORY-014

---

### STORY-017: GDPR Data Subject Anonymisation

**Epic:** EPIC-005 — GDPR & Consent Management
**Priority:** Must Have
**Points:** 5

**User Story:**
As an administrator handling a GDPR erasure request,
I want to anonymise a person's data and associated images,
So that the right to erasure is fulfilled without corrupting chronicle records.

**Acceptance Criteria:**
- [ ] `POST /api/v1/persons/:id/anonymise` — admin only; triggers full anonymisation
- [ ] Anonymisation overwrites: `first_name` → `[ANONYMISED]`, `last_name` → `[ANONYMISED]`, sets `anonymised_at`
- [ ] All MediaFiles linked to the person via ContributionPerson: image deleted from MinIO, `storage_key` nulled, `anonymised_at` set
- [ ] ContributionPerson links retained (contribution record integrity preserved)
- [ ] ConsentRecords for anonymised media retained (legal audit requirement)
- [ ] AuditLog entry: `action: 'gdpr.person_anonymised'`, `entity_id: person.id`, `metadata: { requested_by, reason }`
- [ ] API returns confirmation with count of affected media files
- [ ] Angular admin panel: "Anonymise" action on person record with confirmation dialog requiring typed confirmation ("TYPE ANONYMISE to confirm")
- [ ] Anonymised persons displayed as `[ANONYMISED]` throughout the app

**Technical Notes:**
- Anonymisation is irreversible — double confirmation required in UI
- MinIO `removeObject` for each linked MediaFile
- Transaction: DB updates and MinIO deletes wrapped — if MinIO fails, DB rolls back
- NestJS `GdprService.anonymisePerson()` orchestrates across PersonsService and MediaService

**Dependencies:** STORY-007, STORY-014, STORY-016

---

### STORY-018: Structured Data Export

**Epic:** EPIC-006 — Data Export & Print Output
**Priority:** Must Have
**Points:** 8

**User Story:**
As a coordinator,
I want to export all submitted contributions as a structured file,
So that I can hand it off to chronicle production without any manual reformatting.

**Acceptance Criteria:**
- [ ] `POST /api/v1/export/structured` — coordinator/admin only; accepts filter: `{ dateFrom, dateTo, schoolId }`; returns job ID
- [ ] Export runs asynchronously; `GET /api/v1/export/:jobId/status` returns `{ status: 'pending'|'complete'|'error', progress }`
- [ ] `GET /api/v1/export/:jobId/download` — returns export file when complete
- [ ] Export format: JSON with version header `{ "version": "1.0", "exportedAt": "...", "contributions": [...] }`
- [ ] Each contribution in export includes: all fields, linked persons (name, school), appointment type, image references (MinIO pre-signed URLs valid 48h), consent confirmation flag
- [ ] Export includes all submitted contributions only (no drafts)
- [ ] Export file filterable by date range and/or school
- [ ] Export completes within 30 seconds for up to 500 contributions
- [ ] Angular: Export page with filter controls (date range, school), "Generate Export" button, progress indicator, download button when ready
- [ ] Export schema documented in `docs/export-schema-v1.md`

**Technical Notes:**
- Async job: job ID stored in Redis with status and file path
- Export file written to MinIO `schoolchronicle/exports/{jobId}.json` with pre-signed download URL
- No in-memory buffer for large exports — stream to MinIO
- `ExportModule` injected with `ContributionsService`, `PersonsService`, `MediaService`

**Dependencies:** STORY-013, STORY-016, STORY-017

---

### STORY-019: Print-Ready PDF Export

**Epic:** EPIC-006 — Data Export & Print Output
**Priority:** Should Have
**Points:** 8

**User Story:**
As a coordinator,
I want to generate a print-ready PDF of all submitted contributions,
So that I can directly hand it off to the print production workflow.

**Acceptance Criteria:**
- [ ] `POST /api/v1/export/print` — coordinator/admin only; accepts same filters as STORY-018; returns job ID
- [ ] PDF generated asynchronously (same job status pattern as STORY-018)
- [ ] PDF groups contributions by appointment type; sorted by event date within each group
- [ ] Each contribution page: title, event date, school, description, linked persons, images embedded at full resolution
- [ ] Images embedded at minimum 300 DPI equivalent
- [ ] PDF is version-stamped in footer: "SchoolCronicle Export v1.0 — {exportedAt}"
- [ ] PDF file stored in MinIO `schoolchronicle/exports/{jobId}.pdf`; download via pre-signed URL
- [ ] Angular: "Generate PDF" button on Export page alongside structured export

**Technical Notes:**
- PDF generation: `pdfkit` npm library (no Puppeteer — avoids Chromium dependency in Docker)
- Images: fetched from MinIO in stream, embedded via `pdfkit` image embedding
- Large PDFs (500 contributions × avg 3 images): estimated 15-25 minutes — document this clearly in UI

**Dependencies:** STORY-018

---

### STORY-020: Coordinator Read-Only Overview

**Epic:** EPIC-007 — Coordinator Overview
**Priority:** Could Have
**Points:** 5

**User Story:**
As a coordinator,
I want to see all teacher submissions in a single overview,
So that I can identify missing or incomplete entries without contacting each teacher individually.

**Acceptance Criteria:**
- [ ] Coordinator role (assigned by admin in STORY-005) sees all contributions from all teachers in dashboard
- [ ] Overview shows: teacher name, contribution title, event date, status, last modified
- [ ] Filterable by: teacher, status (draft/submitted), school, date range
- [ ] Read-only — no edit, approve, or reject actions in V1
- [ ] Summary stats at top: total contributions, submitted count, draft count
- [ ] Angular: coordinator dashboard view (different default view than teacher dashboard, same route with role-based rendering)

**Technical Notes:**
- `GET /api/v1/contributions` already returns all contributions for coordinator role (STORY-010)
- Frontend role-switch: Angular `AuthService.currentUser.role` drives which dashboard view renders
- Redis cached query (5-min TTL)

**Dependencies:** STORY-010, STORY-013

---

## Sprint Allocation

### Sprint 1 — May 4–15 | Infrastructure & Authentication

**Goal:** A working, secure application shell — developers can log in, admins can manage accounts, the full local Docker stack is running.

**Stories:**

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| STORY-001 | Dev environment & Docker Compose | 2 | Must Have |
| STORY-002 | Database schema & migrations | 3 | Must Have |
| STORY-003 | User login with JWT | 5 | Must Have |
| STORY-004 | Password reset via email | 3 | Must Have |
| STORY-005 | Admin account management | 5 | Should Have |

**Total:** 18 pts / 30 capacity (60%)
**Buffer:** 12 pts — use for Docker/Nginx setup polish, CI pipeline, first integration tests

**Risks:**
- JWT RS256 key pair generation and Nginx TLS config may take longer than estimated
- School SMTP server access needed for STORY-004 — confirm early

---

### Sprint 2 — May 18–29 | Reference Data & Contribution Foundation

**Goal:** Teachers can create draft contributions linked to schools, persons, and appointment types.

**Stories:**

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| STORY-006 | School registry CRUD | 5 | Must Have |
| STORY-007 | Person registry CRUD | 5 | Must Have |
| STORY-008 | Appointment type management | 3 | Must Have |
| STORY-009 | Contribution creation with validation | 8 | Must Have |

**Total:** 21 pts / 30 capacity (70%)
**Buffer:** 9 pts — Angular form polish, unit tests for contribution validation logic

**Risks:**
- STORY-009 is the largest single story; real-time validation across Angular reactive forms may surface UX issues requiring iteration

---

### Sprint 3 — June 1–12 | Contribution Workflow & Image Upload

**Goal:** Teachers can complete the full contribution lifecycle — create, edit, link persons, and upload validated images — and submit.

**Stories:**

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| STORY-010 | Contribution list & status dashboard | 5 | Must Have |
| STORY-011 | Contribution editing — draft only | 3 | Must Have |
| STORY-012 | Person linking to contribution | 3 | Must Have |
| STORY-013 | Submission state workflow | 5 | Must Have |
| STORY-014 | Image upload with validation | 8 | Must Have |

**Total:** 24 pts / 30 capacity (80%)
**Buffer:** 6 pts — MinIO integration testing, image upload edge cases (large files, network interruption)

**Risks:**
- MinIO streaming integration with NestJS multer is the highest technical risk in the plan — prototype early in sprint
- Image MIME type validation (not extension-only) requires `file-type` library testing

---

### Sprint 4 — June 15–26 | GDPR, Consent & Export Foundation

**Goal:** GDPR compliance complete; coordinator can generate structured data export.

**Stories:**

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| STORY-015 | Image quality guidance UI | 2 | Should Have |
| STORY-016 | GDPR consent capture | 5 | Must Have |
| STORY-017 | GDPR data subject anonymisation | 5 | Must Have |
| STORY-018 | Structured data export | 8 | Must Have |

**Total:** 20 pts / 30 capacity (67%)
**Buffer:** 10 pts — GDPR consent flow UI iteration, anonymisation edge case testing, export schema documentation

**Risks:**
- STORY-016: GDPR consent UI must be clear enough for low-tech users — may require UX iteration
- STORY-017: MinIO delete + DB transaction rollback on failure needs careful testing
- STORY-018 async job pattern is new infrastructure — Redis job state management needs testing

---

### Sprint 5 — June 29–July 10 | PDF Export & Coordinator Overview

**Goal:** Print-ready PDF export available; coordinator has full submission overview.

**Stories:**

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| STORY-019 | Print-ready PDF export | 8 | Should Have |
| STORY-020 | Coordinator read-only overview | 5 | Could Have |

**Total:** 13 pts / 30 capacity (43%)
**Buffer:** 17 pts — PDF layout iteration, Playwright E2E tests for full contribution flow, cross-browser testing (Chrome, Firefox, Edge)

**Risks:**
- STORY-019: `pdfkit` image embedding at print resolution may have memory constraints for large exports — test with realistic data volume

---

### Sprint 6 — July 13–24 | Hardening, Testing & Launch Preparation

**Goal:** Production-ready system validated, documented, and deployable. No new features.

**Hardening tasks (not story-pointed — buffer sprint):**

- [ ] k6 load test: 100 concurrent authenticated users, mixed contribution CRUD and image upload — validate NFR-003 targets
- [ ] axe-core accessibility audit on all screens — fix any WCAG 2.1 AA violations
- [ ] Playwright E2E full suite: login → create contribution → upload image → consent → submit → coordinator export
- [ ] Cross-browser validation: Chrome, Firefox, Edge (latest 2 versions each)
- [ ] Backup restore drill: full restore from pg_dump + MinIO mirror to clean Docker environment
- [ ] Security review: check CSP headers, rate limiting under load, JWT expiry behaviour
- [ ] GDPR audit: verify consent records, anonymisation flow, no personal data in logs
- [ ] Production `docker-compose.yml` final review: restart policies, health checks, volume mounts
- [ ] Uptime Kuma alert configuration for school IT team
- [ ] README and runbook documentation complete
- [ ] Seed production data: initial admin account, appointment types

**Launch window:** July 27–31 — deploy to school server, smoke test, handover to school IT

**Go-live: August 1, 2026** ✓

---

## Epic Traceability

| Epic | Stories | Points | Sprint(s) | Priority |
|------|---------|--------|-----------|----------|
| Infrastructure | STORY-001, STORY-002 | 5 | 1 | Must Have |
| EPIC-001: Auth & User Mgmt | STORY-003, STORY-004, STORY-005 | 13 | 1 | Must/Should |
| EPIC-002: Reference Data | STORY-006, STORY-007, STORY-008 | 13 | 2 | Must Have |
| EPIC-003: Contribution Workflow | STORY-009 – STORY-013 | 24 | 2–3 | Must Have |
| EPIC-004: Image Upload | STORY-014, STORY-015 | 10 | 3–4 | Must/Should |
| EPIC-005: GDPR & Consent | STORY-016, STORY-017 | 10 | 4 | Must Have |
| EPIC-006: Export & Print | STORY-018, STORY-019 | 16 | 4–5 | Must/Should |
| EPIC-007: Coordinator Overview | STORY-020 | 5 | 5 | Could Have |
| **Total** | **20 stories** | **96 pts** | **5 sprints** | |

---

## Requirements Coverage

| FR | Description | Story | Sprint |
|----|-------------|-------|--------|
| FR-001 | User Login | STORY-003 | 1 |
| FR-002 | Password Reset | STORY-004 | 1 |
| FR-003 | School Management | STORY-006 | 2 |
| FR-004 | Person Management | STORY-007 | 2 |
| FR-005 | Contribution Creation | STORY-009 | 2 |
| FR-006 | Contribution Editing | STORY-011 | 3 |
| FR-007 | Contribution List & Status | STORY-010 | 3 |
| FR-008 | Image Upload | STORY-014 | 3 |
| FR-009 | Image Quality Guidance | STORY-015 | 4 |
| FR-010 | Submission State Workflow | STORY-013 | 3 |
| FR-011 | GDPR Consent Capture | STORY-016 | 4 |
| FR-012 | GDPR Data Subject Deletion | STORY-017 | 4 |
| FR-013 | Structured Export | STORY-018 | 4 |
| FR-014 | Print-Ready Export | STORY-019 | 5 |
| FR-015 | Account Management | STORY-005 | 1 |
| FR-016 | Person Linking | STORY-012 | 3 |
| FR-017 | Appointment Type Classification | STORY-008 | 2 |
| FR-018 | Coordinator Read-Only Overview | STORY-020 | 5 |
| FR-019 | Real-Time Field Validation | STORY-009 | 2 |
| FR-020 | Session & Data Security | STORY-003 | 1 |

**Coverage: 20/20 FRs ✓**

---

## Risks & Mitigation

**High:**
- **MinIO streaming + NestJS multer integration (STORY-014)** — prototype at start of Sprint 3; test with realistic 20MB files before committing full implementation
- **GDPR consent UI clarity for low-tech users (STORY-016)** — validate consent modal copy with a real teacher before sprint ends; iterate if needed

**Medium:**
- **School SMTP server access (STORY-004)** — confirm SMTP credentials with school IT in Sprint 1; if unavailable, mock in dev and defer to Sprint 4 for production config
- **pdfkit memory usage for large PDF exports (STORY-019)** — test with 200+ contributions before accepting story; streaming write to MinIO mitigates heap pressure

**Low:**
- **Browser compatibility edge cases** — mitigated by Playwright cross-browser suite in Sprint 6
- **PostgreSQL migration conflicts** — mitigated by TypeORM migration version control; never use `synchronize: true` in production

---

## Definition of Done

For a story to be considered complete:
- [ ] Code implemented and committed to `main`
- [ ] Unit tests written and passing (≥70% coverage on business logic)
- [ ] API integration tests passing (happy path + key error cases)
- [ ] Code linting passing (ESLint + Prettier)
- [ ] Acceptance criteria manually verified in dev environment
- [ ] No known regressions in existing functionality
- [ ] Documentation updated if new environment variables or API endpoints added

---

## Sprint Calendar

| Sprint | Dates | Goal | Points |
|--------|-------|------|--------|
| Sprint 1 | May 4–15 | Infrastructure & Authentication | 18 |
| Sprint 2 | May 18–29 | Reference Data & Contribution Foundation | 21 |
| Sprint 3 | June 1–12 | Contribution Workflow & Image Upload | 24 |
| Sprint 4 | June 15–26 | GDPR, Consent & Export Foundation | 20 |
| Sprint 5 | June 29–July 10 | PDF Export & Coordinator Overview | 13 |
| Sprint 6 | July 13–24 | Hardening, Testing & Launch Prep | Buffer |
| Launch | August 1, 2026 | 🚀 | — |

---

## Next Steps

**Immediate:** Begin Sprint 1

Run `/dev-story STORY-001` to start implementing the development environment and Docker Compose setup.

**Or:** Run `/create-story STORY-001` to generate a detailed story document before implementation.

**Sprint cadence:**
- Sprint planning: Monday of Week 1
- Sprint review: Friday of Week 2
- Sprint retrospective: Friday of Week 2 (same day)

---

**This plan was created using BMAD Method v6 - Phase 4 (Implementation Planning)**

*Run `/workflow-status` anytime to check project progress.*
