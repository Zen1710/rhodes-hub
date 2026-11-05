# Rhodes Hub

Local file-processing Tools (Image, Music) served by one SvelteKit app on `127.0.0.1:3200`. Files never leave the machine.

## Read first

- `docs/PROGRESS.md`: build order and current step. Update its checkboxes when a step lands.
- `GLOSSARY.md`: domain language (Tool, Category, Job, Batch, Lane). Use these words in code, UI, and docs.
- `docs/adr/`: decisions already made. Reopen one only when the user asks.
- `PRODUCT.md`: users, scope, limits, brand commitments.

## Conventions

- Everything in the repo is English: UI copy, docs, comments, commit messages (Conventional Commits).
- Each Tool lives in `src/tools/<category>/<tool>/`: `meta.ts` is client-safe (name, keywords, Lane, accepted formats, size limits, dependencies, settings with defaults), `run.ts` is server-only. Sidebar, home, routing, validation, and dependency checks are generated from this registry, never hand-listed.
- Every Tool runs as a Job in a Lane (Heavy: 1 at a time, Light: up to 2). Job status is one of `queued`, `running`, `done`, `failed`, `canceled`.
- The API is a public contract documented in the README (`POST /api/tools/<category>/<tool>`, `GET /api/jobs/<id>`, downloads, cancel, retry). Change it only with a README update in the same commit. Route handlers stay thin: logic lives in `createJobService` (`src/lib/server/jobs/service.ts`), which is where API behavior is tested.
- A Tool's `run.ts` default-exports a `ToolRunner`: it writes files to `outputDir` (each becomes an output) and must stop when `signal` aborts, checking `signal.aborted` before it starts work.
- Tests use Vitest. Core logic (Lanes, Job status, cancel/retry, validation, cleanup) is written test-first; Light Tools get integration tests on small files in `tests/fixtures/`; Heavy Tools are tested against a fake Python script.
- Work one feature per commit, and ask the user before every `git add`, commit, and push.

## Gotchas

- The Job queue lives on `globalThis` so Vite's server-module reloads in `pnpm dev` do not wipe it.
- `adapter-node` caps request bodies at 512 KB by default; `pnpm start` raises `BODY_SIZE_LIMIT`, and uploads must be streamed to disk under `.data/jobs/<jobId>/`.
- The server binds to `127.0.0.1` only. It runs `ffmpeg` and Python without auth, so never widen the host.

## UI

The design source is `design/rhodes-hub.pen` (pen.dev). Read it through the `pencil` MCP tools; the file is encrypted, so never open it with Read or Grep. Build UI to match it, then review with the `impeccable` skill. The direction contract is in `.impeccable/surfaces/design-rhodes-hub-pen.md`.
