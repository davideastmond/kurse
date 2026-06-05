This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Utilities

Use these commands to manage and validate course data setup:

```bash
npm run seed-courses
```

Seeds or updates the default admin and sample courses.

```bash
npm run verify-course-trigger
```

Verifies the insert trigger sets `courses.structure.courseId` to the database-generated `courses.id`.

## Environment Variables

Required for local development:

- `DATABASE_URL`: Postgres connection string used by Drizzle.
- `NEXT_AUTH_SECRET`: secret used by NextAuth session and token signing.

Required when using AI quiz generation:

- `ANTHROPIC_API_KEY`: API key for Claude quiz generation.

Optional but recommended for production workflows:

- `REDIS_URL`: enables Redis-backed quiz generation rate limits and background queue support.

## Organization + Webhook Features

Organization and integrations features (Phases 1-4) rely on existing Drizzle migrations in `drizzle/`.

1. Apply database migrations before running features that use org membership, seat ledger, or webhooks.
2. Sign in as an admin user to access organization admin routes.
3. Organization integrations are available at `/admin/org/[orgSlug]/integrations`.
4. Endpoint secrets are shown once at create/rotate time; store them securely.

Webhook behavior:

- Delivery model is at-least-once.
- Failed attempts persist and schedule retries using exponential backoff.
- Admin UI supports replaying failed and dead-letter deliveries.

## AI Quiz Generation Rate Limits

AI quiz generation is rate-limited server-side:

- Cooldown: 20 seconds between requests.
- Hourly cap: 30 requests per user across all courses (hourly limit is global per user, not per course).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
