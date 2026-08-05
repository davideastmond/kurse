# Specs for Course Runner

## Overview

This is end-user (student) facing,
and is the main interface for students to interact with the course content. It will be responsible for rendering the course content,
tracking student progress, and running any evaluations or assessments.

## Page route

This all takes place at `/user/learn/[slug]`

## Features

### The Table of contents (sidebar)

- A persistent sidebar that is always visible while the student is inside the course runner (not just on launch).
- Lists all modules and their lessons in order. Completed lessons are visually marked (e.g. checkmark). The current lesson is highlighted.
- Module evaluations appear as a distinct entry in the TOC after the last lesson of their module, and are only clickable once the module's lessons are completed.
- The course evaluation appears as a distinct entry after all modules, and is only clickable once all module content (and any module evaluations) are completed.
- On first launch, the main content area shows a course overview / welcome screen with a **Begin** button that takes the student to the first lesson.
- If the course is partially completed the button should say **Continue** and navigate to the last lesson they were on.
- If the course is fully completed (all lessons + evaluations passed) the button should say **Review** and take the student to the first lesson.
- If all course content is completed but the course evaluation has not been passed, the course evaluation entry in the TOC is clickable and a prompt surfaces to prompt the student to attempt or retake it.

### The Course Content Screen

- Renders the course content for a single lesson. Content blocks (text, images, videos, audio, inline quizzes) are displayed in order.
- **Block-level gating:** certain block types act as gates. An `inline_quiz` block must be answered correctly before the **Next** button unlocks. Other block types (video, audio) may be marked as required in a future version; in v1 they are not gated.
- Include **Next** / **Previous** navigation buttons to move through lessons sequentially within a module.
- Include a progress bar or indicator scoped to the current module (lessons completed / total lessons in module).
- A lesson is marked complete in `lesson_progress` once the student advances past it (i.e. all gated blocks resolved and **Next** pressed).
- Students cannot skip ahead past ungated lessons using the TOC sidebar; future lessons are non-clickable until unlocked.

### Module Evaluation Screen

- Surfaces after the last lesson of a module if that module has an evaluation defined.
- Renders one question per screen with **Next** / **Previous** navigation; a question must be answered before proceeding to the next.
- Progress indicator shows current question out of total.
- On submission, the score is calculated, an `evaluation_attempts` record is written, and a `grades` record is created.
- **Gated:** the student must pass the module evaluation (score ≥ `passingScore`) before the next module unlocks.
- **Retakes:** unlimited in v1. If the student fails they are shown their score and an option to retake immediately.
  - _v2 note: a configurable retake limit per evaluation may be introduced._
- Feedback is shown per question after submission (correct/incorrect + correct answer).

### The Course Evaluation Screen

- Unlocked only after all modules and their evaluations are completed.
- Same single-question-per-screen UX as module evaluations.
- On submission, score is calculated, `evaluation_attempts` and `grades` records are written, and `enrollments.completedAt` is stamped if the student passes.
- **Retakes:** unlimited in v1 (same policy as module evaluations).
- Tabulates and displays the student's score and a per-question breakdown after submission.

### Course Completed Screen

- Shown when the student passes the course evaluation (or when all content is done if no course evaluation exists).
- Displays overall score, pass/fail status, and a summary of module scores.
- _v2 placeholder: printable Certificate of Completion (not in scope for v1)._
- Provides a button to return to the student dashboard.

## Admin Preview Mode (v1)

Purpose: let admins quickly test layout, flow, and content rendering in the Course Runner without requiring enrollment or a published course state.

- Route: `/admin/preview/[slug]`
- Access: admin-only, same auth gate style as other admin pages.
- Source of truth: loads the same course structure payload used by the student runner.
- Persistence: no database writes. Lesson completion and evaluation attempts are local-only in browser state.
- UX marker: show a clear preview banner indicating progress is not saved.
- Navigation behavior: preview allows jumping through lessons and evaluations for fast QA.

### Non-goals for v1

- No analytics, grading, or enrollment side effects.
- No impact on student progress data (`lesson_progress`, `evaluation_attempts`, `grades`, `enrollments`).
- No role expansion in this phase (teachers can be considered once a teacher role exists in auth/schema).
