# BISARA

BISARA is a gamified BISINDO learning platform focused on practical, real-world
communication. Learners observe signs, imitate with camera feedback, test
recognition, and perform signs from memory without an example.

## Current learning flow (September 2026)

- The active curriculum has 5 chapters and 25 missions: 20 missions for all 32
  word-level signs, followed by 5 alphabet missions covering A–Z.
- Required flow: **Amati → Tirukan → Uji pengenalan → Uji peragaan**.
  After all signs pass camera practice and recognition reaches at least 70,
  learners perform each mission sign from memory with the camera checker before
  the next mission unlocks. Checkpoints test a fixed sample of 6–8 signs from
  the chapter rather than all 32 signs in the final checkpoint.
- **Uji peragaan** shows a word and keeps the reference video hidden during
  capture. Each passing sign is saved independently, so users resume where they
  stopped. Poor detection is not counted as an incorrect gesture. A learner can
  return to Tirukan to view the example, then retry the test without an example.
- **Review** still offers self-reported recall with optional help and spaced
  repetition. These review reports cannot complete a mission.
- Review returns learned words when due, up to 5 a day. Independent recall on
  separate days grows intervals through 1/3/7/14/30 days; help or difficulty
  schedules tomorrow. First daily recall per word earns 10 XP; repeated clicks
  do not increase spacing or award the same daily XP again.
- Existing completion records are preserved. Previously finished missions stay
  unlocked; a newly passed recognition test alone no longer records mission
  completion. Legacy `mode=context` and `mode=conversation` links open recall.
- Important files: `lib/learning-progress.ts` (mission gates),
  `lib/progress-storage.ts` (completion and recall scheduling),
  `components/mission-assessment.tsx` (recognition),
  `components/production-test.tsx` (camera-based final test),
  `components/recall-practice.tsx` (self-assessed spaced review), and
  `components/review-quest.tsx` (due review queue).
- Recall history and per-mission production passes live in optional
  `signMastery[id]` fields. The API schema accepts these in the existing JSONB
  column; no database migration is required. Restart/rebuild the API before
  syncing the new production pass field.
- Chapter 5 teaches A–Z from one selected video per letter. Tirukan and Uji
  peragaan now use a local hand-landmark checker that compares finger shape,
  orientation, and, for two-hand letters, the relationship between hands.
  Either signing hand can be used. A letter must pass before the learner advances.
  All 26 reference templates are precomputed from the selected video clips;
  the checker also compares with other letters before accepting an attempt.
  Motion is not a passing criterion because the selected clips do not isolate
  a consistent motion cycle for every letter. This prototype has not been validated as a BISINDO
  classifier; camera accuracy and signing variation still need user testing.
  The existing completed mission IDs store progress without a new database table.

The milestones below describe earlier iterations; the current flow above
supersedes their scenario-completion and review requirements.

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
- live MediaPipe Pose Landmarker inference for shoulder and torso anchors
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

### Camera similarity checker

Camera practice compares a recorded attempt with the selected sign's
demonstration using hand landmarks and DTW. The 32 reference templates are
precomputed from the 32 local videos and fetched once, so passing attempts can
also be compared against every other curriculum sign without decoding 32
videos during practice. It matches stable left/right hand identities,
normalizes mirrored hand geometry, and resamples both sequences on normalized
time so sampling rate and overall speed do not determine the movement score.
Movement compares the ordered, centered wrist path instead of noisy
frame-to-frame derivatives. Handshape and orientation use the visible 2D hand
skeleton so MediaPipe depth errors caused by camera angle or torso occlusion do
not dominate the result. After camera activation, the selected reference video
also receives shoulder and torso landmarks. Hand position is then normalized
against the same body anchors in the learner recording, which distinguishes
head-level and chest-level signs without penalizing a whole-person shift in the
camera. Up to two detected people are considered, and the pose whose wrists
match the signing hands is selected so a bystander cannot become the body
anchor. The selected gesture window excludes relaxed
preparation frames but requires a sustained matching handshape. Two-hand
distances remain in shared image coordinates. A bounded extension-pattern
fallback absorbs unstable inner-finger landmarks when hands overlap, while a
changed or copied second hand still fails the detailed two-hand checks.

The practice flow pauses the demonstration on its first detected hand frame
during a monotonic three-second countdown. Recording and the demonstration then
start together, with the guide played at 0.75× speed. The capture window follows
the detected reference duration, allows extra reaction and final-hold time, and
runs for at least three seconds. Hand visibility remains a live readiness hint;
learners can start the countdown before raising their hands, while visibility
during the recorded gesture still affects detection quality. Timer cleanup
prevents an abandoned or restarted attempt from saving a late score.

Pose-dominant signs such as “Saya” are evaluated from a sustained stable hold,
so the incidental path used to bring a hand into or out of the camera frame does
not become the sign's required movement. Continuously moving instead of holding
the target pose is still penalized. Dynamic signs continue to use ordered-path
matching.

The pass threshold is 75. Handshape must reach 75, movement 70, and a two-hand
sign has additional checks for the second hand's shape and combined motion,
orientation, and coordination. Body-relative position must reach 60 whenever
owned pose anchors cover at least 80% of the gesture. A sufficiently severe mismatch caps the
total below the pass threshold even if other components are strong. Coordination
is excluded from one-hand totals, and a one-hand sign rejects a second hand that
remains active near the sign. At least six
usable frames spanning 400 ms are required, with 60% hand visibility for
one-hand signs or 35% for overlapping two-hand signs. Setup
and rest frames at the beginning/end are trimmed; gaps inside the gesture are
retained. “Detection quality” measures usable visibility;
MediaPipe's left/right classification confidence is not landmark accuracy.
Unusable references or missing vocabulary templates disable assessment instead
of grading the learner.

Vocabulary alternatives act as negative examples after the prompted sign has
passed. An alternative rejects the result only when it beats the prompted sign
by at least three points; tiny frame-to-frame score changes no longer contradict
an otherwise passing component panel.

This remains a prototype similarity checker based on one exemplar per gloss,
not a trained or validated BISINDO classifier. If stable body landmarks are not
available, position falls back to image coordinates and is removed from the
critical pass gates. Thresholds need validation with Deaf language experts and
recordings from multiple learners. Run `npm run audit:checker` for the full
32×32 exemplar comparison and altered-handshape checks; the score unit tests
live in `tests/gesture-scoring.test.ts` and
`tests/reference-templates.test.ts`.

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

| Tool                                                              | Minimum version | Install guide                                         |
| ----------------------------------------------------------------- | --------------- | ----------------------------------------------------- |
| [Node.js](https://nodejs.org/)                                    | 22.13           | https://nodejs.org/en/download                        |
| [pnpm](https://pnpm.io/)                                          | 9               | `npm install -g pnpm` or https://pnpm.io/installation |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | —               | Required only for accounts and backend API            |
| [Python 3](https://www.python.org/)                               | 3.10            | Required only for backend setup script                |

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

In the local development server, all chapters and missions are open for
debugging. This does not mark them complete or change checker scores, rewards,
or the normal progression rules in production.

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

| Problem                            | Solution                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev` fails with engine error | Upgrade Node.js to 22.13 or newer                                           |
| Port 3000 already in use           | Stop the other process using port 3000; BISARA will not choose another port |
| Camera not working                 | Allow camera permission in your browser; HTTPS is not required on localhost |
| Backend API unreachable            | Make sure Docker Desktop is running and run `docker compose up -d --build`  |
| `setup_local.py` error             | Ensure Python 3.10+ is installed                                            |

See [backend/README.md](backend/README.md) for detailed API setup, migrations,
and deployment requirements.

## Routes

- `/` — learning dashboard
- `/missions` — complete learning journey
- `/missions/berkenalan` — active mission detail
- `/missions/berkenalan/practice` — camera and hand-landmark practice
- `/missions/test?mission=berkenalan` — recognition and camera-based production test
- `/progress` — activity, mastery, scores, and badge dashboard
- `/review` — due vocabulary recall and spaced review
- `/account` — registration, login, logout, and sync management

## Product principles

1. Make each activity practice an explicit skill; isolated vocabulary practice does not establish conversational competence.
2. Keep regional BISINDO scope explicit.
3. Involve Deaf language experts in content validation and release decisions.
4. Process camera input locally by default whenever the device supports it.
5. Present model uncertainty honestly and never replace qualified interpreters.

## Camera privacy note

Camera frames are processed in the browser and are not uploaded or stored by
BISARA. The MediaPipe runtime, hand model, and pose model are downloaded when the camera is
first activated. MediaPipe may send performance and usage metrics as described
in its vendor privacy notice, but camera input remains on the device.

## Third-party attribution

The 26 Chapter 5 alphabet clips are selected and web-encoded from the
_Indonesian Sign Language Dataset: Alphabet Video_ by Indah Siradjuddin,
DOI [10.17632/p7j5jrsbbb.1](https://doi.org/10.17632/p7j5jrsbbb.1),
licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Selection and conversion details are in [the alphabet dataset notes](docs/alphabet-dataset.md).
The dataset's creator does not endorse BISARA.

Hand and body landmark detection use
[`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)
by Google under the Apache License 2.0. Implementation guidance follows the
[official MediaPipe Hand Landmarker documentation](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
and
[Pose Landmarker documentation](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker/web_js).

Selected BISINDO demonstration videos come from
[WL-BISINDO](https://www.kaggle.com/datasets/glennleonali/wl-bisindo) by Grace
Oktaviani Kindy, Glenn Leonali, and Henry Lucky under CC BY-NC 4.0. The included
files and their labels are documented in
[`public/media/wl-bisindo/README.md`](public/media/wl-bisindo/README.md).
