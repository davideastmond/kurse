# Admin Dashboard Sketch

## Goal

This page is the first authenticated screen for users with `ADMIN` role.
It should help instructors quickly find and manage courses they created.

Primary outcomes:

- See a paginated list of owned courses.
- Search and filter courses.
- Click a course to open a storyboard editor route.
- Create a new course in one click.

---

## Recommended Routes (Next.js App Router)

- Dashboard list page: `/admin/dashboard`
- Course storyboard editor: `/admin/storyboard/[courseId]`

This maps naturally to filesystem routes:

- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/storyboard/[courseId]/page.tsx`

Optional add-on routes:

- `src/app/admin/storyboard/[courseId]/publish/page.tsx` for publish checks
- `src/app/admin/storyboard/[courseId]/settings/page.tsx` for metadata/settings

---

## Dashboard UX Layout

Top row:

- Page title: "Your Courses"
- CTA button: "Create Course"
- Subtitle with total count (example: "24 courses")

Filter row:

- Search input (title + slug)
- Status dropdown (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
- Sort dropdown (`updated_at desc`, `created_at desc`, `title asc`)

Main content:

- Table or card-list (table on desktop, card stack on mobile)
- Columns:
  - Title
  - Slug
  - Status
  - Version
  - Last Updated
  - Students (enrollment count)
  - Actions

Row actions:

- "Open Storyboard" -> `/admin/storyboard/[courseId]`
- "Preview"
- "Duplicate"
- "Archive" (soft state switch)

Pagination footer:

- Previous / Next buttons
- Page indicator ("Page 2 of 5")
- Per-page selector (`10`, `20`, `50`)

---

## Pagination Behavior

Use URL query params for shareable state:

- `?page=1&pageSize=10`
- `?q=typescript`
- `?status=DRAFT`
- `?sort=updatedAt_desc`

Suggested server defaults:

- `page=1`
- `pageSize=10`
- `sort=updated_at_desc`

Suggested query response shape:

```ts
type AdminCoursesPage = {
  items: Array<{
    id: string;
    title: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    version: number;
    updatedAt: string;
    enrolledCount: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
```

---

## Data Rules

- Only return courses where `courses.created_by_id = currentAdminId`.
- Never leak courses authored by other admins.
- Enforce this filter server-side even if query params are manipulated.

Status semantics:

- `DRAFT`: not visible in student catalog
- `PUBLISHED`: visible + enrollable
- `ARCHIVED`: hidden from new enrollments (existing progress stays)

---

## Storyboard Page Ideation (`/admin/storyboard/[courseId]`)

Intent: one workspace for structuring modules, lessons, and evaluations.

Layout idea:

- Left sidebar: module/lesson tree with drag handles
- Main pane: selected block editor (video, rich text, image, quiz)
- Right rail: metadata panel (lesson settings, duration, visibility)

Top toolbar:

- Save Draft
- Preview
- Publish / Unpublish
- Version badge
- "Back to Dashboard" link

Quality-of-life features:

- Autosave every N seconds (debounced)
- Dirty state indicator
- Restore last autosave on crash/session resume
- Keyboard shortcuts (`Ctrl/Cmd + S` to save)

---

## Suggested First Iteration Scope (MVP)

1. Build `/admin/dashboard` with paginated owned-course list.
2. Add row click + button navigation to `/admin/storyboard/[courseId]`.
3. Build storyboard page skeleton with module tree + empty editor state.
4. Add draft save action for `courses.structure` JSON.
5. Add publish/unpublish action that flips `courses.status`.

---

## API / Server Action Sketch

Dashboard list:

- `GET /api/admin/courses?page=1&pageSize=10&q=&status=&sort=`

Storyboard:

- `GET /api/admin/courses/:courseId`
- `PATCH /api/admin/courses/:courseId` (title, description, structure)
- `POST /api/admin/courses/:courseId/publish`
- `POST /api/admin/courses/:courseId/unpublish`

If using server actions instead of route handlers, keep identical payload shapes.

---

## Empty and Error States

Empty state:

- Message: "No courses yet"
- Secondary text: "Create your first course to get started"
- Primary CTA: "Create Course"

Error state:

- Inline alert with retry button
- Preserve current filter and page params on retry

Loading state:

- Skeleton rows for list/table
- Disabled pagination controls while loading
