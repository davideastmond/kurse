## ModuleSection + Mutation Sketch (Low Complexity) - 2 May 2026

### Goals

- Split module rendering into its own component.
- Start supporting data mutations (add module, add lesson, add block, edit lesson fields).
- Keep selection state and mutation flow simple.

### State Ownership

- Workspace owns authoritative state.
- ModuleSection is presentational plus event wiring.
- LessonCanvas remains a leaf UI component.

Keep these in Workspace:

- selection (MODULE | LESSON | BLOCK)
- normalizedSelection
- selectedModuleId, selectedLessonId, selectedBlockId
- lessonAttributeEdits
- workingCourse (the local mutable payload used to rebuild renderModel)
- mutation status (idle | saving | error)

Do not move state to ModuleSection yet.

### Proposed Component Boundary

- Workspace
  - maps over renderModel.modules
  - renders one ModuleSection per module
  - passes selection + callbacks + lesson edit values
  - owns mutation handlers and persistence calls
- ModuleSection
  - renders module header (title, badges, selected style)
  - renders lessons for that module
  - calls callback props for module, lesson, and block selection
  - calls callback for lesson attribute updates
  - calls callback props for add lesson and add block in this module context

### Proposed Types (Sketch)

```ts
type StoryboardSelection = {
  type: "MODULE" | "LESSON" | "BLOCK";
  moduleId: string;
  lessonId?: string;
  blockId?: string;
};

type ModuleSectionProps = {
  moduleItem: RenderModelModule;
  selectedModuleId?: string;
  selectedLessonId?: string;
  selectedBlockId?: string;
  lessonAttributeEdits: Record<string, LessonCanvasEditableValues>;
  onSelectModule: (moduleId: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  onSelectBlock: (moduleId: string, lessonId: string, blockId: string) => void;
  onLessonAttributesChange: (
    lessonId: string,
    values: LessonCanvasEditableValues,
  ) => void;
  onAddLesson: (moduleId: string) => void;
  onAddBlock: (
    moduleId: string,
    lessonId: string,
    blockType: StoryboardBlockType,
  ) => void;
};
```

Note:

- RenderModelModule is the module item type from toRenderModel().
- If needed, define explicit exported types in a dedicated definitions file for the new component.

### Event Flow (Single Source of Truth)

1. User clicks module title.
2. ModuleSection calls onSelectModule(moduleId).
3. Workspace updates selection.
4. Workspace re-derives selected ids and passes them back down.

5. User clicks lesson canvas.
6. ModuleSection calls onSelectLesson(moduleId, lessonId).
7. Workspace updates selection.

8. User clicks block.
9. ModuleSection calls onSelectBlock(moduleId, lessonId, blockId).
10. Workspace updates selection.

11. User edits lesson attributes.
12. ModuleSection calls onLessonAttributesChange(lessonId, values).
13. Workspace merges into lessonAttributeEdits[lessonId].

### Mutation Flow (Simple Command Style)

1. UI emits a narrow command intent from Workspace handlers:
   - addModule
   - addLesson(moduleId)
   - addBlock(moduleId, lessonId, blockType)
   - updateLessonFields(lessonId, patch)

2. Workspace applies command optimistically to workingCourse.

3. Workspace re-runs StoryboardBuilder.fromApi(workingCourse) and refreshes renderModel.

4. Workspace normalizes selection after each mutation:
   - if a created entity exists, select it
   - if a removed/missing entity is selected, fall back module -> lesson -> block rules already in place

5. Workspace persists to server action.

6. On save failure:
   - show non-blocking error state
   - keep optimistic state for now (or optionally rollback to lastSavedCourse in a second phase)

### Data Layer Recommendation

Keep this in two phases to avoid over-engineering.

Phase 1 (now):

- Keep mutation logic in Workspace as pure helper functions that transform ApiCoursePayload.
- Save through one server action that writes the whole storyboard structure payload.

Phase 2 (later):

- Move mutation helpers into StoryboardBuilder methods for stronger invariants:
  - withAddedModule(...)
  - withAddedLesson(...)
  - withAddedBlock(...)
  - withUpdatedLesson(...)

This keeps today fast while leaving a clean path to formal command methods.

### Persistence Contract (Minimal)

Use a single action first, then split later only if needed:

```ts
saveCourseStoryboard(input: {
  courseId: string;
  expectedVersion: number;
  payload: ApiCoursePayload;
}): Promise<
  | { ok: true; version: number; payload: ApiCoursePayload }
  | { ok: false; code: "VERSION_CONFLICT" | "VALIDATION" | "UNKNOWN"; message: string }
>
```

Notes:

- expectedVersion lets you detect concurrent edits.
- On success, update local version.
- On version conflict, surface a clear refresh/retry path.

### ID + Defaults Strategy

Keep this deterministic and tiny:

- New module id: module\_<timestamp_or_uuid>
- New lesson id: lesson\_<timestamp_or_uuid>
- New block id: block\_<timestamp_or_uuid>

Default records:

- New module: title "New Module", empty lessons
- New lesson: title "New Lesson", duration "10 min", objective "", empty blocks
- New block: type from button, title from type label, detail placeholder, duration "5 min"

Immediately select the created entity so the user stays oriented.

### Why This Stays Simple

- No duplicated selection state.
- No context/reducer required yet.
- No cross-module coordination logic in children.
- ModuleSection can be tested mostly as a pure render + callback bridge.
- Mutation intent is centralized in Workspace handlers.
- One save action avoids fragmented persistence logic.

### Nice-to-Have Follow Up (Optional)

- Keep Workspace callbacks stable with useCallback only if prop churn becomes measurable.
- If prop drilling grows later, consider a tiny local context scoped to storyboard workspace only.
- Add debounce for lesson field autosave to reduce write frequency.
- Add lastSavedCourse snapshot for rollback-on-error behavior.

### Still Out Of Scope

- Drag/drop ordering changes.
- Batch edits and transactions.
- Undo/redo history.
