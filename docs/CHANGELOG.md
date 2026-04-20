# Changelog

All notable changes to Intend will be documented in this file.

## [Unreleased]

### Changed
- Renamed product from "Opus"/"Todopus" to "Intend" as part of the Done Intentionally suite. Package name `todopus` → `intend-web`. UI copy, metadata, cross-app link, localStorage keys (with one-time migration), drag-and-drop MIME types, and shared design system doc updated. Claude Opus model references preserved.
- Deleted obsolete "Maestro fits the musical theme of Opus" naming rationale from Maestro-AI-spec.md (the musical pun no longer tracks).

### Added
- Route-based settings page (`/settings`) with Profile, Maestro AI, Security, Apps, and Data cards
- Project drag-to-reorder in sidebar with visual drop indicators
- Project color picker via right-click context menu
- Project archive/unarchive with dedicated Archive view
- ⌘K command palette with task search, project search, view navigation, and actions
- Toast notifications with undo support for task and project actions
- App switcher in sidebar (Zone 1)
- Account menu dropdown with Google avatar
- Editable display name in settings
- Sidebar drag-to-resize with localStorage persistence

### Changed
- Replaced settings modal with full settings page
- Renamed package from "opus" to "todopus"

### Infrastructure
- Created GitHub repository (github.com/redoswald/todopus)
- Connected Vercel to GitHub for automatic CI/CD deployments
- Configured environment variables for Production and Preview environments
- Added `.vercel/` to `.gitignore`

## [0.1.0] - 2026-02-14

### Added
- Initial project scaffolding (React + TypeScript + Vite + Tailwind)
- Supabase integration (auth, database)
- Landing page
- Auth flow (signup, login, sessions via Supabase Auth)
- Sidebar with project tree and smart views (Inbox, Today, Upcoming)
- Inbox view for uncategorized tasks
- Today and Upcoming views
- Completed tasks view
- Project CRUD with hierarchy
- Section CRUD within projects
- Task CRUD with subtasks
- Task editor with due dates, priority, recurrence
- Command palette
- Maestro AI assistant drawer
- Settings modal
- Initial Vercel deployment (CLI-based)
