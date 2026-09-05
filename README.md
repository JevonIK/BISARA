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

### Milestone 3 — Camera practice foundation

- real browser camera permission flow
- clear idle, loading, ready, denied, unavailable, and error states
- live MediaPipe Hand Landmarker inference for up to two hands
- 21-point landmark overlay for each detected hand
- camera, lighting, and hand-visibility calibration checks
- local video-frame processing with explicit privacy messaging
- honest separation between landmark detection and BISINDO correctness scoring

### Milestone 4 — Chapter test and conversation flow

- five-question sign-to-text comprehension test using real WL-BISINDO samples
- answer review shown only after the complete test
- deterministic 0–100 score and zero-to-three-star rating
- 50-point chapter-unlock threshold
- repeatable attempts with the best score retained during the active session
- three-turn branching conversation simulation
- explicit pending state for camera-response scoring
- dataset attribution stored beside every included media sample

### Milestone 5 — Progress, badges, streaks, and review

- browser-local progress store shared across the application
- persistent XP, streak, best score, test attempts, and conversation completions
- responsive progress dashboard with a weekly activity chart
- Recognize, Imitate, and Communicate mastery indicators
- unlocked and locked badge collection
- five-item daily review quest with live XP updates
- test and conversation results connected to the progress dashboard

### Milestone 6 — Accounts and server progress

- FastAPI backend with PostgreSQL and versioned Alembic migrations
- registration, login, session recovery, and logout at `/account`
- Argon2 password hashing and revocable HttpOnly cookie sessions
- session-bound CSRF validation and explicit origin checks
- account-specific browser cache and automatic progress synchronization
- stale-write protection with an explicit conflict-resolution flow
- optional guest import into a new account
- isolated API tests and frontend sync regression tests

New accounts start at zero. Guest mode preserves the prototype's seed values.
Account data is stored in PostgreSQL and can be restored after login in another
browser connected to the same server. BISINDO classification and validated
corrective feedback remain planned work.

## Tech stack

- TypeScript
- React 19
- Vinext with a Next.js-compatible application structure
- Tailwind CSS 4
- shadcn/ui
- Lucide icons
- MediaPipe Tasks Vision
- FastAPI, SQLAlchemy, Alembic, PostgreSQL

## Getting started

### Prerequisites

Install the following tools before running BISARA:

| Tool | Minimum version | Install guide |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 22.13 | https://nodejs.org/en/download |
| [pnpm](https://pnpm.io/) | 9 | `npm install -g pnpm` or https://pnpm.io/installation |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | — | Required only for accounts and backend API |
| [Python 3](https://www.python.org/) | 3.10 | Required only for backend setup script |

### Quick start (frontend only)

This is the fastest way to run BISARA. Guest learning, camera practice,
tests, and the progress dashboard all work without the backend.

```bash
# 1. Clone the repository
git clone https://github.com/JevonIK/BISARA.git
cd BISARA

# 2. Install dependencies
pnpm install

# 3. Start the development server
pnpm dev
```

Open **http://localhost:3000** in your browser. The app will hot-reload when
you edit source files.

### Full stack (frontend + backend API + database)

To enable user accounts, server-synced progress, and the registration/login
flow, you also need Docker Desktop running.

```bash
# 1. Clone the repository (skip if already done)
git clone https://github.com/JevonIK/BISARA.git
cd BISARA

# 2. Install frontend dependencies
pnpm install

# 3. Generate the backend secret key (only needed once)
python3 backend/scripts/setup_local.py

# 4. Start PostgreSQL and the FastAPI backend
docker compose up -d --build

# 5. Start the frontend development server
pnpm dev
```

Open **http://localhost:3000** in your browser. The account page is at
**http://localhost:3000/account**. The API documentation is at
**http://localhost:8000/docs**.

> **Note:** Use `localhost` instead of `127.0.0.1` for the frontend because
> cookie origins are explicit. The frontend always runs on port 3000.

### Stopping and restarting

```bash
# Stop the backend containers (keeps database data)
docker compose stop

# Restart the backend later
docker compose up -d

# Remove containers and database volume entirely
docker compose down -v
```

### Production build

```bash
pnpm build
```

### Running tests

```bash
# Frontend sync tests
pnpm test:sync

# Lint
pnpm lint

# Backend API tests (from backend/ with venv activated)
cd backend
source .venv/bin/activate
python -m pytest tests -q
```

### Troubleshooting

| Problem | Solution |
| --- | --- |
| `pnpm dev` fails with engine error | Upgrade Node.js to 22.13 or newer |
| Port 3000 already in use | Stop the other process using port 3000; BISARA will not choose another port |
| Camera not working | Allow camera permission in your browser; HTTPS is not required on localhost |
| Backend API unreachable | Make sure Docker Desktop is running and run `docker compose up -d --build` |
| `setup_local.py` error | Ensure Python 3.10+ is installed |

See [backend/README.md](backend/README.md) for detailed API setup, migrations,
and deployment requirements.

## Routes

- `/` — learning dashboard
- `/missions` — complete learning journey
- `/missions/berkenalan` — active mission detail
- `/missions/berkenalan/practice` — camera and hand-landmark practice
- `/missions/berkenalan/test` — chapter test and branching conversation
- `/progress` — activity, mastery, scores, and badge dashboard
- `/review` — daily sign-review quest
- `/account` — registration, login, logout, and sync management

## Product principles

1. Teach communication scenarios, not isolated memorization.
2. Keep regional BISINDO scope explicit.
3. Involve Deaf language experts in content validation and release decisions.
4. Process camera input locally by default whenever the device supports it.
5. Present model uncertainty honestly and never replace qualified interpreters.

## Camera privacy note

Camera frames are processed in the browser and are not uploaded or stored by
BISARA. The MediaPipe runtime and hand model are downloaded when the camera is
first activated. MediaPipe may send performance and usage metrics as described
in its vendor privacy notice, but camera input remains on the device.

## Third-party attribution

Hand landmark detection uses
[`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)
by Google under the Apache License 2.0. Implementation guidance follows the
[official MediaPipe Hand Landmarker documentation](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js).

Selected BISINDO demonstration videos come from
[WL-BISINDO](https://www.kaggle.com/datasets/glennleonali/wl-bisindo) by Grace
Oktaviani Kindy, Glenn Leonali, and Henry Lucky under CC BY-NC 4.0. The included
files and their labels are documented in
[`public/media/wl-bisindo/README.md`](public/media/wl-bisindo/README.md).
