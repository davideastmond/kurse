<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

- Do not export type definitions from React component files. Local types used only in the component are fine to be included in the component file however. Instead, create a separate `definitions.ts` file for each component and export all types from there.
  This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
- When writing tests, use vitest assertions and testing-library for rendering and interacting with components. Do not use jest or enzyme.
<!-- END:nextjs-agent-rules -->
