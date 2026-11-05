# All Tools run as Jobs, across two Lanes

Removing vocals can take 1–5 minutes per song, so a plain request is prone to timeouts, has no progress, and dies when the tab closes. That is why every Tool, including near-instant ones like Compress image, runs as a Job: the server replies immediately with a Job ID, the browser polls its status, then downloads the result. One pattern for every Tool is cheaper to maintain than separate paths for fast and slow Tools.

Jobs run in two Lanes that work in parallel. Each Tool declares its own Lane:

- **Heavy**: AI/Python Tools such as Remove vocal, one Job at a time, because 8 GB of RAM cannot hold two vocal separation models at once.
- **Light**: `sharp`/`ffmpeg` Tools, up to 2 Jobs in parallel.

## Considered Options

- **A single queue for every Tool**: rejected, because a 1-second photo compression could wait 20 minutes behind a Batch of vocal removals.
