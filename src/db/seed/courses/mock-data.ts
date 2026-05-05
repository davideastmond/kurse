import type { StoryboardCoursePayload } from "@/shared/types/storyboard";

type SeedCourse = StoryboardCoursePayload & {
  createdAt: string;
  updatedAt: string;
};

export const mockCourses: SeedCourse[] = [
  {
    id: "f8f8d364-f8b8-4d37-a979-27e09e8fc0e1",
    title: "AI-Powered Product Management Fundamentals",
    slug: "ai-product-management-fundamentals",
    status: "PUBLISHED",
    version: 1,
    synopsis:
      "Learn a practical framework for discovering, validating, and shipping AI product features with measurable user outcomes.",
    audience: "Aspiring and early-career product managers",
    estimatedDuration: "4h 10m",
    createdAt: "2026-03-10T09:00:00.000Z",
    updatedAt: "2026-04-20T15:30:00.000Z",
    modules: [
      {
        id: "mod-pm-01",
        title: "Discovering High-Value AI Opportunities",
        progressLabel: "Module 1 of 2",
        evaluationTitle: "Opportunity Discovery Checkpoint",
        lessons: [
          {
            id: "les-pm-01",
            title: "Problem Framing for AI Features",
            duration: "18m",
            objective:
              "Frame product opportunities as testable hypotheses tied to user pain points.",
            blocks: [
              {
                id: "blk-pm-01-01",
                type: "video",
                title: "From Ideas to Validated Problems",
                detail:
                  "A walkthrough of jobs-to-be-done and AI suitability filters.",
                duration: "8m",
              },
              {
                id: "blk-pm-01-02",
                type: "richtext",
                title: "Opportunity Canvas",
                detail:
                  "Template to map pain, user segment, constraints, and metrics.",
                duration: "6m",
              },
              {
                id: "blk-pm-01-03",
                type: "quiz_inline",
                title: "Quick Concept Check",
                detail: "Identify which opportunities are truly AI-worthy.",
                duration: "4m",
              },
            ],
          },
          {
            id: "les-pm-02",
            title: "Defining Success Metrics",
            duration: "16m",
            objective:
              "Design north-star and guardrail metrics for AI product experiments.",
            blocks: [
              {
                id: "blk-pm-02-01",
                type: "audio",
                title: "Metrics That Matter",
                detail:
                  "Audio lesson on balancing adoption with model quality.",
                duration: "7m",
              },
              {
                id: "blk-pm-02-02",
                type: "image",
                title: "Sample KPI Tree",
                detail:
                  "Visual map connecting business goals to model behavior.",
                duration: "3m",
              },
              {
                id: "blk-pm-02-03",
                type: "richtext",
                title: "Experiment Brief",
                detail:
                  "Build a one-page brief to align design, data, and engineering.",
                duration: "6m",
              },
            ],
          },
        ],
      },
      {
        id: "mod-pm-02",
        title: "Shipping Reliable AI Experiences",
        progressLabel: "Module 2 of 2",
        evaluationTitle: "Launch Readiness Review",
        lessons: [
          {
            id: "les-pm-03",
            title: "Prompt and UX Iteration Loops",
            duration: "22m",
            objective:
              "Apply iteration loops that combine prompt tuning and UX feedback.",
            blocks: [
              {
                id: "blk-pm-03-01",
                type: "video",
                title: "Designing for Uncertainty",
                detail:
                  "Patterns for confidence cues, fallbacks, and user control.",
                duration: "10m",
              },
              {
                id: "blk-pm-03-02",
                type: "richtext",
                title: "Iteration Scorecard",
                detail:
                  "Track response quality, latency, and satisfaction by release.",
                duration: "7m",
              },
              {
                id: "blk-pm-03-03",
                type: "quiz_inline",
                title: "Scenario Drill",
                detail:
                  "Choose the best mitigation for common AI product failures.",
                duration: "5m",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "2f0607ad-60d8-4b1f-baf7-0f84c29294d6",
    title: "Modern TypeScript for Full-Stack Teams",
    slug: "modern-typescript-full-stack-teams",
    status: "DRAFT",
    version: 2,
    synopsis:
      "Master practical TypeScript patterns that improve reliability across APIs, UI layers, and database boundaries.",
    audience:
      "Frontend and backend developers transitioning to strict TypeScript",
    estimatedDuration: "3h 40m",
    createdAt: "2026-02-15T11:20:00.000Z",
    updatedAt: "2026-04-27T08:15:00.000Z",
    modules: [
      {
        id: "mod-ts-01",
        title: "Type Safety at System Boundaries",
        progressLabel: "Module 1 of 2",
        evaluationTitle: "Boundary Typing Lab",
        lessons: [
          {
            id: "les-ts-01",
            title: "Runtime Validation and Static Types",
            duration: "20m",
            objective:
              "Connect API contracts to runtime validation without duplicating logic.",
            blocks: [
              {
                id: "blk-ts-01-01",
                type: "video",
                title: "Why Static Types Are Not Enough",
                detail: "Examples of trusted data crossing unsafe boundaries.",
                duration: "9m",
              },
              {
                id: "blk-ts-01-02",
                type: "richtext",
                title: "Validation Strategy Matrix",
                detail:
                  "Pick schemas and inference patterns per boundary type.",
                duration: "6m",
              },
              {
                id: "blk-ts-01-03",
                type: "quiz_inline",
                title: "Boundary Mistakes Quiz",
                detail: "Spot unsafe assumptions in common full-stack flows.",
                duration: "5m",
              },
            ],
          },
        ],
      },
      {
        id: "mod-ts-02",
        title: "Scalable Type Design",
        progressLabel: "Module 2 of 2",
        evaluationTitle: "Type Modeling Challenge",
        lessons: [
          {
            id: "les-ts-02",
            title: "Discriminated Unions in Product Flows",
            duration: "17m",
            objective:
              "Model evolving workflow states with exhaustive handling.",
            blocks: [
              {
                id: "blk-ts-02-01",
                type: "image",
                title: "Workflow State Diagram",
                detail: "Visualizing impossible states and legal transitions.",
                duration: "4m",
              },
              {
                id: "blk-ts-02-02",
                type: "richtext",
                title: "Exhaustive Switch Patterns",
                detail:
                  "Use never checks to keep new states from slipping through.",
                duration: "8m",
              },
              {
                id: "blk-ts-02-03",
                type: "audio",
                title: "Refactoring Legacy Types",
                detail: "A guided audio walkthrough of incremental migration.",
                duration: "5m",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "f3dc3c65-0a13-451e-bb23-0dd96ea4c6af",
    title: "Storyboarding Engaging Online Courses",
    slug: "storyboarding-engaging-online-courses",
    status: "ARCHIVED",
    version: 3,
    synopsis:
      "Create learner-first course storyboards that blend narrative flow, assessment strategy, and production constraints.",
    audience: "Instructional designers and course creators",
    estimatedDuration: "2h 55m",
    createdAt: "2025-12-01T10:00:00.000Z",
    updatedAt: "2026-01-12T13:45:00.000Z",
    modules: [
      {
        id: "mod-sb-01",
        title: "Narrative Architecture",
        progressLabel: "Module 1 of 1",
        evaluationTitle: "Storyboard Critique",
        lessons: [
          {
            id: "les-sb-01",
            title: "Designing Lesson Arcs",
            duration: "19m",
            objective:
              "Build clear lesson arcs that balance context, practice, and reflection.",
            blocks: [
              {
                id: "blk-sb-01-01",
                type: "video",
                title: "Hook, Build, Apply",
                detail:
                  "A repeatable narrative pattern for digital learning sessions.",
                duration: "8m",
              },
              {
                id: "blk-sb-01-02",
                type: "richtext",
                title: "Storyboard Blueprint",
                detail:
                  "Scaffold outcomes, beats, and transitions before production.",
                duration: "6m",
              },
              {
                id: "blk-sb-01-03",
                type: "quiz_inline",
                title: "Arc Diagnostics",
                detail: "Evaluate and improve a sample lesson arc.",
                duration: "5m",
              },
            ],
          },
          {
            id: "les-sb-02",
            title: "Media Mix and Pacing",
            duration: "14m",
            objective:
              "Choose media types that support comprehension and cognitive load.",
            blocks: [
              {
                id: "blk-sb-02-01",
                type: "image",
                title: "Pacing Heatmap",
                detail:
                  "Visual tool for balancing lecture, practice, and recap moments.",
                duration: "4m",
              },
              {
                id: "blk-sb-02-02",
                type: "audio",
                title: "Voice and Tone Guidelines",
                detail: "Audio notes on narration style and learner attention.",
                duration: "4m",
              },
              {
                id: "blk-sb-02-03",
                type: "richtext",
                title: "Production Checklist",
                detail: "Finalize assets, dependencies, and handoff criteria.",
                duration: "6m",
              },
            ],
          },
        ],
      },
    ],
  },
];
