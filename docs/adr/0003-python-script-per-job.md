# Spawn a Python script per Job instead of a long-running service

AI Tools such as Remove vocal are run by the Node worker as a Python child process, one process per Job, and progress is read from the process output. The model is reloaded for every Job (a few seconds). That cost is small next to a 1–5 minute run, and the RAM is freed as soon as the Job ends. A long-running Python service (FastAPI) was rejected because it would hold 1–2 GB of RAM on an 8 GB machine and add a second server to start. The Python environment is managed by `uv` in the `python/` folder (Python 3.12), separate from the macOS system Python.

Vocal separation uses `python-audio-separator`, not Demucs directly. The official Demucs repository is archived, while `audio-separator` is actively maintained, supports MPS/CoreML acceleration on Apple Silicon, and offers cleaner models (BS-RoFormer) in addition to Demucs.
