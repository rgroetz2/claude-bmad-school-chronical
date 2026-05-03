# Product Requirements Document: SchoolCronicle

**Date:** 2026-05-02
**Author:** rudolfgroetz
**Version:** 1.0
**Project Type:** Web Application
**Project Level:** 3 (Complex Integration, 12–40 stories)
**Status:** Draft

---

## Document Overview

This Product Requirements Document (PRD) defines the functional and non-functional requirements for SchoolCronicle V1. It serves as the source of truth for what will be built and provides traceability from requirements through implementation.

**Related Documents:**
- Product Brief: `docs/product-brief-schoolCronical-2026-05-02.md`

---

## Executive Summary

SchoolCronicle is a greenfield edtech web application that standardises how teachers submit yearly chronicle contributions, replacing the current coordinator-centric process where one person manually collects, reformats, and completes missing inputs. V1 delivers teacher input workflows only: structured appointment creation and image upload with validation, clear submission states, and export-ready data for downstream chronicle production.

The product solves a high-friction operational problem — inconsistent submissions, missing context, wrong image formats, and deadline-driven back-and-forth that concentrates workload on a single coordinator. The intended outcome is predictable, chronicle-ready input quality throughout the school year, with measurable reductions in reformatting effort, follow-up requests, and late or incomplete contributions.

SchoolCronicle is differentiated by enforcing quality at the point of entry rather than attempting cleanup at publication time. Teachers are guided through required fields and media constraints before submission, so correctness is shifted upstream and coordinator overhead collapses downstream.

---

## Product Goals

### Business Objectives

- Deliver a working V1 by **August 1, 2026**
- Enable teachers to submit chronicle contributions independently without coordinator intervention
- Enable the chronicle to be exported/printed in a production-ready state from data collected in the platform
- Reduce coordinator reformatting effort and resubmission back-and-forth

### Success Metrics

- Appointments, schools, and persons can be created and maintained in the system
- Teachers can complete a submission without coordinator follow-up or reformatting
- The chronicle can be exported/printed in a production-ready state
- The coordinator experiences a measurable reduction in resubmission requests and manual reformatting work
- *(Quantitative metrics to be defined based on real usage data post-launch)*

---

## User Personas

### Primary: Teacher

- **Role:** Staff member submitting chronicle contributions throughout the school year
- **Tech comfort:** Low — requires clear, guided workflows with minimal cognitive overhead
- **Primary device:** Desktop (school computers)
- **Browser:** Chrome, Firefox, or Edge (latest versions)
- **Key pain points:** Unclear submission requirements, uncertainty about what's needed, no visibility into submission status, image format confusion

### Coordinator (Role Within Teacher Group)

- **Role:** A teacher with additional responsibility for overseeing chronicle production
- **V1 access:** Identical to teacher plus optional read-only overview of all submissions
- **Primary benefit in V1:** Reduction in resubmission requests and manual reformatting — not a dedicated dashboard (future scope)

---

## Key User Flows

### Flow 1: Teacher Submits a Contribution

1. Teacher logs in with username and password
2. Teacher opens "New Contribution" from dashboard
3. Teacher selects appointment type, fills required fields (event name, date, description, school)
4. Teacher links relevant persons from registry
5. Teacher uploads image(s) — format/size validated in real time
6. Teacher confirms GDPR consent for image upload
7. Teacher submits — system validates all fields and images
8. Submission status changes to "Submitted" with confirmation shown

### Flow 2: Coordinator Exports Chronicle Data

1. Coordinator logs in
2. Coordinator navigates to Export
3. Coordinator filters by date range / school if needed
4. Coordinator triggers export — receives structured data file and/or print-ready output
5. File handed off to downstream chronicle production

### Flow 3: Admin Provisions a New Teacher Account

1. Admin logs in
2. Admin creates new teacher account (username, email, temporary password)
3. Teacher receives credentials and logs in
4. Teacher is prompted to set a new password on first login

---

## Functional Requirements

Functional Requirements define **what** the system does — specific features and behaviours.

**Priority legend:** Must Have = MVP critical | Should Have = Important, workaround exists | Could Have = Nice to have

---

### FR-001: User Login

**Priority:** Must Have

**Description:**
Teachers can log in to SchoolCronicle using a username and password. Invalid credentials return a clear error message. Sessions expire after a configurable idle period.

**Acceptance Criteria:**
- [ ] Teacher can log in with valid username and password
- [ ] Invalid credentials show a clear error message (no information disclosure about which field is wrong)
- [ ] Session expires after idle timeout (configurable, default 60 minutes)
- [ ] User can log out explicitly

**Dependencies:** None

---

### FR-002: Password Reset

**Priority:** Must Have

**Description:**
Teachers can reset a forgotten password via a secure email-based reset flow.

**Acceptance Criteria:**
- [ ] Teacher can request a password reset by entering their registered email
- [ ] Reset link is sent to registered email and expires within 24 hours
- [ ] After reset, old password no longer works
- [ ] Reset link is single-use

**Dependencies:** FR-001

---

### FR-003: School Record Management

**Priority:** Must Have

**Description:**
Authorised users can create, view, edit, and deactivate school records. Schools are reference data used in contributions.

**Acceptance Criteria:**
- [ ] School record can be created with at minimum: name, location/city
- [ ] Schools can be searched and selected when creating a contribution
- [ ] Schools can be edited; changes reflect in all linked contributions
- [ ] Schools can be deactivated (not deleted) to preserve historical data
- [ ] Deactivated schools are not shown in contribution creation search

**Dependencies:** None

---

### FR-004: Person Record Management

**Priority:** Must Have

**Description:**
Authorised users can create, view, edit, and deactivate person records. Persons are reference data (individuals photographed or mentioned in contributions).

**Acceptance Criteria:**
- [ ] Person record can be created with at minimum: first name, last name, school affiliation
- [ ] Persons can be searched when creating a contribution
- [ ] Persons can be edited; changes reflect in linked contributions
- [ ] Persons can be deactivated to preserve historical data
- [ ] Deactivated persons are not shown in contribution creation search

**Dependencies:** FR-003

---

### FR-005: Contribution Creation

**Priority:** Must Have

**Description:**
Teachers can create a new chronicle contribution (appointment entry) with structured required fields enforced at input time. A contribution cannot be submitted unless all required fields pass validation.

**Acceptance Criteria:**
- [ ] Teacher can create a new contribution from their dashboard
- [ ] Required fields are clearly indicated and enforced before submission
- [ ] Contribution is linked to at minimum: appointment type, event date, description, school
- [ ] System prevents submission if required fields are missing or invalid
- [ ] Partial input can be saved as a draft

**Dependencies:** FR-001, FR-003

---

### FR-006: Contribution Editing

**Priority:** Must Have

**Description:**
Teachers can edit their own draft contributions. Submitted contributions are read-only in V1.

**Acceptance Criteria:**
- [ ] Teacher can open and edit any of their draft contributions
- [ ] Submitted contributions are read-only for the teacher in V1
- [ ] All validation rules apply on save/resubmit

**Dependencies:** FR-005

---

### FR-007: Contribution List & Status View

**Priority:** Must Have

**Description:**
Teachers can view a list of all their contributions with clear status indicators.

**Acceptance Criteria:**
- [ ] Dashboard shows all contributions for the logged-in teacher
- [ ] Each contribution shows: title/event, date, status (Draft / Submitted), last modified date
- [ ] Teacher can navigate from list to individual contribution detail
- [ ] List supports basic filtering by status

**Dependencies:** FR-005

---

### FR-008: Image Upload

**Priority:** Must Have

**Description:**
Teachers can upload one or more images to a contribution. The system validates format and file size before accepting the upload.

**Acceptance Criteria:**
- [ ] Teacher can attach images to a contribution
- [ ] Accepted formats: JPEG, PNG (configurable)
- [ ] Maximum file size enforced (exact value TBD in architecture, default 20MB per image)
- [ ] Clear error message shown if format or size validation fails
- [ ] Images are associated with the specific contribution
- [ ] Upload progress is shown for large files

**Dependencies:** FR-005

---

### FR-009: Image Quality Guidance

**Priority:** Should Have

**Description:**
The system provides guidance on minimum resolution/quality requirements before and during upload to reduce rejection of unusable images.

**Acceptance Criteria:**
- [ ] Upload UI displays minimum resolution requirement before file selection
- [ ] System warns (but does not block) if image appears below recommended quality
- [ ] Guidance is written in plain, non-technical language

**Dependencies:** FR-008

---

### FR-010: Submission State Workflow

**Priority:** Must Have

**Description:**
Contributions move through a defined state machine: Draft → Submitted. State is visible to the teacher at all times.

**Acceptance Criteria:**
- [ ] New contributions default to Draft status
- [ ] Teacher can explicitly submit a Draft contribution (triggering final validation)
- [ ] Submission is rejected with clear error messages if any required field or image validation fails
- [ ] Submitted contributions display "Submitted" status with timestamp
- [ ] Teacher receives on-screen confirmation on successful submission

**Dependencies:** FR-005, FR-008

---

### FR-011: GDPR Consent Capture for Images

**Priority:** Must Have

**Description:**
When uploading images containing identifiable individuals, the teacher must confirm that required consent has been obtained. Consent is captured as a mandatory checkbox before image upload is accepted.

**Acceptance Criteria:**
- [ ] Image upload flow includes a mandatory consent confirmation checkbox with clear explanatory text
- [ ] Contribution cannot be submitted without consent confirmation for each image upload event
- [ ] Consent confirmation is stored with timestamp and linked to the specific upload event
- [ ] Consent record is retained per data retention policy (to be confirmed with legal review)

**Dependencies:** FR-008

---

### FR-012: GDPR Data Subject Rights — Deletion

**Priority:** Must Have

**Description:**
The system supports the right to erasure. Personal data (person records and associated images) can be anonymised upon verified request.

**Acceptance Criteria:**
- [ ] Administrator can flag a person record for deletion/anonymisation
- [ ] Deletion anonymises personal data and associated images
- [ ] Deletion is logged with timestamp and reason
- [ ] Contribution records remain intact with anonymised person reference

**Dependencies:** FR-004, FR-008

---

### FR-013: Export — Structured Data

**Priority:** Must Have

**Description:**
The system can export all submitted contributions in a structured, chronicle-ready format for downstream production use.

**Acceptance Criteria:**
- [ ] Export includes all submitted contributions with full field data
- [ ] Export includes image file references or bundled image package
- [ ] Export is filterable by date range and/or school
- [ ] Exported data is consistently formatted and requires zero manual reformatting
- [ ] Export format is versioned and documented

**Dependencies:** FR-010

---

### FR-014: Export — Print-Ready Output

**Priority:** Should Have

**Description:**
The system can generate a print-ready output suitable for direct handoff to a print/production workflow.

**Acceptance Criteria:**
- [ ] Print-ready export groups contributions in a logical chronicle order
- [ ] Images are embedded at correct resolution
- [ ] Output format is documented for downstream use

**Dependencies:** FR-013

---

### FR-015: User Account Management (Admin)

**Priority:** Should Have

**Description:**
An administrator can create, deactivate, and reset teacher accounts. No self-registration — accounts are provisioned by the administrator.

**Acceptance Criteria:**
- [ ] Admin can create a new teacher account (username, email, temporary password)
- [ ] Teacher is prompted to change password on first login
- [ ] Admin can deactivate an account (access removed, data retained)
- [ ] Admin can trigger a password reset for any account
- [ ] No public self-registration endpoint exists

**Dependencies:** FR-001

---

### FR-016: Contribution — Person Linking

**Priority:** Must Have

**Description:**
Teachers can link one or more person records to a contribution.

**Acceptance Criteria:**
- [ ] Person search is available within the contribution creation flow
- [ ] Multiple persons can be linked to one contribution
- [ ] Linked persons are shown in contribution detail view
- [ ] Linking a person triggers GDPR consent reminder if images are present

**Dependencies:** FR-004, FR-005, FR-011

---

### FR-017: Contribution — Appointment Type Classification

**Priority:** Must Have

**Description:**
Contributions are classified by appointment/event type. Type is a required field that drives downstream chronicle organisation.

**Acceptance Criteria:**
- [ ] Appointment type is a required field on every contribution
- [ ] Types are selectable from a managed list (configurable by admin)
- [ ] Type is included in export data for chronicle ordering

**Dependencies:** FR-005

---

### FR-018: Coordinator Read-Only Overview

**Priority:** Could Have

**Description:**
The coordinator (a teacher with elevated role) can view all submissions from all teachers in a read-only overview. No approval/rejection actions in V1.

**Acceptance Criteria:**
- [ ] Coordinator role can be assigned to a teacher account by admin
- [ ] Coordinator sees all contributions from all teachers in their dashboard
- [ ] No edit or approval actions — read-only in V1
- [ ] Coordinator can filter by teacher, status, school, and date range

**Dependencies:** FR-007, FR-015

---

### FR-019: Input Field Validation — Real-Time Feedback

**Priority:** Must Have

**Description:**
Form fields provide real-time validation feedback as the teacher types or moves between fields.

**Acceptance Criteria:**
- [ ] Required fields show clear visual indicator (e.g. asterisk + red border if empty on blur)
- [ ] Format errors show inline error messages
- [ ] Submit button is disabled or shows warning if validation errors remain
- [ ] All error messages in plain language — no technical jargon

**Dependencies:** FR-005

---

### FR-020: Session & Data Security

**Priority:** Must Have

**Description:**
All data in transit is encrypted. Sessions are secured against common web vulnerabilities.

**Acceptance Criteria:**
- [ ] All traffic over HTTPS — no HTTP fallback
- [ ] CSRF protection on all state-changing requests
- [ ] XSS protection via content security policy and output encoding
- [ ] Session tokens invalidated on logout and expiry

**Dependencies:** FR-001

---

## Non-Functional Requirements

Non-Functional Requirements define **how** the system performs — quality attributes and constraints.

---

### NFR-001: Security — GDPR Compliance

**Priority:** Must Have

**Description:**
The system complies with GDPR requirements for processing personal data, including identifiable individuals in uploaded photographs.

**Acceptance Criteria:**
- [ ] A Data Processing Agreement (DPA) and Privacy Policy are in place before go-live
- [ ] All personal data fields are documented in a data register
- [ ] Consent records are stored with timestamp, purpose, and subject linkage
- [ ] Right to erasure is implementable within 30 days of verified request
- [ ] No personal data stored outside the EU (or equivalent adequacy region)

**Rationale:** Non-negotiable legal requirement. Photos may contain identifiable minors.

---

### NFR-002: Security — Authentication & Authorisation

**Priority:** Must Have

**Description:**
Access is controlled by role-based authentication. Passwords are stored using a modern hashing algorithm.

**Acceptance Criteria:**
- [ ] Passwords hashed with bcrypt or Argon2 (minimum work factor per current best practice)
- [ ] All API endpoints require valid session token
- [ ] Role-based access enforced server-side
- [ ] Brute-force protection: rate limiting after 5 failed login attempts

**Rationale:** School data includes personal information about staff and potentially minors.

---

### NFR-003: Performance — Page Load & Response Time

**Priority:** Must Have

**Description:**
Core pages and form interactions are responsive for low-tech users on standard school network conditions.

**Acceptance Criteria:**
- [ ] Initial authenticated page load < 3 seconds on a 10 Mbps connection
- [ ] Form validation feedback appears < 200ms after user interaction
- [ ] 20MB image upload completes within 60 seconds on a 10 Mbps connection
- [ ] Export generation completes within 30 seconds for up to 500 contributions

**Rationale:** Low-tech users on school networks have low tolerance for perceived slowness.

---

### NFR-004: Usability — Low-Tech User Optimisation

**Priority:** Must Have

**Description:**
The UI is usable without training for low-tech desktop users.

**Acceptance Criteria:**
- [ ] A teacher with no prior training can complete a contribution submission in under 10 minutes
- [ ] All error messages are in plain, non-technical language
- [ ] No action requires more than 5 clicks from the dashboard
- [ ] Form layouts follow a single-column, top-to-bottom structure on desktop

**Rationale:** Primary users are low-tech; poor usability directly drives failed adoption.

---

### NFR-005: Accessibility — WCAG 2.1 AA

**Priority:** Should Have

**Description:**
The application meets WCAG 2.1 Level AA accessibility standards.

**Acceptance Criteria:**
- [ ] All interactive elements are keyboard-navigable
- [ ] Colour contrast ratios meet WCAG AA minimums (4.5:1 for body text)
- [ ] All images have descriptive alt text
- [ ] Forms use proper label associations
- [ ] Screen reader compatibility verified with at least one major screen reader

**Rationale:** EU accessibility requirements; school environments may include staff with disabilities.

---

### NFR-006: Browser Compatibility

**Priority:** Must Have

**Description:**
The application works correctly on the browsers most commonly found on school desktop computers.

**Acceptance Criteria:**
- [ ] Fully functional on: Chrome (latest 2 versions), Firefox (latest 2 versions), Edge (latest 2 versions)
- [ ] Responsive layout usable on mobile browsers (Chrome/Safari on iOS and Android)
- [ ] No dependency on browser plugins or extensions

**Rationale:** Schools have heterogeneous IT environments.

---

### NFR-007: Reliability — Availability

**Priority:** Must Have

**Description:**
The system is available during school hours with planned maintenance outside peak usage periods.

**Acceptance Criteria:**
- [ ] 99% uptime during school hours (Monday–Friday, 07:00–18:00 local time)
- [ ] Planned maintenance windows communicated in advance and scheduled outside school hours
- [ ] System recovers automatically from transient errors without data loss

**Rationale:** Chronicle deadlines are school-calendar-driven; downtime during submission periods is high-impact.

---

### NFR-008: Data Integrity & Backup

**Priority:** Must Have

**Description:**
Contribution data and uploaded images are backed up regularly with defined recovery objectives.

**Acceptance Criteria:**
- [ ] Automated daily backups of all database data and uploaded files
- [ ] Backup restoration tested at least once before go-live
- [ ] Recovery Point Objective (RPO): 24 hours maximum
- [ ] Recovery Time Objective (RTO): 4 hours maximum

**Rationale:** Chronicle contributions represent real teacher work. Data loss drives significant coordinator overhead.

---

### NFR-009: Scalability

**Priority:** Should Have

**Description:**
The system handles expected concurrent load of a single-school deployment without performance degradation.

**Acceptance Criteria:**
- [ ] Supports up to 100 concurrent authenticated users without performance degradation
- [ ] Supports up to 10,000 contributions and 50,000 images without query performance regression
- [ ] Architecture allows horizontal scaling for multi-school deployments in future

**Rationale:** V1 targets single-school deployments; architecture should not foreclose growth.

---

### NFR-010: Maintainability — Code Quality

**Priority:** Should Have

**Description:**
The codebase is structured for long-term maintainability with consistent conventions, test coverage, and documentation.

**Acceptance Criteria:**
- [ ] Minimum 70% unit test coverage on business logic
- [ ] API endpoints have integration tests covering happy path and key error cases
- [ ] Code linting and formatting enforced via CI
- [ ] README documents local setup completable in under 15 minutes for a new developer

**Rationale:** Greenfield project; sets the quality baseline for all future development.

---

### NFR-011: Data Export — Format Stability

**Priority:** Must Have

**Description:**
The export format is versioned and stable. Downstream chronicle production tools can rely on a consistent structure.

**Acceptance Criteria:**
- [ ] Export format is documented with a version identifier
- [ ] Breaking changes to export format are versioned (v1, v2, etc.)
- [ ] Export schema is available to downstream integrators

**Rationale:** Export is the primary value delivery mechanism — format instability breaks the downstream workflow.

---

## Epics

Epics are logical groupings of related functionality that will be broken down into user stories during sprint planning (Phase 4).

---

### EPIC-001: Authentication & User Management

**Description:**
Establish secure access to the platform. Teachers log in, manage passwords, and administrators provision accounts. Foundation for all other epics.

**Functional Requirements:**
- FR-001 (User Login)
- FR-002 (Password Reset)
- FR-015 (Account Management — Admin)
- FR-020 (Session & Data Security)

**Story Count Estimate:** 4–6 stories
**Priority:** Must Have
**Business Value:** No other epic is deliverable without secure, working authentication.

---

### EPIC-002: Reference Data Management

**Description:**
Maintain the school and person registries that contributions reference. Quality reference data is a prerequisite for structured, consistent contributions.

**Functional Requirements:**
- FR-003 (School Record Management)
- FR-004 (Person Record Management)

**Story Count Estimate:** 3–5 stories
**Priority:** Must Have
**Business Value:** Ensures contributions reference standardised entities rather than free-text, reducing inconsistency downstream.

---

### EPIC-003: Contribution Workflow

**Description:**
The core teacher-facing workflow: create, edit, classify, and submit chronicle contributions with required fields enforced at input time. This is the central value delivery epic.

**Functional Requirements:**
- FR-005 (Contribution Creation)
- FR-006 (Contribution Editing)
- FR-007 (Contribution List & Status View)
- FR-010 (Submission State Workflow)
- FR-016 (Person Linking)
- FR-017 (Appointment Type Classification)
- FR-019 (Real-Time Field Validation)

**Story Count Estimate:** 6–9 stories
**Priority:** Must Have
**Business Value:** Directly replaces the broken manual process. Enforces input quality at the point of entry.

---

### EPIC-004: Image Upload & Validation

**Description:**
Teachers attach images to contributions. Format, size, and quality constraints are enforced before acceptance, eliminating the most common cause of coordinator reformatting work.

**Functional Requirements:**
- FR-008 (Image Upload)
- FR-009 (Image Quality Guidance)

**Story Count Estimate:** 3–5 stories
**Priority:** Must Have
**Business Value:** Image quality issues are the highest-frequency source of resubmission requests. Fixing this upstream has immediate coordinator ROI.

---

### EPIC-005: GDPR & Consent Management

**Description:**
Embed GDPR compliance into the contribution and image upload workflows. Consent is captured explicitly, stored auditably, and data subject rights are supported.

**Functional Requirements:**
- FR-011 (Consent Capture for Images)
- FR-012 (Data Subject Deletion)

**Story Count Estimate:** 3–5 stories
**Priority:** Must Have
**Business Value:** Legal requirement. Non-compliance risk is high given photos may contain identifiable minors.

---

### EPIC-006: Data Export & Print Output

**Description:**
Deliver chronicle-ready export from submitted contributions. This is the downstream handoff that makes the coordinator's production workflow possible without manual reformatting.

**Functional Requirements:**
- FR-013 (Structured Data Export)
- FR-014 (Print-Ready Output)

**Story Count Estimate:** 3–5 stories
**Priority:** Must Have (FR-013) / Should Have (FR-014)
**Business Value:** Export is the terminal value delivery. Without it, data collected in the platform cannot produce a chronicle.

---

### EPIC-007: Coordinator Overview

**Description:**
Give the coordinator a read-only view across all teacher submissions. Provides operational visibility without requiring a full coordinator dashboard (deferred to post-V1).

**Functional Requirements:**
- FR-018 (Coordinator Read-Only Overview)

**Story Count Estimate:** 2–3 stories
**Priority:** Could Have
**Business Value:** Allows the coordinator to spot missing or incomplete submissions without manually contacting teachers.

---

## User Stories (High-Level)

Detailed user stories will be created during sprint planning (Phase 4). High-level examples per epic:

- **EPIC-001:** As a teacher, I want to log in with my username and password so that I can access my contributions securely.
- **EPIC-002:** As a teacher, I want to search and select a school when creating a contribution so that entries are consistently linked to reference data.
- **EPIC-003:** As a teacher, I want to create a contribution and save it as a draft so that I can complete it before the deadline.
- **EPIC-004:** As a teacher, I want the system to validate my image format and size immediately on upload so that I know before submission if anything is wrong.
- **EPIC-005:** As a teacher, I want to confirm consent for uploaded images so that the school's GDPR obligations are met.
- **EPIC-006:** As a coordinator, I want to export all submitted contributions in a chronicle-ready format so that I can hand off to print production without manual reformatting.
- **EPIC-007:** As a coordinator, I want to see all teacher submissions in a read-only overview so that I can identify missing or incomplete entries.

---

## Dependencies

### Internal Dependencies

- Authentication system must be complete before any other epic can be tested end-to-end (EPIC-001 blocks all)
- Reference data (EPIC-002) must be seeded before contribution workflow can be fully tested (EPIC-003)
- Image upload (EPIC-004) must be complete before GDPR consent (EPIC-005) can be implemented
- Contribution workflow (EPIC-003) must be complete before export (EPIC-006) is meaningful

### External Dependencies

- Legal review of GDPR data handling approach required before EPIC-005 implementation
- Downstream chronicle production format must be confirmed before EPIC-006 export format is finalised
- School IT environment (email delivery for password reset) must be accessible

---

## Assumptions

- Teachers have access to a desktop computer and a modern web browser (Chrome, Firefox, or Edge) at school
- Schools already have a designated coordinator role assigned
- The downstream chronicle production process accepts structured data export (format TBD in architecture phase)
- Email delivery is available for password reset functionality
- Image consent obligations are the responsibility of the school/teacher; the system records that consent was confirmed by the submitting teacher

---

## Out of Scope (V1)

- Native iOS and Android apps (planned post-V1)
- In-app chronicle editing or document assembly
- Coordinator approval / rejection / flagging workflow
- Notification and reminder system
- Print vendor or publisher direct integrations
- Multi-school administration / tenant management
- Public self-registration

---

## Open Questions

- What is the exact maximum image file size and minimum resolution requirement? *(To be confirmed in architecture phase)*
- What structured export format does the downstream print/production workflow require? *(To be confirmed with coordinator/print vendor)*
- What is the data retention period for GDPR consent records and personal data? *(To be confirmed with legal review)*
- Will the system be self-hosted by schools or SaaS-hosted? *(Impacts hosting, GDPR data residency, and ops model)*

---

## Approval & Sign-off

### Stakeholders

| Stakeholder | Role | Influence |
|-------------|------|-----------|
| School Admin | Procurement and approval decision maker | High |
| Coordinator | Primary power user; validates workflow quality in practice | High |

### Approval Status

- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] QA Lead

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-02 | rudolfgroetz | Initial PRD |

---

## Next Steps

### Phase 3: Architecture

Run `/architecture` to create system architecture based on these requirements.

The architecture will address:
- All functional requirements (FRs)
- All non-functional requirements (NFRs) — especially GDPR, performance, and export format
- Technical stack decisions
- Data models and APIs
- System components and deployment

### Phase 4: Sprint Planning

After architecture is complete, run `/sprint-planning` to:
- Break epics into detailed user stories
- Estimate story complexity
- Plan sprint iterations
- Begin implementation

---

**This document was created using BMAD Method v6 - Phase 2 (Planning)**

*To continue: Run `/workflow-status` to see your progress and next recommended workflow.*

---

## Appendix A: Requirements Traceability Matrix

| Epic ID | Epic Name | Functional Requirements | Story Count (Est.) |
|---------|-----------|-------------------------|-------------------|
| EPIC-001 | Authentication & User Management | FR-001, FR-002, FR-015, FR-020 | 4–6 |
| EPIC-002 | Reference Data Management | FR-003, FR-004 | 3–5 |
| EPIC-003 | Contribution Workflow | FR-005, FR-006, FR-007, FR-010, FR-016, FR-017, FR-019 | 6–9 |
| EPIC-004 | Image Upload & Validation | FR-008, FR-009 | 3–5 |
| EPIC-005 | GDPR & Consent Management | FR-011, FR-012 | 3–5 |
| EPIC-006 | Data Export & Print Output | FR-013, FR-014 | 3–5 |
| EPIC-007 | Coordinator Overview | FR-018 | 2–3 |
| **Total** | | **20 FRs** | **24–38 stories** |

---

## Appendix B: Prioritisation Summary

### Functional Requirements

| Priority | Count | FRs |
|----------|-------|-----|
| Must Have | 14 | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010, FR-011, FR-012, FR-013, FR-016, FR-017, FR-019, FR-020 |
| Should Have | 3 | FR-009, FR-014, FR-015 |
| Could Have | 1 | FR-018 |

### Non-Functional Requirements

| Priority | Count | NFRs |
|----------|-------|------|
| Must Have | 7 | NFR-001, NFR-002, NFR-003, NFR-004, NFR-006, NFR-007, NFR-008, NFR-011 |
| Should Have | 3 | NFR-005, NFR-009, NFR-010 |
