import type { GenerateQuizQuestionsInput } from "@/app/utils/claude-ai/definitions";
import type { StoryboardQuiz } from "@/shared/types/storyboard";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MAX_QUESTIONS = 12;
const MIN_QUESTIONS = 1;
const MAX_COURSE_CONTENT_CHARS = 14000;

const aiQuizSchema = z
  .object({
    title: z.string().min(1).max(120),
    questions: z
      .array(
        z.object({
          prompt: z.string().min(1).max(300),
          options: z.array(z.string().min(1).max(200)).min(2).max(6),
          correctOptionIndex: z.number().int().min(0).max(5),
        }),
      )
      .min(MIN_QUESTIONS)
      .max(MAX_QUESTIONS),
  })
  .superRefine((quiz, ctx) => {
    for (const [questionIndex, question] of quiz.questions.entries()) {
      if (question.correctOptionIndex >= question.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", questionIndex, "correctOptionIndex"],
          message: "correctOptionIndex must reference a valid option.",
        });
      }
    }
  });

const submitQuizTool: Anthropic.Messages.Tool = {
  name: "submit_quiz",
  description:
    "Submit a complete quiz in strict JSON format based on the supplied course content.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "questions"],
    properties: {
      title: {
        type: "string",
        description: "Short quiz title.",
      },
      questions: {
        type: "array",
        minItems: MIN_QUESTIONS,
        maxItems: MAX_QUESTIONS,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "options", "correctOptionIndex"],
          properties: {
            prompt: {
              type: "string",
              description: "Question text for learners.",
            },
            options: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "string",
              },
            },
            correctOptionIndex: {
              type: "integer",
              minimum: 0,
              maximum: 5,
            },
          },
        },
      },
    },
  },
};

function createId(prefix: "question" | "option") {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  return `${prefix}_${randomPart}`;
}

function clampQuestionCount(numberOfQuestions: number) {
  if (!Number.isFinite(numberOfQuestions)) {
    return 5;
  }

  const rounded = Math.round(numberOfQuestions);

  return Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, rounded));
}

function truncateCourseContent(courseContent: string) {
  const trimmed = courseContent.trim();
  if (trimmed.length <= MAX_COURSE_CONTENT_CHARS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_COURSE_CONTENT_CHARS)}\n\n[TRUNCATED]`;
}

function buildPrompt(input: {
  courseTitle: string;
  numberOfQuestions: number;
  courseContent: string;
}) {
  return [
    "You are an instructional design assistant.",
    "Generate a high-quality, factual quiz using ONLY the supplied course content.",
    "",
    "Rules:",
    `- Return exactly ${input.numberOfQuestions} questions.`,
    "- Each question must have one clear correct answer.",
    "- Distractors should be plausible but clearly incorrect.",
    "- Avoid trick wording and avoid duplicate questions.",
    "- Do not invent facts that are not in the course context.",
    "- Keep language concise and student-friendly.",
    "",
    "Output requirements:",
    "- Use the submit_quiz tool exactly once.",
    "- In each question, correctOptionIndex is zero-based and must refer to a valid option.",
    "",
    `Course title: ${input.courseTitle}`,
    "Course content:",
    input.courseContent,
  ].join("\n");
}

function toStoryboardQuiz(
  aiQuiz: z.infer<typeof aiQuizSchema>,
): StoryboardQuiz {
  return {
    title: aiQuiz.title.trim(),
    questions: aiQuiz.questions.map((question) => {
      const optionIds = question.options.map(() => createId("option"));
      return {
        id: createId("question"),
        prompt: question.prompt.trim(),
        options: question.options.map((option, index) => ({
          id: optionIds[index] ?? createId("option"),
          text: option.trim(),
        })),
        correctOptionId:
          optionIds[question.correctOptionIndex] ??
          optionIds[0] ??
          createId("option"),
      };
    }),
  };
}

export async function generateQuizQuestions(
  input: GenerateQuizQuestionsInput,
): Promise<StoryboardQuiz> {
  const numberOfQuestions = clampQuestionCount(input.numberOfQuestions);
  const courseTitle = input.courseTitle.trim() || "Untitled Course";
  const courseContent = truncateCourseContent(input.courseContent);

  if (!courseContent) {
    throw new Error("Course content is required to generate quiz questions.");
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2800,
    temperature: 0.2,
    tools: [submitQuizTool],
    tool_choice: {
      type: "tool",
      name: submitQuizTool.name,
    },
    messages: [
      {
        role: "user",
        content: buildPrompt({
          courseTitle,
          numberOfQuestions,
          courseContent,
        }),
      },
    ],
  });

  const toolPayload = response.content.find(
    (block) => block.type === "tool_use" && block.name === submitQuizTool.name,
  );

  if (!toolPayload || toolPayload.type !== "tool_use") {
    throw new Error("Anthropic did not return structured quiz output.");
  }

  const parsed = aiQuizSchema.parse(toolPayload.input);
  return toStoryboardQuiz(parsed);
}
