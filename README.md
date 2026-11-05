# Rhodes Hub

Local file tools that run on your own machine: compress and convert images, split songs into vocals and instrumental, and more. Files are processed by native tools (`sharp`, `ffmpeg`, Python AI models) on a local server and never leave your computer.

> Work in progress. See `docs/PROGRESS.md` for the build plan.

## Requirements

- Node.js 22 or newer and pnpm
- `ffmpeg` (`brew install ffmpeg`) for the Music tools
- Python 3.12 via `uv` for Remove vocal

## Run

```sh
pnpm install
pnpm dev                  # development, http://127.0.0.1:3200
pnpm build && pnpm start  # daily use, http://127.0.0.1:3200
```

The server only listens on `127.0.0.1`.
