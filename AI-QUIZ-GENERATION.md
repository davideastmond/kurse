## Using Redis for Rate Limiting

**Feasibility:**

Redis is a strong choice for implementing server-side rate limiting in both production and development:

- **Production:**
  - Redis is fast, reliable, and widely used for distributed rate limiting.
  - Integrates well with Node.js/Next.js via libraries like `ioredis` or `redis`.
  - Supports atomic operations (e.g., INCR, EXPIRE) for safe, race-free limits.
- **Development:**
  - Running Redis locally is easy with Docker or a direct install.
  - For solo/local dev, you can use a lightweight in-memory Redis instance.
  - Some devs may prefer a fallback (e.g., in-memory Map) if Redis isn’t running, but using Redis in all environments ensures consistency.

**Caveats:**
- Adds a dependency—devs must have Redis running locally.
- For CI or ephemeral environments, use a Redis container or a mock.
- If you deploy serverless, ensure Redis is accessible and connections are managed efficiently.

**Summary:**
Using Redis for rate limiting is practical and robust in both dev and prod, as long as you standardize setup and document the requirement for local development.
## Implementation Examples

### 1. Cooldown Timer (UI-side)

```tsx
const [cooldown, setCooldown] = useState(false);
const handleGenerate = async () => {
  setCooldown(true);
  await generateQuiz();
  setTimeout(() => setCooldown(false), 30000); // 30s cooldown
};
<button onClick={handleGenerate} disabled={cooldown}>
  Generate Quiz
</button>;
```

Simple, but can be bypassed by reloads or scripts.

### 2. Server-Side Rate Limiting

```ts
// Example with Next.js API route and simple in-memory store
const userTimestamps = new Map();
export default function handler(req, res) {
  const userId = req.session.user.id;
  const now = Date.now();
  const last = userTimestamps.get(userId) || 0;
  if (now - last < 30000) {
    return res
      .status(429)
      .json({ error: "Please wait before generating again." });
  }
  userTimestamps.set(userId, now);
  // ...generate quiz logic...
}
```

Use a persistent store (Redis, DB) for production. Robust and not bypassable from the client.

### 3. Optimistic UI Lockout

```tsx
const [loading, setLoading] = useState(false);
const handleGenerate = async () => {
  setLoading(true);
  try {
    await generateQuiz();
  } finally {
    setLoading(false);
  }
};
<button onClick={handleGenerate} disabled={loading}>
  Generate Quiz
</button>;
```

Prevents accidental double-clicks, but not repeated requests after completion.

# AI Quiz Generation Ideation

## Objective

Generate draft quiz questions from course material with a lightweight review flow before saving.

## Features

- Analyze course content and extract likely quiz-worthy concepts.
- Generate a small set of question types, starting with multiple choice and true/false.
- Open the result in a review screen where questions can be edited, deleted, or regenerated.
- Let the user choose how many questions to generate.
- Save the approved quiz back into the course flow for later reuse.

## Considerations

- Use structured output so generated questions land in a predictable shape.
- Keep the generation step tied to the course evaluation UI so the workflow feels incremental.
- Start with a narrow model choice and expand only if quality or cost requires it.
- Make the prompt sensitive to lesson scope so it does not pull in unrelated course material.

## Potential Pain Points

- AI may produce answers that are plausible but incorrect or too similar.
- Generated questions may be uneven in difficulty or coverage.
- Structured output can still fail if the model drifts from the schema.
- Review/edit UX needs to stay fast or the feature will feel heavier than manual authoring.

## Preventing AI Generation Spam

To avoid users spamming the AI quiz generation button, consider these approaches:

1. **Cooldown Timer (UI-side):** Disable the button for a short period (e.g., 10–30 seconds) after each generation. Simple to implement but can be bypassed by reloading or scripting.

2. **Server-Side Rate Limiting:** Enforce a per-user (or per-session) limit on generation requests (e.g., max 1 per 30 seconds, or 5 per hour). Robust against reloads and scripting, and can be tuned for fairness.
3. **Optimistic UI Lockout:** Disable the button while a generation is in progress, re-enabling only after completion or error. Prevents accidental double-clicks but not intentional spamming.

**Recommendation:**

Use server-side rate limiting as the primary guard, since it cannot be bypassed by UI tricks and is easy to tune. Optionally combine with a UI cooldown for better user feedback.
