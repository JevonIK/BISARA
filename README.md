# BISARA

BISARA is a gamified BISINDO learning platform focused on practical, real-world
communication. Learners progress from recognizing a sign, to imitating it with
camera-assisted feedback, to using it in a conversation scenario.

## Implemented milestones

### Milestone 1 — Product foundation

- BISARA visual system and application shell
- learning dashboard
- active mission card
- daily review quest
- three-chapter learning journey
- responsive layout and accessible navigation

### Milestone 2 — Mission journey

- reusable application header and curriculum data model
- complete three-chapter mission list
- mission completion, active, and locked states
- mission-detail page for “Berkenalan dengan teman baru”
- learning objectives, vocabulary scope, stages, and scenario preview
- explicit Banten regional and isolated-sign prototype boundaries

The current progress values are representative UI data. Authentication,
persistence, camera inference, and trained-model integration will be added in
later milestones.

## Tech stack

- TypeScript
- React 19
- Vinext with a Next.js-compatible application structure
- Tailwind CSS 4
- shadcn/ui
- Lucide icons

## Local development

Requirements:

- Node.js 22.13 or newer
- pnpm

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Create a production build:

```bash
pnpm build
```

## Routes

- `/` — learning dashboard
- `/missions` — complete learning journey
- `/missions/berkenalan` — active mission detail

## Product principles

1. Teach communication scenarios, not isolated memorization.
2. Keep regional BISINDO scope explicit.
3. Involve Deaf language experts in content validation and release decisions.
4. Process camera input locally by default whenever the device supports it.
5. Present model uncertainty honestly and never replace qualified interpreters.
