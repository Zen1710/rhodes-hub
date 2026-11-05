# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

SvelteKit (Svelte 5) + TypeScript + Tailwind v4, one full-stack app on `adapter-node`. Headless UI primitives from `bits-ui`, icons from `@lucide/svelte`. Native processing with `sharp`, `ffmpeg`, and Python 3.12 (`uv`). See `docs/adr/0004-sveltekit-single-app.md`.

## Users

- **Primary:** the author, on his own Mac (M1, 8 GB RAM), doing quick everyday file jobs: shrinking or converting photos before uploading them somewhere, or splitting a song into vocals and instrumental.
- **Secondary:** developers who clone the public GitHub repo and run it on their own machine. They must be able to tell what is missing (for example `ffmpeg` not installed) and how to fix it from the UI alone, without reading the code.

## Product Purpose

A collection of file-processing Tools, grouped by Category (Image, Music), that runs entirely on the user's own machine. A file goes in, a processed file comes out, and nothing leaves the computer. Success means a user can drop files, adjust a few settings, and download results without thinking about the queue underneath.

## Positioning

Unlike browser-based tool sites (such as imagestool.com), every Tool runs native software on a local server: `sharp`, `ffmpeg`, and AI vocal separation models. That makes it faster and higher quality than WASM equivalents, with no upload to a third party and no remote size limits.

## Operating Context

- Opened at `http://127.0.0.1:3200` in a desktop browser, alongside other work. No login, no LAN access in v1.
- Every Tool run is a Job: one input file, one or more output files. Several files dropped at once make a Batch. Jobs wait in one of two Lanes: Heavy (AI Tools, one Job at a time, minutes per song) and Light (everything else, up to two in parallel, near-instant).
- Job statuses: queued, running, done, failed, canceled. Jobs can be canceled and retried.
- Jobs and files are temporary: wiped on server restart and after 24 hours.
- The same API the UI uses (`POST /api/tools/<category>/<tool>`, `GET /api/jobs/<id>`, `GET /api/jobs/<id>/download`) is documented for `curl` use.

## Capabilities and Constraints

- v1 Tools. **Image:** Compress, Resize, Convert format, Sharpen. **Music:** Remove vocal (outputs Vocals and Instrumental; quality Fast/Best; MP3 320 kbps or WAV), Convert audio format.
- Limits: Image 50 MB per file, Music 200 MB per file, Remove vocal 15 minutes per song. Wrong formats are rejected in the browser before upload, and the rest of the Batch continues.
- Search across Tools with `Ctrl/⌘+K`. Per-Tool settings are remembered in the browser.
- Results: before/after compare with size change for Image Tools, audio preview for Remove vocal.
- A Tool whose dependency is missing is marked "Not ready" and its page explains how to fix it. Other Tools keep working.
- Full English UI and docs.
- Planned for v2, not in v1: persistent Job history, pipelines between Tools, favorites, presets.

## Brand Commitments

- Name: Rhodes Hub.
- The author's personal palette is inspired by Arknights (black `#121416`, deep blue `#0A78B4`, bright blue `#1FB5E9`). Rhodes Hub uses its chosen "Aurora" variant: ground `#0B0D10`, fill blue `#2878B5`, accent blue `#4A9FD8`, with the drop area as a dark field lit by a soft blue glow. Restrained, without heavy decoration; the glow stays inside the drop area and never becomes neon edges.
- Typeface: Darker Grotesque.
- No official Arknights assets (art, logos, screenshots); the game is used only as a mood for color.

## Evidence on Hand

No screenshots, users, or benchmarks exist yet. Processing times for Remove vocal on an M1 8 GB machine will come from the planned spike; do not invent numbers before then.

## Product Principles

1. **Local and honest.** Never imply a file leaves the machine, and always say plainly why a Tool cannot run.
2. **One pattern everywhere.** Every Tool follows the same flow (drop, settings, Jobs, download), so learning one Tool teaches all of them.
3. **The queue is visible but quiet.** Long Heavy Jobs show real progress and stay cancelable, while instant Light Jobs feel instant.
4. **Results prove themselves.** Show what changed (size saved, before/after, audio preview) before asking the user to download.
