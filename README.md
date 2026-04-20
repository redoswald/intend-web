# Intend

A Todoist-like task manager with first-class support for AI-assisted planning. Tasks have rich context (not just titles), enabling an AI to meaningfully review, prioritize, and schedule them.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (Postgres + Auth + RLS) |
| Build | Vite |
| Hosting | Vercel |
| AI | Anthropic API (Claude) |

## Getting Started

```bash
# Install dependencies
npm install

# Create a .env file with your Supabase credentials
cp .env.example .env

# Start the dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

## Project Structure

```
intend-web/
├── src/
│   ├── components/
│   │   ├── auth/          # Login, Signup, AuthGuard
│   │   ├── layout/        # AppShell, Sidebar, MainPanel, CommandPalette
│   │   ├── maestro/       # AI assistant drawer and settings
│   │   ├── projects/      # ProjectView, ProjectHeader, NewProjectPage
│   │   ├── tasks/         # TaskItem, TaskList, TaskEditor
│   │   └── views/         # Inbox, Today, Upcoming, Completed
│   ├── contexts/          # AuthContext
│   ├── hooks/             # useTasks, useProjects, useSections, etc.
│   ├── lib/               # Supabase client, query client, maestro, recurrence
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx
│   └── main.tsx
├── SPEC.md                # Full product specification
├── CHANGELOG.md
├── vercel.json
└── package.json
```

## Deployment

The app auto-deploys to Vercel on every push to `main`. PR branches get preview deployments automatically.

Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are configured in the Vercel dashboard for Production and Preview environments.

## Documentation

- [SPEC.md](./SPEC.md) — Full product specification (architecture, data model, API patterns, roadmap)
- [CHANGELOG.md](./CHANGELOG.md) — Release history
