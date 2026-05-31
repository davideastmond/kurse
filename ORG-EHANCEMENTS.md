# Platform/Business Ideation

## Focus Features

This ideation expands the two platform/business features selected:

1. Organizations and team seats
2. Webhooks and integrations

---

## 1) Organizations and Team Seats

### Product Goal

Enable companies and schools to buy and manage training for groups of learners, instead of enrolling users one by one.

### Primary Outcomes

- Sell team licenses (seat bundles) tied to an organization.
- Let org admins invite, assign, and revoke learner seats.
- Give org admins reporting across members, courses, completion, and pass rates.

### Personas

- Organization Owner: purchases seats, manages billing contact, delegates admins.
- Organization Admin: invites members, assigns courses, monitors progress.
- Team Learner: joins via invite and consumes assigned courses.
- Platform Admin (internal): support, compliance, and account troubleshooting.

### MVP Scope (V1)

- Create organization account.
- Add one or more organization admins.
- Seat pool tracking (`totalSeats`, `usedSeats`, `availableSeats`).
- Email invite flow for members.
- Assign learners to courses at the org level.
- Org dashboard with key metrics:
  - Member count
  - Seat utilization
  - Course assignment/completion
  - Evaluation pass rate

### Out of Scope (V1)

- Multi-org membership per user.
- Department or team hierarchy.
- SCIM/SAML enterprise provisioning.
- Contract lifecycle and invoicing automation.

### Core User Flows

1. Create Organization

- Internal admin or self-serve customer creates org.
- Owner role granted automatically.
- Seat count initialized.

2. Invite Members

- Admin uploads emails or sends individual invites.
- Invitee accepts and creates/signs in account.
- Seat becomes used when membership is activated.

3. Assign Courses

- Admin assigns one or more courses to selected members.
- Learner sees assigned courses in dashboard.
- Enrollment is auto-created.

4. Monitor Progress

- Admin views completion and score summaries.
- Admin filters by course/member/date range.

### Data Model Sketch (Drizzle/Postgres)

Suggested additions:

- `organizations`
  - `id`, `name`, `slug`, `owner_user_id`, `status`, timestamps
- `organization_memberships`
  - `id`, `organization_id`, `user_id`, `role` (`OWNER` | `ADMIN` | `MEMBER`), `state`, timestamps
  - unique on (`organization_id`, `user_id`)
- `organization_seat_ledger`
  - `id`, `organization_id`, `delta`, `reason`, `actor_user_id`, timestamps
  - append-only seat changes for auditability
- `organization_invites`
  - `id`, `organization_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at`
- `organization_course_assignments`
  - `id`, `organization_id`, `course_id`, `assigned_by_user_id`, timestamps
- `organization_member_course_assignments`
  - `id`, `organization_id`, `user_id`, `course_id`, `source_assignment_id`, timestamps

### Authorization Rules

- Only org `OWNER` and `ADMIN` can invite/revoke/assign.
- `MEMBER` can only view own assignments and progress.
- Platform internal admins can impersonate org context for support with audit logs.

### Metrics and Reporting (V1)

- Seat utilization rate: `usedSeats / totalSeats`.
- Assignment activation rate.
- Completion rate per course.
- Average score and pass rate per evaluation.

### Risks

- Seat state drift if invite acceptance/enrollment fails mid-flow.
- Cross-tenant data leakage if org filters are not enforced server-side.
- Role escalation bugs in membership editing.

### V2 Extensions

- Departments/teams and manager-level analytics.
- Seat auto-reclaim rules for inactive users.
- SSO/SAML and SCIM.
- Billing and plan management automation.

---

## 2) Webhooks and Integrations

### Product Goal

Allow organizations and platform admins to pipe key learning events into external systems (Slack, CRM, HRIS, BI tools, automation platforms).

### Primary Outcomes

- Make Kurse events available in near real time.
- Support simple outbound automation without direct DB access.
- Create a stable integration contract with versioned payloads.

### MVP Scope (V1)

- Org-configurable webhook endpoints.
- Event subscription selection per endpoint.
- Signed webhook delivery (HMAC).
- Retry with exponential backoff.
- Delivery logs UI (success/failure, attempts, response code).

### Initial Event Catalog

- `enrollment.created`
- `lesson.completed`
- `evaluation.submitted`
- `evaluation.passed`
- `evaluation.failed`
- `course.completed`
- `certificate.issued` (when cert feature ships)
- `organization.member.invited`
- `organization.member.joined`

### Webhook Payload Shape (Example)

```json
{
  "id": "evt_01J...",
  "type": "course.completed",
  "version": "2026-05-01",
  "occurredAt": "2026-05-29T10:42:11.000Z",
  "organizationId": "org_123",
  "data": {
    "userId": "usr_123",
    "courseId": "crs_456",
    "enrollmentId": "enr_789",
    "score": 87
  }
}
```

### Security Model

- Per-endpoint secret key.
- Signature header, for example `X-Kurse-Signature`.
- Timestamp header to prevent replay.
- Optional IP allow-list support for enterprise plans.

### Delivery Semantics

- At-least-once delivery guarantee.
- Idempotency key per event ID for consumer dedupe.
- Retry policy example: `1m, 5m, 15m, 1h, 6h, 24h` then dead-letter.

### Data Model Sketch (Drizzle/Postgres)

Suggested tables:

- `webhook_endpoints`
  - `id`, `organization_id` (nullable for platform-level), `url`, `secret_hash`, `status`, timestamps
- `webhook_subscriptions`
  - `id`, `endpoint_id`, `event_type`, unique on (`endpoint_id`, `event_type`)
- `webhook_events`
  - `id`, `event_type`, `version`, `organization_id`, `payload_json`, `occurred_at`
- `webhook_deliveries`
  - `id`, `event_id`, `endpoint_id`, `attempt`, `status`, `response_code`, `response_body_snippet`, `next_retry_at`, `delivered_at`

### System Design Notes

- Emit canonical events from server actions where writes occur.
- Use background jobs (Redis + queue worker) for async delivery.
- Keep event creation transactional with source action when possible.
- Isolate failures: business write succeeds even if webhook delivery fails.

### Admin UX

- Integrations page under org settings:
  - Create endpoint
  - Choose event subscriptions
  - Rotate secret
  - Test webhook button
  - Inspect delivery logs and replay failed event

### Risks

- Noisy retries can create infrastructure spikes.
- Integrators may mishandle idempotency and process duplicates.
- Payload contract changes can break downstream consumers.

### V2 Extensions

- Native connectors (Slack, Zapier, Make, HubSpot).
- Event filtering rules and transforms.
- Pull API for events with checkpoint cursors.
- Integration health scoring and alerting.

---

## Recommended Rollout Sequence

1. Ship Organizations + Seats first to unlock B2B account model.
2. Add webhook infrastructure once org boundaries and roles are stable.
3. Start webhook catalog with 5-7 high-value events, then expand.

## Success Criteria

- At least one org can fully onboard members and assign courses without platform-admin intervention.
- Org admins can view seat utilization and completion from a single dashboard.
- Webhooks deliver reliably with observable logs and replay support.

---

## Phased Implementation Plan (Repo-Mapped)

This section maps the ideation to concrete implementation steps in the current codebase.

## Phase 0: Foundations and Enums

### Objective

Add shared enums and table scaffolding with zero behavior changes.

### Files

- `src/db/schema.ts`
  - Add org-related enums:
    - `organization_role` (`OWNER`, `ADMIN`, `MEMBER`)
    - `organization_status` (`ACTIVE`, `SUSPENDED`)
    - invite state enum (for accepted/expired/revoked)
  - Add webhook-related enums:
    - endpoint status (`ACTIVE`, `PAUSED`)
    - delivery status (`PENDING`, `SUCCESS`, `FAILED`, `DEAD_LETTER`)
- `drizzle/`
  - Add migration for new enums and base tables.
- `src/shared/types/`
  - Add shared event type unions for webhook catalog.

### Acceptance

- Migration runs cleanly.
- No existing app behavior changes.

## Phase 1: Organizations + Seats Core Data Layer

### Objective

Persist organization entities, membership, seat accounting, and invites.

### Files

- `src/db/schema.ts`
  - Add tables:
    - `organizations`
    - `organization_memberships`
    - `organization_seat_ledger`
    - `organization_invites`
- `drizzle/`
  - Add migration files for the above tables.
- `src/app/actions/`
  - Create `organizations.ts` for server actions:
    - `createOrganization`
    - `inviteOrganizationMember`
    - `acceptOrganizationInvite`
    - `revokeOrganizationMembership`
- `src/auth/session.ts`
  - Extend session shape to carry current org context and org role when selected.
- `src/auth/auth.ts`
  - Add helper guards:
    - require org admin/owner
    - ensure organization scoping in actions

### Acceptance

- Organization can be created.
- Invite can be sent and accepted.
- Seat ledger updates reliably on membership activation/revocation.

## Phase 2: Organization Admin UX and Course Assignment

### Objective

Ship first usable admin UI for member management and assignment.

### Files

- `src/app/admin/`
  - Add org-scoped routes:
    - `src/app/admin/org/[orgSlug]/dashboard/page.tsx`
    - `src/app/admin/org/[orgSlug]/members/page.tsx`
    - `src/app/admin/org/[orgSlug]/assignments/page.tsx`
- `src/components/admin/`
  - Add components:
    - members table
    - invite dialog
    - seat utilization card
    - assignment panel
- `src/app/actions/courses.ts`
  - Add org-aware assignment action wrappers or a sibling action file for org assignments.
- `src/db/schema.ts`
  - Add assignment tables:
    - `organization_course_assignments`
    - `organization_member_course_assignments`

### Acceptance

- Org admin can invite users, view members, and assign courses.
- Assigned users receive enrollments and see courses in learner dashboard.

## Phase 3: Webhook Infrastructure (Internal First)

### Objective

Create event and delivery pipeline before exposing endpoint management UI.

### Files

- `src/db/schema.ts`
  - Add tables:
    - `webhook_endpoints`
    - `webhook_subscriptions`
    - `webhook_events`
    - `webhook_deliveries`
- `drizzle/`
  - Add migration files for webhook tables.
- `src/app/utils/`
  - Add `webhooks/` helpers:
    - payload builder
    - signature generator
    - retry scheduling logic
- `src/app/actions/`
  - Add `webhooks.ts` internal helpers to enqueue events from existing actions.
- Existing write actions to instrument:
  - `src/app/actions/enrollments.ts`
  - `src/app/actions/course-runner.ts`
  - evaluation submission flow inside runner-related actions

### Acceptance

- Events are written for selected actions.
- Delivery attempts and retries are persisted.
- No learner/admin-facing regressions on source actions when delivery fails.

## Phase 4: Integrations UI and Endpoint Management

### Objective

Enable org admins to self-serve webhook endpoint setup.

### Files

- `src/app/admin/org/[orgSlug]/integrations/page.tsx`
  - Endpoint CRUD UI and event subscription controls.
- `src/components/admin/`
  - Add:
    - endpoint form
    - event subscription checklist
    - delivery log table
    - replay action controls
- `src/app/actions/webhooks.ts`
  - Public server actions for endpoint create/update/rotate secret/replay.

### Acceptance

- Admin can create endpoint and subscribe to events.
- Admin can see delivery status and replay failed deliveries.

## Phase 5: Hardening, Testing, and Observability

### Objective

Stabilize multi-tenant correctness, idempotency, and operational visibility.

### Files

- `src/app/actions/**/*.test.ts`
  - Add tests for org authorization boundaries and seat accounting.
- `src/components/**/*.test.tsx`
  - Add tests for org admin flows and integrations screens.
- `src/auth/dashboard.test.ts`
  - Extend role/visibility tests with org constraints.
- `README.md`
  - Add setup notes for org/webhook features and required env vars.

### Acceptance

- Cross-tenant leakage tests pass.
- Duplicate webhook delivery safely dedupes by event ID.
- Delivery failure monitoring exists (logs and actionable status in UI).

---

## Suggested Backlog Tickets (Ready to Create)

1. Add org schema + migrations + enums in `src/db/schema.ts` and `drizzle/`.
2. Build `src/app/actions/organizations.ts` with create/invite/accept/revoke flows.
3. Create org admin routes under `src/app/admin/org/[orgSlug]/`.
4. Add org course assignment tables + actions + enrollment bridge.
5. Add webhook schema + migrations + internal event emitter utilities.
6. Instrument enrollment/lesson/evaluation actions to emit webhook events.
7. Build integrations settings UI with delivery logs and replay action.
8. Add tests for auth boundaries, seat consistency, and webhook idempotency.

## Recommended First Slice (1 Sprint)

If you want fastest proof of value, implement this slice first:

- Phase 1 (org data layer) + minimal Phase 2 member invite UI.
- One assignment flow from org admin to learner enrollment.
- One webhook event (`enrollment.created`) with logging only.

This gives you immediate B2B onboarding capability plus the first integration contract with minimal surface area.
