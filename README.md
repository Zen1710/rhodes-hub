# Rhodes Hub

Local file tools that run on your own machine: compress and convert images, split songs into vocals and instrumental, and more. Files are processed by native tools (`sharp`, `ffmpeg`, Python AI models) on a local server and never leave your computer.

## Tools

| Category | Tool                   | What it does                               | Reads                      | Limit                 |
| -------- | ---------------------- | ------------------------------------------ | -------------------------- | --------------------- |
| Image    | `image/compress`       | Shrink file size, keep the look.           | JPG, PNG, WebP, HEIC       | 50 MB                 |
| Image    | `image/resize`         | Scale to exact pixels or a percentage.     | JPG, PNG, WebP, HEIC       | 50 MB                 |
| Image    | `image/convert-format` | Turn one image format into another.        | JPG, PNG, WebP, AVIF, HEIC | 50 MB                 |
| Image    | `image/sharpen`        | Recover detail in soft photos.             | JPG, PNG, WebP, HEIC       | 50 MB                 |
| Music    | `music/remove-vocal`   | Split a song into Vocals and Instrumental. | MP3, WAV, FLAC, M4A        | 200 MB and 15 minutes |
| Music    | `music/convert-audio`  | Change format and bitrate.                 | MP3, WAV, FLAC, M4A, OGG   | 200 MB                |

Every file becomes a Job. Jobs run in a Lane: Remove vocal uses the Heavy Lane (one Job at a time), everything else uses the Light Lane (up to two at a time). Remove vocal uses the MDX-Net model `UVR-MDX-NET-Inst_HQ_3` on the CPU; a 3.5-minute song takes about a minute on an 8 GB M1.

## Requirements

- Node.js 22 or newer and pnpm
- `ffmpeg` and `ffprobe` (`brew install ffmpeg`) for the Music tools
- `uv` (`brew install uv`) for Remove vocal; it installs Python 3.12 for you

## Setup

```sh
pnpm install
pnpm run setup
```

`pnpm run setup` checks `ffmpeg`, creates the Python environment in `python/` with `uv`, and downloads the vocal model (about 70 MB, once) to `python/models/`. It never installs system software itself; when something is missing it prints the command to run. It is safe to run again.

A Tool whose dependencies are missing shows as Not ready in the UI with the command that fixes it; the other Tools keep working. Restart the server after fixing it.

## Run

```sh
pnpm dev                  # development, http://127.0.0.1:3200
pnpm build && pnpm start  # daily use, http://127.0.0.1:3200
```

The server only listens on `127.0.0.1`. It runs `ffmpeg` and Python without authentication, so do not expose it to a network.

## Develop

```sh
pnpm test    # Vitest: Lanes, Jobs, API, and each Tool on small files in tests/fixtures/
pnpm lint    # Prettier and ESLint
pnpm check   # svelte-check
```

Each Tool lives in `src/tools/<category>/<tool>/`: `meta.ts` describes it (name, formats, limits, settings) and `run.ts` does the work. The sidebar, search, routes, validation, and the API are generated from these files. Domain words (Tool, Job, Batch, Lane) are defined in `GLOSSARY.md`; decisions are in `docs/adr/`.

## API

The UI is one client of a small HTTP API; anything that can send HTTP can use it. Every `POST` must send a non-form `Content-Type` (for example `application/octet-stream`); SvelteKit rejects form-style posts to protect the local server from other websites.

### Start a Job

`POST /api/tools/<category>/<tool>?filename=<name>&<setting>=<value>…`

The request body is the file itself, streamed to disk. One request starts one Job; send several requests for a Batch. Settings you leave out use the Tool's defaults.

```sh
curl -H 'Content-Type: application/octet-stream' --data-binary @photo.jpg \
  "http://127.0.0.1:3200/api/tools/image/compress?filename=photo.jpg&quality=70"
```

Returns `202` with the Job:

```json
{
	"id": "3a7274a1-…",
	"toolId": "image/compress",
	"filename": "photo.jpg",
	"status": "running",
	"progress": 0
}
```

Errors return `{ "error": "<message>", "details": { … } }` with status `400` (missing filename or invalid settings, with `details` per setting), `404` (unknown Tool), `422` (file rejected, for example `"72 MB is over the 50 MB limit."`), or `503` (Tool not ready).

### Settings per Tool

Defaults are in bold.

| Tool                   | Setting      | Values                                                        |
| ---------------------- | ------------ | ------------------------------------------------------------- |
| `image/compress`       | `quality`    | 1 to 100, **80**                                              |
|                        | `output`     | **`same`**, `jpg`, `webp`, `png`                              |
|                        | `metadata`   | **`strip`**, `keep`                                           |
| `image/resize`         | `mode`       | **`pixels`**, `percent`                                       |
|                        | `width`      | 0 to 20000 px, **1280**; 0 keeps the ratio from the height    |
|                        | `height`     | 0 to 20000 px, **0**; 0 keeps the ratio from the width        |
|                        | `percent`    | 1 to 400, **50**; used when `mode=percent`                    |
| `image/convert-format` | `to`         | **`webp`**, `jpg`, `png`, `avif`                              |
|                        | `quality`    | 1 to 100, **85**                                              |
|                        | `metadata`   | **`keep`**, `strip`                                           |
| `image/sharpen`        | `strength`   | `low`, **`medium`**, `high`                                   |
|                        | `radius`     | 0.3 to 5 px in steps of 0.1, **1**                            |
|                        | `output`     | **`same`**, `jpg`, `webp`, `png`                              |
| `music/remove-vocal`   | `format`     | **`mp3`** (320 kbps), `wav`                                   |
| `music/convert-audio`  | `format`     | **`mp3`**, `m4a`, `ogg`, `flac`, `wav`                        |
|                        | `bitrate`    | `128`, `192`, `256`, **`320`** kbps; ignored for FLAC and WAV |
|                        | `sampleRate` | **`same`**, `44100`, `48000`; OGG is always 48 kHz            |

### Check a Job

`GET /api/jobs/<id>` returns the Job. `status` is `queued`, `running`, `done`, `failed`, or `canceled`; `progress` goes from 0 to 1; a `done` Job lists its `files` with `name` and `size`, and a `failed` Job carries `error`. A `done` Job may also carry a `note` about its result: Compress says `"Already optimized"` when re-encoding would have made the file bigger, so it hands back the original.

### Download results

- `GET /api/jobs/<id>/download`: the output file, or a zip when the Job made several (Remove vocal makes Vocals and Instrumental).
- `GET /api/jobs/<id>/download?file=<name>`: one output file.
- `GET /api/jobs/download?ids=<id1>,<id2>`: one zip with the results of every finished Job in the list.

Downloading a Job that is not `done` returns `409`.

### Cancel or retry

- `POST /api/jobs/<id>/cancel`: stops a queued or running Job and deletes its half-written output.
- `POST /api/jobs/<id>/retry`: starts a failed Job again as a new Job with the same file and settings.

```sh
curl -X POST -H 'Content-Type: application/json' http://127.0.0.1:3200/api/jobs/<id>/cancel
```

Results are deleted 24 hours after a Job finishes and whenever the server restarts.

## License

[MIT](LICENSE)
