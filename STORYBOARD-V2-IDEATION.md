# Storyboard V2: Reordering Feasibility (Modules, Lessons, Blocks)

## Feasibility Summary

This is feasible with moderate effort and low data-model risk.

- The current storyboard model already preserves explicit ordering through arrays:
  - `modules[]`
  - `module.lessons[]`
  - `lesson.blocks[]`
- The internal builder layer also already models order explicitly (`moduleOrder`, `lessonOrderByModule`, `blockOrderByLesson`) before rendering and serialization.
- Saves are already whole-document and versioned (`expectedVersion` with conflict handling), so reordering fits the existing persistence flow.

Conclusion: no schema migration is required for basic reordering behavior.

## What Needs To Change

1. UI interaction for reorder

- Add drag-and-drop (or move up/down controls) in:
  - module list in workspace
  - lesson list inside each module
  - block list inside each lesson
- Optional V2.1: cross-parent moves (lesson between modules, block between lessons).

2. Workspace state mutation handlers

- Add immutable reorder handlers in `Workspace.tsx`:
  - reorder modules
  - reorder lessons within a module
  - reorder blocks within a lesson
- If cross-parent moves are included, add transfer handlers:
  - lesson: source module -> target module
  - block: source lesson -> target lesson

3. Selection stability

- Keep current selection valid after reorder/move:
  - selected entity should remain selected after index changes
  - if moved across parent, update selection path (`moduleId`, `lessonId`, `blockId`)

4. Autosave behavior

- Current autosave/optimistic flow can be reused as-is.
- Consider batching rapid drag updates so only final drop persists (reduces save churn).

## Risks / Constraints

- Concurrency: whole-payload saves can still produce version conflicts if two admins edit at once.
- UX complexity grows for cross-parent moves (drop zones, empty targets, keyboard accessibility).
- Large storyboard performance may degrade if every drag step triggers full rerender and save.

## Recommended Delivery Plan

1. V2.0 (lowest risk)

- Reorder within same parent only:
  - modules within workspace
  - lessons within module
  - blocks within lesson

2. V2.1 (advanced)

- Enable cross-parent moves:
  - lessons across modules
  - blocks across lessons

3. Hardening

- Add tests for reorder invariants:
  - no entity loss/duplication
  - stable IDs
  - correct ordering persisted and reloaded
  - selection remains valid after move

## Effort Estimate

- V2.0: Medium (roughly 1-2 focused implementation sessions)
- V2.1: Medium-High depending on DnD UX/accessibility requirements
