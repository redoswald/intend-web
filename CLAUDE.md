# Todopus

Todoist-like task manager with AI planning (Maestro). Built with React 18, TypeScript (strict), Tailwind CSS, Supabase (Postgres + Auth + RLS), Vite, and TanStack React Query. Deployed on Vercel.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — lint check
- `vercel --prod` — deploy directly from local without pushing

## Project Structure

- `src/components/` — React components
- `src/hooks/` — custom hooks (TanStack Query wrappers)
- `src/lib/` — utilities, Supabase client, helpers
- `src/contexts/` — React context providers
- `supabase/migrations/` — SQL migrations
- `docs/` — project documentation

## Conventions

- `@/` path alias maps to `src/`
- Custom hooks wrap TanStack React Query for all data fetching
- RLS enabled on all public tables
- Tailwind accent palette: orange
- No test framework yet

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Shared Supabase Database

The database is shared with the "Friends" app. PascalCase tables (`Contact`, `Event`, etc.) belong to Friends — do not modify them.

## Deployment

Vercel auto-deploys on push to `main`. Use `vercel --prod` for direct local deploys.
