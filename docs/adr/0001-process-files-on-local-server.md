# Process all files on a local server, not in the browser

Rhodes Hub only runs on `localhost`, so the privacy argument that makes sites like imagestool.com process files in the browser does not apply. Every Tool follows one pattern: the file is sent to the local SvelteKit (Node) server, processed with native tools (`sharp`, `ffmpeg`, and Python for AI vocal separation models), and the result is sent back. Native tools are faster and produce better results than their WASM/ONNX browser counterparts, especially for vocal removal on an M1 Mac with 8 GB of RAM.

## Considered Options

- **Everything in the browser** (Canvas, WASM, ffmpeg.wasm, ONNX): rejected because AI audio tools are slow and lower quality in the browser.
- **Hybrid** (images in the browser, heavy tools on the server): rejected because it means maintaining two processing patterns.

## Consequences

- The machine needs `ffmpeg` and a modern Python (via Homebrew/`uv`). The macOS system Python (3.9) is not used.
- Rhodes Hub cannot be deployed as a static site.
