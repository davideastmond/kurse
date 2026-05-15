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
