# Storyboard V2: Priority Features (Reordering + Welcome Screen Image)

## Feasibility Summary

Both features are feasible with low-to-moderate risk and align with the current architecture.

- Reordering is already compatible with the current ordered array model and builder order maps.
- Welcome screen images can reuse the existing media upload pipeline and be stored in `structure.metadata` without a schema migration.
- Current whole-document, versioned save flow (`expectedVersion`) supports both features.

Conclusion: both are good V2 candidates with no required DB migration.

## Feature A: Reordering (Modules, Lessons, Blocks)

### Current readiness

- Ordering is explicit in payload arrays:
  - `modules[]`
  - `module.lessons[]`
  - `lesson.blocks[]`
- Builder layer already preserves order through:
  - `moduleOrder`
  - `lessonOrderByModule`
  - `blockOrderByLesson`

### What changes in V2

1. UI interactions

- Keep move up/down controls as baseline.
- Optional enhancement: drag-and-drop for modules, lessons, and blocks.
- Optional V2.1: cross-parent moves (lesson -> another module, block -> another lesson).

2. Workspace mutation handling

- Keep immutable reorder handlers in workspace state.
- Add transfer handlers only if cross-parent moves are in scope.

3. Selection behavior

- Preserve selected entity after reorder.
- If moved across parent, update selected path (`moduleId`, `lessonId`, `blockId`).

4. Save behavior

- Reuse current autosave flow.
- For drag-and-drop, persist on drop (not every pointer move) to reduce save churn.

### Risks

- Version conflicts when multiple admins edit simultaneously.
- Additional complexity for accessible drag-and-drop.
- Performance overhead on very large storyboards if re-renders are not controlled.

## Feature B: Welcome Screen Image (Admin-managed)

### Product intent

Allow admins to attach a hero image to the learner-facing welcome screen (`Welcome to {course}`), with easy upload, replace, and remove actions.

### Proposed data shape

Add optional metadata field in storyboard payload:

- `metadata.welcomeImages?: WelcomeScreenImage[]`

Where each `WelcomeScreenImage` includes:

- `url: string`
- `alt?: string`

For V2, the admin UI can continue to manage a single hero image while storing it in the array-based contract used by the implementation.

### Admin UI flow

1. Open welcome settings

- Add a `Welcome Screen` card in the storyboard side panel (where course-level settings live).
- Show current title/synopsis preview and image status.

2. Add image

- Click `Upload image`.
- Select file (image only).
- Validate size/type client-side.
- Upload using existing `uploadToS3` action.
- On success, preview updates and autosave runs.

3. Replace image

- If an image exists, primary action becomes `Replace image`.
- Same upload flow; URL is overwritten.

4. Remove image

- Secondary action `Remove image` with confirmation.
- Clear `welcomeImageUrl`, update preview to empty state, autosave.

5. Error handling

- Inline error message on upload failure.
- Keep previous image unchanged when upload fails.

### Learner UI behavior

- Render image in the welcome overview section.
- If missing, keep current text-only layout with no visual gap.
- Maintain responsive behavior for mobile/desktop.

### Technical notes

- Reuse current S3 upload infrastructure used by image blocks.
- Persist in storyboard structure metadata for fastest integration.
- DB column `courses.coverImageUrl` can remain unused for V2 unless we decide to normalize course media fields later.

## Recommended Delivery Plan

1. V2.0 (low risk, high value)

- Keep current reorder controls (up/down), no cross-parent moves.
- Ship welcome image flow: upload, preview, replace, remove.
- Render welcome image in learner welcome screen.

2. V2.1 (enhancements)

- Add drag-and-drop reorder.
- Add cross-parent moves.
- Add optional alt text support for welcome image.

3. Hardening and tests

- Reorder invariants:
  - no loss/duplication
  - stable IDs
  - persisted order reloads correctly
- Welcome image invariants:
  - upload/replace/remove persistence
  - graceful fallback when no image exists
  - no regression in autosave/version conflict handling

## Effort Estimate

- Reorder baseline (existing controls): Low-Medium
- Reorder advanced (drag + cross-parent): Medium-High
- Welcome image MVP: Medium (roughly half-day to one focused day)
- Combined V2.0: Medium (1-2 focused implementation sessions)

## Implementation Checklist (By File)

Use this checklist as the execution plan for V2.0. Items are grouped by dependency order.

### 1) Shared types and payload contracts

- [ ] `src/shared/types/storyboard.ts`
  - Add `welcomeImageUrl?: string` to `StoryboardCoursePayload`.
  - Optional now or V2.1: add `welcomeImageAlt?: string`.
- [ ] `src/app/utils/storyboard-builder/definitions.ts`
  - Extend `PersistedCourseMeta` and `CourseStructureJsonb.course.metadata` contract to include `welcomeImageUrl?: string`.
  - Ensure `StoryboardRenderModel.course` exposes the field for workspace rendering.
- [ ] `src/app/utils/storyboard-builder/story-board-builder.ts`
  - Include `welcomeImageUrl` when serializing payload -> persisted structure.
  - Include `welcomeImageUrl` when rehydrating persisted structure -> payload/render model.

### 2) Server actions and persistence mapping

- [ ] `src/app/actions/courses.ts`
  - Extend `PersistedCourseStructure.metadata` with `welcomeImageUrl?: string`.
  - Ensure `toPersistedStructure` writes `payload.welcomeImageUrl`.
  - Preserve existing version conflict and authorization behavior unchanged.

### 3) Data mapping at route boundaries

- [ ] `src/app/admin/storyboard/[courseId]/page.tsx`
  - Map `structure.metadata?.welcomeImageUrl` into `ApiCoursePayload`.
  - Provide safe fallback (`""` or `undefined`) when absent.
- [ ] `src/app/user/learn/[slug]/page.tsx`
  - Map `structure.metadata?.welcomeImageUrl` into `ApiCoursePayload` for learner runtime.

### 4) Admin storyboard UI flow (upload/replace/remove)

- [ ] `src/components/storyboard/workspace/Workspace.tsx`
  - Add a `Welcome Screen` settings card in the side panel.
  - Show current welcome image preview if present.
  - Add `Upload image` / `Replace image` action using `uploadToS3`.
  - Add `Remove image` action with confirmation.
  - On success, update local working course state and rely on autosave.
  - On failure, keep previous value and show inline error.

### 5) Learner welcome screen rendering

- [ ] `src/components/course-runner/definitions.ts`
  - Include `welcomeImageUrl` in `CourseRunnerCourse` type pick/shape.
- [ ] `src/components/course-runner/Course-runner.tsx`
  - Render welcome image in overview screen when present.
  - Keep text-only fallback when not present.
  - Ensure responsive layout (mobile and desktop) with no empty visual gap.

### 6) Reordering track (V2 baseline hardening)

- [ ] `src/components/storyboard/workspace/Workspace.tsx`
  - Keep and validate module/lesson/block move handlers.
  - Ensure selection state remains stable after each move.
  - Confirm autosave is not triggered excessively during rapid reorder interactions.
- [ ] `src/components/storyboard/workspace/reorder.test.ts`
  - Add/extend tests for no-loss/no-duplication and stable ID invariants.

### 7) QA and regression checklist

- [ ] Upload image on a course with no prior image; verify preview + persisted reload.
- [ ] Replace existing image; verify new URL persists and renders in learner view.
- [ ] Remove image; verify fallback to text-only welcome screen.
- [ ] Confirm existing image block upload behavior is unaffected.
- [ ] Confirm version conflict handling remains unchanged for concurrent admin edits.
- [ ] Confirm no regressions to module/lesson/block reorder persistence.

### 8) Stretch tasks (V2.1)

- [ ] Add `welcomeImageAlt` admin input and learner-side `alt` rendering.
- [ ] Add drag-and-drop reorder interactions.
- [ ] Add cross-parent moves (lesson between modules, block between lessons).
