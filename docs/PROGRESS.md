# Progress

Design session finished on 2026-10-29. Stack switched from Next.js to SvelteKit on 2026-11-05. Domain terms are in `GLOSSARY.md`, architecture decisions in `docs/adr/`.

## v1 scope

- **Image**: Compress, Resize, Convert format, Sharpen (`sharp`, Light Lane).
- **Music**: Remove vocal (`python-audio-separator`, Heavy Lane), Convert audio format (`ffmpeg`, Light Lane).

## Key decisions

- Stack: SvelteKit (Svelte 5) + TypeScript + Tailwind v4 + pnpm, single full-stack app with `adapter-node` (see `docs/adr/0004-sveltekit-single-app.md`). Python 3.12 via `uv` in `python/`.
- UI primitives: `bits-ui` (headless) for the command palette, compare slider, dropdowns, and tooltips, styled with Tailwind. Icons: `@lucide/svelte`.
- Running: `pnpm dev` while developing, `pnpm build && pnpm start` (`node build`) for daily use. Fixed port 3200.
- `adapter-node` limits request bodies to 512 KB by default (`BODY_SIZE_LIMIT`): raise it and stream uploads to disk.
- Server binds to `127.0.0.1` only. No login.
- One input file = one Job. Multiple files = a Batch. Jobs can be canceled and retried.
- Two Lanes: Heavy (1 at a time) and Light (up to 2 in parallel).
- Temporary storage: Jobs in memory, files in `.data/jobs/<jobId>/{input,output}`, wiped on restart and after 24 hours.
- Limits: Image 50 MB/file, Music 200 MB/file, Remove vocal 15 min/song. Formats are validated in the browser and again on the server.
- Remove vocal outputs Vocals and Instrumental. Quality Fast (MDX-Net) / Best (BS-RoFormer, pending spike). Format MP3 320 kbps (default) / WAV.
- Each Tool lives in `src/tools/<category>/<tool>/` with `meta.ts` (client-safe) and `run.ts` (server only). Sidebar, home, routing, validation, and dependency checks are generated from this registry.
- API-first: `POST /api/tools/<category>/<tool>`, `GET /api/jobs/<id>`, `GET /api/jobs/<id>/download`, documented in the README.
- UI: sidebar layout with search (`Ctrl/⌘+K`), home grid per Category, per-Tool settings remembered in `localStorage`, Job badges in the sidebar and tab title, before/after compare for images, audio preview for Remove vocal.
- Full English UI and docs.
- Testing: Vitest. Core logic test-first, Light Tools integration-tested on small fixtures, Heavy Tools with a fake Python script.

## Build order

- [ ] 1. Spike Remove vocal (deferred on 2026-11-06: run it before step 5): install `ffmpeg`, set up Python 3.12 with `uv`, compare MDX-Net vs BS-RoFormer on one song (time and RAM on an 8 GB M1), pick the Fast and Best models.
- [x] 2. Project setup: `npx sv create` (SvelteKit + TS + Tailwind + Vitest + ESLint + Prettier), `adapter-node`, port 3200, `git init` on `develop`, `.gitignore`, project `CLAUDE.md`.
- [x] 3. Core: Tool registry, Job + Lanes (TDD), API, `.data/jobs/` storage, 24-hour cleanup, dependency checks, `pnpm run setup`.
- [x] 4. Image Tools + integration tests.
- [ ] 5. Music Tools + Python script.
- [ ] 6. UI design with `impeccable` (Arknights-inspired black and blue, restrained), then sidebar + search, home, Tool page, compare, audio preview.
- [ ] 7. Polish: `impeccable` review, README + API docs, publish to GitHub.

## Later (v2)

Persistent Job history (`/jobs`), pipelines between Tools, favorites, presets, drop-on-home Tool suggestions, `pnpm run new:tool` scaffold, watched folders, LAN access with a PIN, and new Tools (transcribe with `whisper.cpp`, remove background with `rembg`, AI upscale, download from link with `yt-dlp`).
