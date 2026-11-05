# One SvelteKit app with adapter-node instead of Next.js

Rhodes Hub is one SvelteKit app built with `adapter-node`: the UI, the API (`+server.ts` routes), and the Job workers with their Lanes all live in a single long-running Node process. Next.js was the original choice, but it fits this app poorly: Rhodes Hub keeps its Job queue in memory and runs workers for minutes at a time, while Next.js is built around request-response rendering, and its SSR and SEO features are useless for an app that only runs on `localhost`. SvelteKit on `adapter-node` is a plain Node server with a lighter framework, shares Vite with Vitest, and adds Svelte to the author's portfolio.

## Considered Options

- **Keep Next.js**: the author's most familiar framework, rejected for the poor fit described above.
- **Svelte SPA + separate backend** (Hono/Express or Go): rejected because it means two servers and two processes to start. A Go backend would also replace `sharp` with a Go binding to libvips.

## Consequences

- In `pnpm dev`, Vite can reload server modules, so the Job queue is stored on `globalThis` to survive reloads.
- `adapter-node` limits request bodies to 512 KB by default, so `BODY_SIZE_LIMIT` must be raised and uploads streamed to disk.
