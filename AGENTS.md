<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

- Do not export type definitions from React component files. Local types used only in the component are fine to be included in the component file however. Instead, create a separate `definitions.ts` file for each component and export all types from there.
  This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
- When writing tests, use vitest assertions and testing-library for rendering and interacting with components. Do not use jest or enzyme.
- This code base uses TypeScript. Do not write JavaScript files. All files must be `.ts` or `.tsx`.
- Test files should be placed in the same directory as the component they are testing and should have the same name as the component with `.test.tsx` appended. For example, `MyComponent.tsx` would have a test file named `MyComponent.test.tsx`.

- Use `single_find_and_replace` instead of `edit_existing_file` when making changes to files.
<!-- END:nextjs-agent-rules -->
