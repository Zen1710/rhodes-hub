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
