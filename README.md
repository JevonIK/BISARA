# BISARA

BISARA is a gamified BISINDO learning platform focused on practical, real-world
communication. Learners progress from recognizing a sign, to imitating it with
camera-assisted feedback, to using it in a conversation scenario.

## Current milestone

Milestone 1 establishes the product foundation:

- BISARA visual system and application shell
- learning dashboard
- active mission card
- daily review quest
- three-chapter learning journey
- responsive layout and accessible navigation

The current content is representative UI data. Authentication, persistence,
camera inference, and trained-model integration will be added in later
milestones.

## Tech stack

- TypeScript
- React 19
- Vinext (Next.js-compatible application structure)
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

## Product principles

1. Teach communication scenarios, not isolated memorization.
2. Keep regional BISINDO scope explicit.
3. Involve Deaf language experts in content validation and release decisions.
4. Process camera input locally by default whenever the device supports it.
5. Present model uncertainty honestly and never replace qualified interpreters.
