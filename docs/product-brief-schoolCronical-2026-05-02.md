# Product Brief: SchoolCronicle

**Date:** 2026-05-02
**Author:** rudolfgroetz
**Version:** 1.0
**Project Type:** Web Application
**Project Level:** 3 (Complex Integration, 12–40 stories)

---

## Executive Summary

SchoolCronicle is a greenfield edtech web application that standardizes how teachers submit yearly chronicle contributions, replacing the current coordinator-centric process where one person manually collects, reformats, and completes missing inputs. V1 delivers teacher input workflows only: structured appointment creation and image upload with validation, clear submission states, and export-ready data for downstream chronicle production. The product solves a high-friction operational problem — inconsistent submissions, missing context, wrong image formats, and deadline-driven back-and-forth that concentrates workload on a single coordinator — with the intended outcome of predictable, chronicle-ready input quality throughout the school year.

---

## Problem Statement

### The Problem

Chronicle production is bottlenecked not by document assembly, but by input quality and timing. Teachers submit contributions inconsistently: missing required context, wrong image formats, incomplete entries. The coordinator — themselves a teacher with other duties — must manually chase resubmissions, reformat images, fill in missing fields, and manage deadline pressure across the entire staff. This workload is concentrated on a single person and recurs every school year.

### Why Now?

The operational pain is recurring and predictable. Each school year the same failure modes repeat. A structured digital workflow can eliminate the root cause — poor input quality at submission time — rather than treating symptoms at publication time.

### Impact if Unsolved

Without intervention, coordinator overhead remains high, submission quality stays inconsistent, and chronicle production continues to depend on one person manually absorbing all variance. Deadline risk and burnout risk remain concentrated on the coordinator role.

---

## Target Audience

### Primary Users

**Teachers** — the staff members submitting chronicle contributions throughout the school year.
- **Tech comfort:** Low. Requires clear, guided workflows with minimal cognitive overhead.
- **Primary device:** Desktop (school computers).
- **Key pain points:** Unclear submission requirements, uncertainty about what's needed, no visibility into submission status.

### Secondary Users

None explicitly in V1 scope.

### User Needs

- Know exactly what information and media is required before submitting
- Upload images that meet format/size requirements without needing to reformat manually
- See the status of their own submissions (draft, submitted, complete)
- Complete a submission without requiring coordinator follow-up

### Coordinator (Role Within Teacher Group)

The coordinator is one of the teachers, with additional responsibility for overseeing the chronicle production process. In V1, the coordinator's primary benefit is a reduction in inbound resubmission requests and reformatting work — not a dedicated coordinator dashboard (future scope).

---

## Solution Overview

### Proposed Solution

A web-based submission platform that enforces contribution quality at the point of entry. Teachers are guided through required fields and media constraints before a submission is accepted, shifting correctness upstream and collapsing coordinator overhead downstream. V1 is web-frontend only, responsive and usable on mobile browsers, with native iOS and Android apps planned post-V1 after workflow and API patterns are proven.

### Key Features (V1)

- **Structured contribution creation** — appointments with required fields enforced at input time
- **Person and school management** — maintain a registry of persons and schools referenced in contributions
- **Image upload with validation** — format, size, and quality constraints enforced before submission
- **Submission states** — clear draft → submitted workflow visible to the teacher
- **Export-ready data** — output structured for downstream chronicle production / print
- **GDPR compliance** — mandatory from day one; consent and data handling for identifiable individuals in photos

### Value Proposition

SchoolCronicle enforces quality at the point of entry rather than attempting cleanup at publication time. The core insight is that the chronicle bottleneck is input quality and timing — not document assembly. By designing around this operational reality, the product creates immediate value without requiring full in-app chronicle editing in V1.

---

## Business Objectives

### Goals

- Deliver a working V1 by **August 1, 2026**
- Enable teachers to submit chronicle contributions independently without coordinator intervention
- Enable the chronicle to be printed/exported from data collected in the platform

### Success Metrics

- To be defined based on real usage data post-launch

### Business Value

- Reduction in coordinator reformatting effort
- Reduction in late or incomplete contributions
- Predictable, chronicle-ready input quality throughout the school year

---

## Scope

### In Scope (V1)

- Teacher contribution submission workflow
- Structured appointment / entry creation with required field enforcement
- Person registry management (individuals referenced in contributions)
- School registry management
- Image upload with format and size validation
- Submission states (draft → submitted)
- Export-ready data output suitable for chronicle production / print
- Responsive web application (usable on mobile browsers)
- GDPR compliance (mandatory, non-negotiable)

### Out of Scope (V1)

- Native iOS and Android apps (planned post-V1)
- In-app chronicle editing or document assembly
- Coordinator approval / rejection / flagging workflow
- Notification and reminder system
- Print vendor or publisher integrations

### Future Considerations

- Native mobile apps (iOS / Android) after V1 API patterns proven
- Coordinator dashboard with submission oversight and status management
- Automated reminders and deadline tracking
- Direct integration with print/publishing workflows

---

## Key Stakeholders

| Stakeholder | Role | Influence |
|-------------|------|-----------|
| **School Admin** | Procurement and approval decision maker | High |
| **Coordinator** | Primary power user; validates workflow quality in practice | High |

---

## Constraints and Assumptions

### Constraints

- **GDPR compliance is mandatory and non-negotiable** from day one. The platform processes personal data and potentially identifiable individuals in uploaded photos. Consent management and data handling must be built into the core upload workflow, not retrofitted.
- **Target launch: August 1, 2026** — driven by the school year calendar.

### Assumptions

- Teachers have access to a desktop computer and a modern web browser at school
- Schools already have a designated coordinator role assigned
- The downstream chronicle production process accepts structured data export (format TBD in architecture phase)

---

## Success Criteria

- Appointments, schools, and persons can be created and maintained in the system
- Teachers can complete a submission without coordinator follow-up or reformatting
- The chronicle can be exported/printed in a production-ready state from data in the platform
- The coordinator experiences a measurable reduction in resubmission requests and manual reformatting work

---

## Timeline and Milestones

### Target Launch

**August 1, 2026** — V1 live, driven by school year production calendar.

### Key Milestones

- PRD and Architecture complete → begin sprint planning
- Core data model and submission workflow implemented
- Image upload with GDPR-compliant handling live
- Export-ready data output validated against print requirements
- V1 launch: August 1, 2026

---

## Risks and Mitigation

- **Risk:** GDPR compliance complexity (photos of identifiable individuals)
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Treat GDPR as a first-class architectural concern from day one. Design consent capture and data handling into the image upload workflow at the requirements level, not as an afterthought. Seek legal review of data handling approach before implementation.

---

## Next Steps

1. Create Product Requirements Document (PRD) — `/prd`
2. Conduct user research (optional) — `/research`
3. Create UX design (if UI-heavy) — `/create-ux-design`

---

**This document was created using BMAD Method v6 - Phase 1 (Analysis)**

*To continue: Run `/workflow-status` to see your progress and next recommended workflow.*
